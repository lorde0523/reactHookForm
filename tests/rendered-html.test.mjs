import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";
import dayjs from "dayjs";
import { createElement, Fragment } from "react";
import {
  compileConditionChildren,
  ConditionField,
  ConditionGroup,
  extractConditionValue,
  getConditionDefaultValues,
} from "../components/search-form/conditionDsl.js";
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

const declaredFields = createElement(
  Fragment,
  null,
  createElement(
    ConditionGroup,
    { label: "검색어", groupKey: "keyword" },
    createElement(
      ConditionField,
      { name: "keyword", defaultValue: "" },
      createElement("input"),
    ),
    createElement(
      ConditionField,
      {
        name: "searchTarget",
        defaultValue: "TITLE_CONTENT",
        showWhen: (_value, values) => Boolean(values.keyword),
      },
      createElement("select", {
        options: [{ label: "제목 + 내용", value: "TITLE_CONTENT" }],
      }),
    ),
  ),
  createElement(
    ConditionGroup,
    { label: "상세", groupKey: "details" },
    createElement(
      ConditionField,
      { name: "department", label: "담당부서" },
      createElement("select", {
        options: [{ label: "플랫폼개발팀", value: "PLATFORM_DEV" }],
      }),
    ),
    createElement(
      ConditionField,
      {
        name: "hasAttachment",
        label: "첨부파일",
        defaultValue: false,
        valuePropName: "checked",
        checkedText: "첨부파일이 있는 게시물만 조회",
      },
      createElement("input", { type: "checkbox" }),
    ),
    createElement(
      ConditionField,
      {
        name: "registeredRange",
        label: "등록기간",
        defaultValue: null,
        valueType: "dateRange",
      },
      createElement("input"),
    ),
  ),
);

const testSchema = compileConditionChildren(declaredFields);

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

test("consumer declares only Group, Field, and existing Ant controls", async () => {
  const [searchForm, conditionForm] = await Promise.all([
    readFile(
      new URL("../components/search-form/SearchForm.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../components/search-form/ConditionForm.jsx", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(searchForm, /<ConditionGroup label="검색어">/);
  assert.match(searchForm, /<ConditionField/);
  assert.match(searchForm, /<Input/);
  assert.match(searchForm, /<Select/);
  assert.match(searchForm, /<Checkbox/);
  assert.match(searchForm, /<RangePicker/);
  assert.doesNotMatch(
    searchForm,
    /<Controller|FormProvider|useFormContext|useForm\(/,
  );

  assert.match(conditionForm, /<FormProvider \{\.\.\.methods\}>/);
  assert.match(conditionForm, /<Controller/);
  assert.match(conditionForm, /cloneElement\(InputComponent/);
  assert.match(conditionForm, /config\.getValueFromEvent/);
  assert.match(conditionForm, /components\.FormItem \?\? Form\.Item/);
  assert.match(conditionForm, /<RowComponent/);
  assert.match(conditionForm, /<ColComponent/);
});

test("compiles JSX declarations and derives defaults and options", () => {
  assert.equal(testSchema.length, 2);
  assert.deepEqual(getConditionDefaultValues(testSchema), {
    keyword: "",
    searchTarget: "TITLE_CONTENT",
    department: undefined,
    hasAttachment: false,
    registeredRange: null,
  });
  assert.deepEqual(testSchema[0].items[0].fields[1].options, [
    { label: "제목 + 내용", value: "TITLE_CONTENT" },
  ]);
});

test("normalizes common Ant onChange signatures without field code", () => {
  assert.equal(
    extractConditionValue([{ target: { value: "검색어" } }]),
    "검색어",
  );
  assert.equal(
    extractConditionValue([{ target: { checked: false } }], "checked"),
    false,
  );
  assert.deepEqual(extractConditionValue([["READY", "COMPLETE"]]), [
    "READY",
    "COMPLETE",
  ]);
  assert.equal(extractConditionValue([300]), 300);
});

test("hydrates server date strings with one reset-ready object", () => {
  const defaultValues = getConditionDefaultValues(testSchema);
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

test("creates raw save values and modal rows from the same snapshot", () => {
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
      { label: "검색어", displayValue: "장애 대응 / 제목 + 내용" },
      { label: "담당부서", displayValue: "플랫폼개발팀" },
      {
        label: "첨부파일",
        displayValue: "첨부파일이 있는 게시물만 조회",
      },
      { label: "등록기간", displayValue: "2026-07-01 ~ 2026-07-31" },
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

test("serializes date values without dropping false", () => {
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

test("owns load, reset, snapshot, and imperative APIs inside the engine", async () => {
  const conditionForm = await readFile(
    new URL("../components/search-form/ConditionForm.jsx", import.meta.url),
    "utf8",
  );

  assert.match(conditionForm, /loadValues/);
  assert.match(conditionForm, /reset\(\s*hydrateSearchValues\(/);
  assert.match(conditionForm, /createSearchSnapshot\(schema, getValues\(\)\)/);
  assert.match(conditionForm, /useImperativeHandle/);
  assert.match(conditionForm, /setValue/);
  assert.doesNotMatch(
    conditionForm,
    /Object\.entries\([^)]*\)\.forEach[\s\S]*setValue/,
  );
});

test("supports custom styled Form.Item components", async () => {
  const conditionForm = await readFile(
    new URL("../components/search-form/ConditionForm.jsx", import.meta.url),
    "utf8",
  );

  assert.match(conditionForm, /fieldConfig\.as \?\? DefaultFormItem/);
  assert.match(conditionForm, /components\.FormItem \?\? Form\.Item/);
});

test("removes the old registration and schema layers", async () => {
  await Promise.all([
    "ConditionFormItem.jsx",
    "ConditionCollector.jsx",
    "searchConditionSchema.jsx",
  ].map((fileName) =>
    assert.rejects(
      access(
        new URL(`../components/search-form/${fileName}`, import.meta.url),
      ),
    ),
  ));
});
