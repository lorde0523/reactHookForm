import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import dayjs from "dayjs";
import { createConditionDisplayRows } from "../components/search-form/createConditionDisplayRows.js";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the practical search form", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>업무 게시물 통합 조회<\/title>/i);
  assert.match(html, /상세 조회조건/);
  assert.match(html, /조회조건 저장/);
  assert.match(html, /처리상태/);
  assert.match(html, /등록기간/);
  assert.match(html, /조회 결과/);
  assert.doesNotMatch(html, /codex-preview|Building your site/);
});

test("collects rendered field metadata through FormProvider", async () => {
  const searchForm = await readFile(
    new URL("../components/search-form/SearchForm.jsx", import.meta.url),
    "utf8",
  );

  assert.match(searchForm, /const searchCategories = \[/);
  assert.match(searchForm, /searchCategories\.map/);
  assert.match(searchForm, /category\.fields\.map/);
  assert.match(searchForm, /<FormProvider \{\.\.\.methods\}>/);
  assert.match(searchForm, /<ConditionCollectorProvider>/);
  assert.match(searchForm, /useConditionCollector\(\)/);
  assert.match(searchForm, /displayValues: collect\(\)/);
  assert.match(
    searchForm,
    /rawValues: toSerializableValues\(getValues\(\)\)/,
  );
  assert.match(searchForm, /field\.onChange/);
  assert.match(searchForm, /getValues\(\)/);
  assert.match(searchForm, /handleSubmit/);
  assert.match(searchForm, /<ConditionCategory/);
  assert.match(searchForm, /<ConditionCategoryItem/);
  assert.match(searchForm, /<ConditionFormItem/);
  assert.match(
    searchForm,
    /className="flex-group"[\s\S]*className="category-name"[\s\S]*className="category-list"[\s\S]*className="category-item"[\s\S]*<Controller/,
  );
  assert.match(searchForm, /className="search-form-row"/);
  assert.doesNotMatch(searchForm, /createSearchConditionRows/);
  assert.doesNotMatch(searchForm, /useState\s*\(\s*formData/);
  assert.doesNotMatch(searchForm, /formDataRef/);

  await assert.rejects(
    access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)),
  );
});

