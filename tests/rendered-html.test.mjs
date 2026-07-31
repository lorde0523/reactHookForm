import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import dayjs from "dayjs";
import {
  countActiveSearchFields,
  createSearchSnapshot,
  hydrateSearchValues,
  serializeSearchValues,
} from "../components/search-form/searchConditionModel.js";

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

const testSchema = [
  {
    key: "keyword",
    categoryLabel: "검색어",
    items: [
      {
        key: "main",
        fields: [
          { name: "keyword" },
          {
            name: "searchTarget",
            options: [
              { label: "제목 + 내용", value: "TITLE_CONTENT" },
            ],
            shouldDisplay: (_value, values) => Boolean(values.keyword),
          },
        ],
      },
    ],
  },
  {
    key: "details",
    categoryLabel: "상세",
    items: [
      {
        key: "main",
        fields: [
          {
            name: "department",
            label: "담당부서",
            options: [
              { label: "플랫폼개발팀", value: "PLATFORM_DEV" },
            ],
          },
          {
            name: "hasAttachment",
            label: "첨부파일",
            shouldDisplay: (value) => value === true,
            formatValue: () => "첨부파일이 있는 게시물만 조회",
          },
          {
            name: "registeredRange",
            label: "등록기간",
            hydrate: (value) => value.map((date) => dayjs(date)),
            formatValue: (value) =>
              value.map((date) => date.format("YYYY-MM-DD")).join(" ~ "),
          },
        ],
      },
    ],
  },
];

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

test("renders standard Form.Item, Row, and Col from one schema", async () => {
  const [searchForm, schema] = await Promise.all([
    readFile(
      new URL("../components/search-form/SearchForm.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../components/search-form/searchConditionSchema.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(searchForm, /<FormProvider \{\.\.\.methods\}>/);
  assert.match(searchForm, /searchConditionSchema\.map/);
  assert.match(searchForm, /category\.items\.map/);
  assert.match(searchForm, /item\.fields\.map/);
  assert.match(searchForm, /<Row/);
  assert.match(searchForm, /<Col/);
  assert.match(searchForm, /<Form\.Item/);
  assert.match(searchForm, /<Controller/);
  assert.match(schema, /export const searchConditionSchema = \[/);
  assert.match(schema, /createDefaultSearchValues/);
  assert.doesNotMatch(searchForm, /ConditionFormItem|ConditionCollector/);

  await Promise.all([
    assert.rejects(
      access(
        new URL(
          "../components/search-form/ConditionFormItem.jsx",
          import.meta.url,
        ),
      ),
    ),
    assert.rejects(
      access(
        new URL(
          "../components/search-form/ConditionCollector.jsx",
          import.meta.url,
        ),
      ),
    ),
  ]);
});

test("hydrates server values with one reset-ready object", () => {
  const defaultValues = {
    keyword: "",
    searchTarget: "TITLE_CONTENT",
    department: undefined,
    hasAttachment: false,
    registeredRange: null,
  };
  const hydrated = hydrateSearchValues(
    testSchema,
    {
      keyword: "장애",
      department: "PLATFORM_DEV",
      hasAttachment: false,
      registeredRange: ["2026-07-01", "2026-07-31"],
    },
    defaultValues,
  );

  assert.equal(hydrated.keyword, "장애");
  assert.equal(hydrated.searchTarget, "TITLE_CONTENT");
  assert.equal(hydrated.hasAttachment, false);
  assert.equal(hydrated.registeredRange[0].format("YYYY-MM-DD"), "2026-07-01");
});

test("creates modal rows and serializable values from the same snapshot", () => {
  const values = {
    keyword: "장애 대응",
    searchTarget: "TITLE_CONTENT",
    department: "PLATFORM_DEV",
    hasAttachment: true,
    registeredRange: [dayjs("2026-07-01"), dayjs("2026-07-31")],
  };
  const snapshot = createSearchSnapshot(testSchema, values);

  assert.deepEqual(snapshot.values, {
    keyword: "장애 대응",
    searchTarget: "TITLE_CONTENT",
    department: "PLATFORM_DEV",
    hasAttachment: true,
    registeredRange: ["2026-07-01", "2026-07-31"],
  });
  assert.deepEqual(
    snapshot.displayValues.map(({ label, displayValue }) => ({
      label,
      displayValue,
    })),
    [
      {
        label: "검색어",
        displayValue: "장애 대응 / 제목 + 내용",
      },
      {
        label: "담당부서",
        displayValue: "플랫폼개발팀",
      },
      {
        label: "첨부파일",
        displayValue: "첨부파일이 있는 게시물만 조회",
      },
      {
        label: "등록기간",
        displayValue: "2026-07-01 ~ 2026-07-31",
      },
    ],
  );
});

test("stores false checkbox values while hiding them from modal rows", () => {
  const values = {
    keyword: "",
    searchTarget: "TITLE_CONTENT",
    department: undefined,
    hasAttachment: false,
    registeredRange: null,
  };
  const snapshot = createSearchSnapshot(testSchema, values);

  assert.equal(snapshot.values.hasAttachment, false);
  assert.doesNotMatch(
    JSON.stringify(snapshot.displayValues),
    /hasAttachment|첨부파일/,
  );
});

test("uses the same active-field rules as the modal", () => {
  const values = {
    keyword: "장애",
    searchTarget: "TITLE_CONTENT",
    department: "PLATFORM_DEV",
    hasAttachment: false,
    registeredRange: null,
  };

  assert.equal(countActiveSearchFields(testSchema, values), 3);
});

test("serializes dayjs values without dropping false", () => {
  const values = {
    keyword: "",
    searchTarget: "TITLE_CONTENT",
    department: undefined,
    hasAttachment: false,
    registeredRange: [dayjs("2026-07-01"), dayjs("2026-07-31")],
  };

  assert.deepEqual(serializeSearchValues(testSchema, values), {
    keyword: "",
    searchTarget: "TITLE_CONTENT",
    department: undefined,
    hasAttachment: false,
    registeredRange: ["2026-07-01", "2026-07-31"],
  });
});

test("loads server conditions with reset and snapshots values only on modal open", async () => {
  const searchForm = await readFile(
    new URL("../components/search-form/SearchForm.jsx", import.meta.url),
    "utf8",
  );

  assert.match(searchForm, /loadInitialCondition/);
  assert.match(searchForm, /reset\(\s*hydrateSearchValues\(/);
  assert.match(searchForm, /createSearchSnapshot\(searchConditionSchema, getValues\(\)\)/);
  assert.doesNotMatch(searchForm, /Object\.entries\([^)]*\)\.forEach[\s\S]*setValue/);
});

test("keeps save modal focused on display and save responsibilities", async () => {
  const modal = await readFile(
    new URL(
      "../components/search-form/SearchConditionSaveModal.jsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(modal, /SearchConditionSummary/);
  assert.match(modal, /snapshot\?\.displayValues/);
  assert.match(modal, /onSave\(conditionName\.trim\(\)\)/);
  assert.match(modal, /confirmLoading=\{saving\}/);
  assert.doesNotMatch(modal, /getValues|searchConditionSchema/);
});
