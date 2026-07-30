import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import { createSearchConditionRows } from "../components/search-form/createSearchConditionRows.js";

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

test("uses one field definition for rendering and saved-condition previews", async () => {
  const searchForm = await readFile(
    new URL("../components/search-form/SearchForm.jsx", import.meta.url),
    "utf8",
  );

  assert.match(searchForm, /const searchCategories = \[/);
  assert.match(searchForm, /createSearchConditionRows\(searchCategories, getValues\(\)\)/);
  assert.match(searchForm, /searchCategories\.map/);
  assert.match(searchForm, /category\.fields\.map/);
  assert.match(searchForm, /import \{[\s\S]*createSearchConditionRows[\s\S]*isEmptyValue/);
  assert.match(searchForm, /field\.onChange/);
  assert.match(searchForm, /getValues\(\)/);
  assert.match(searchForm, /handleSubmit/);
  assert.match(searchForm, /label=\{fieldConfig\.label\}/);
  assert.match(
    searchForm,
    /className="flex-group"[\s\S]*className="category-name"[\s\S]*className="category-list"[\s\S]*className="category-item"[\s\S]*<Controller/,
  );
  assert.match(searchForm, /className="search-form-row"/);
  assert.doesNotMatch(searchForm, /PreviewRegistryContext|registryRef/);
  assert.doesNotMatch(searchForm, /useState\s*\(\s*formData/);
  assert.doesNotMatch(searchForm, /formDataRef/);

  await assert.rejects(
    access(new URL("../app/_sites-preview/SkeletonPreview.tsx", import.meta.url)),
  );
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
  assert.match(searchForm, /<SearchConditionSummary items=\{previewRows\} \/>/);
  assert.doesNotMatch(searchForm, /const previewColumns/);
  assert.doesNotMatch(searchForm, /className="preview-table"/);
  assert.match(summary, /<Descriptions/);
  assert.match(summary, /column=\{1\}/);
  assert.match(summary, /className="condition-summary"/);
  assert.doesNotMatch(summary, /<Table|columns=/);
});

test("renders Controller directly from each configured field", async () => {
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
    /<Controller[\s\S]*<Form\.Item[\s\S]*validateStatus=\{[\s\S]*fieldState\.invalid/,
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

test("groups unlabeled form items under the category label with slash-separated values", () => {
  const categories = [
    {
      key: "keyword-category",
      categoryLabel: "검색어",
      fields: [
        { name: "keyword" },
        {
          name: "searchTarget",
          options: [
            { label: "제목 + 내용", value: "TITLE_CONTENT" },
          ],
        },
      ],
    },
  ];

  assert.deepEqual(
    createSearchConditionRows(categories, {
      keyword: "장애 대응",
      searchTarget: "TITLE_CONTENT",
    }),
    [
      {
        key: "keyword-category-default-item-unlabeled",
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
  const categories = [
    {
      key: "classification-category",
      categoryLabel: "분류",
      fields: [
        {
          name: "department",
          label: "담당부서",
          options: [{ label: "플랫폼개발팀", value: "PLATFORM_DEV" }],
        },
        {
          name: "tags",
          label: "업무 태그",
          options: [{ label: "장애", value: "INCIDENT" }],
        },
      ],
    },
  ];

  assert.deepEqual(
    createSearchConditionRows(categories, {
      department: "PLATFORM_DEV",
      tags: ["INCIDENT"],
    }).map(({ label, displayValue }) => ({ label, displayValue })),
    [
      { label: "담당부서", displayValue: "플랫폼개발팀" },
      { label: "업무 태그", displayValue: "장애" },
    ],
  );
});