test("ConditionFormItem preserves Form.Item props and registers metadata", async () => {
  const [conditionFormItem, collector] = await Promise.all([
    readFile(
      new URL(
        "../components/search-form/ConditionFormItem.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL(
        "../components/search-form/ConditionCollector.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(conditionFormItem, /Children\.only\(children\)/);
  assert.match(conditionFormItem, /formItemProps\.label/);
  assert.match(conditionFormItem, /child\.props\.children/);
  assert.match(conditionFormItem, /controlType !== "single-checkbox"/);
  assert.match(conditionFormItem, /return <Form\.Item \{\.\.\.formItemProps\}>/);
  assert.match(collector, /registryRef = useRef\(new Map\(\)\)/);
  assert.match(collector, /\(fieldName\) => getValues\(fieldName\)/);
  assert.match(collector, /registryRef\.current\.delete\(registryKey\)/);
});

test("renders saved conditions as a reusable label-value summary", async () => {
  const [searchForm, summary] = await Promise.all([
    readFile(
      new URL("../components/search-form/SearchForm.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../components/search-form/SearchConditionSummary.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(searchForm, /import SearchConditionSummary/);
  assert.match(
    searchForm,
    /<SearchConditionSummary items=\{conditionSnapshot\.displayValues\} \/>/,
  );
  assert.doesNotMatch(searchForm, /const previewColumns/);
  assert.doesNotMatch(searchForm, /className="preview-table"/);
  assert.match(summary, /<Descriptions/);
  assert.match(summary, /column=\{1\}/);
  assert.match(summary, /className="condition-summary"/);
  assert.doesNotMatch(summary, /<Table|columns=/);
});

test("renders each Controller through ConditionFormItem", async () => {
  const searchForm = await readFile(
    new URL("../components/search-form/SearchForm.jsx", import.meta.url),
    "utf8",
  );

  assert.match(searchForm, /import \{[\s\S]*Controller[\s\S]*\} from "react-hook-form"/);
  assert.match(searchForm, /<Controller/);
  assert.match(searchForm, /name=\{fieldConfig\.name\}/);
  assert.match(searchForm, /rules=\{fieldConfig\.rules\}/);
  assert.match(searchForm, /fieldConfig\.render\(\{/);
  assert.match(
    searchForm,
    /<Controller[\s\S]*<ConditionFormItem[\s\S]*validateStatus=\{[\s\S]*fieldState\.invalid/,
  );
  assert.doesNotMatch(searchForm, /useController|ControlledFormItem/);

  await assert.rejects(
    access(new URL("../components/form/ControlledFormItem.jsx", import.meta.url)),
  );
});

test("keeps multiple form items in one category item with slash separators", async () => {
  const [searchForm, css] = await Promise.all([
    readFile(
      new URL("../components/search-form/SearchForm.jsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(
    searchForm,
    /className="category-item"[\s\S]*category\.fields\.map/,
  );
  assert.match(
    searchForm,
    /categoryLabel: "검색어"[\s\S]*name: "keyword"[\s\S]*name: "searchTarget"/,
  );
  assert.match(
    css,
    /\.search-form-item \+ \.search-form-item::before/,
  );
  assert.match(css, /content:\s*"\/"/);
});

test("groups rendered unlabeled form items under the category label", () => {
  const metadata = [
    {
      categoryKey: "keyword-category",
      categoryLabel: "검색어",
      itemKey: "default",
      name: "keyword",
      label: null,
    },
    {
      categoryKey: "keyword-category",
      categoryLabel: "검색어",
      itemKey: "default",
      name: "searchTarget",
      label: null,
      options: [
        { label: "제목 + 내용", value: "TITLE_CONTENT" },
      ],
    },
  ];
  const values = {
    keyword: "장애 대응",
    searchTarget: "TITLE_CONTENT",
  };

  assert.deepEqual(
    createConditionDisplayRows(metadata, (name) => values[name]),
    [
      {
        key: "keyword-category:default:unlabeled",
        names: ["keyword", "searchTarget"],
        label: "검색어",
        rawValues: {
          keyword: "장애 대응",
          searchTarget: "TITLE_CONTENT",
        },
        displayValue: "장애 대응 / 제목 + 내용",
      },
    ],
  );
});

test("uses each Form.Item label for labeled fields", () => {
  const metadata = [
    {
      categoryKey: "classification-category",
      categoryLabel: "분류",
      itemKey: "default",
      name: "department",
      label: "담당부서",
      options: [{ label: "플랫폼개발팀", value: "PLATFORM_DEV" }],
    },
    {
      categoryKey: "classification-category",
      categoryLabel: "분류",
      itemKey: "default",
      name: "tags",
      label: "업무 태그",
      options: [{ label: "장애", value: "INCIDENT" }],
    },
  ];
  const values = {
    department: "PLATFORM_DEV",
    tags: ["INCIDENT"],
  };

  assert.deepEqual(
    createConditionDisplayRows(metadata, (name) => values[name]).map(
      ({ label, displayValue }) => ({ label, displayValue }),
    ),
    [
      { label: "담당부서", displayValue: "플랫폼개발팀" },
      { label: "업무 태그", displayValue: "장애" },
    ],
  );
});

test("stores false checkbox values but omits them from display rows", () => {
  const metadata = [
    {
      categoryKey: "registration-category",
      categoryLabel: "등록기간",
      itemKey: "default",
      name: "hasAttachment",
      label: "첨부파일",
      controlType: "single-checkbox",
      checkedLabel: "첨부파일이 있는 게시물만 조회",
    },
  ];
  const values = { hasAttachment: false };

  assert.equal(values.hasAttachment, false);
  assert.deepEqual(
    createConditionDisplayRows(metadata, (name) => values[name]),
    [],
  );

  values.hasAttachment = true;
  assert.deepEqual(
    createConditionDisplayRows(metadata, (name) => values[name]).map(
      ({ label, displayValue }) => ({ label, displayValue }),
    ),
    [
      {
        label: "첨부파일",
        displayValue: "첨부파일이 있는 게시물만 조회",
      },
    ],
  );
});

test("formats DatePicker values through field metadata", () => {
  const metadata = [
    {
      categoryKey: "registration-category",
      categoryLabel: "등록일",
      itemKey: "default",
      name: "registeredDate",
      label: "등록일",
      formatValue: (value) => value.format("YYYY-MM-DD"),
    },
  ];
  const values = {
    registeredDate: dayjs("2026-07-31"),
  };

  assert.equal(
    createConditionDisplayRows(metadata, (name) => values[name])[0]
      .displayValue,
    "2026-07-31",
  );
});
