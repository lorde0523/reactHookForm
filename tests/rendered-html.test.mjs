import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

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

test("keeps field metadata colocated and removes the starter preview", async () => {
  const searchForm = await readFile(
    new URL("../components/search-form/SearchForm.jsx", import.meta.url),
    "utf8",
  );

  assert.match(searchForm, /PreviewRegistryContext/);
  assert.match(searchForm, /formatFieldValue/);
  assert.match(searchForm, /field\.onChange/);
  assert.match(searchForm, /getValues\(\)/);
  assert.match(searchForm, /handleSubmit/);
  assert.match(
    searchForm,
    /\.filter\(\(fieldMeta\) => !isEmptyValue\(values\[fieldMeta\.name\]\)\)/,
  );
  assert.match(
    searchForm,
    /className="flex-group"[\s\S]*className="category-name"[\s\S]*className="category-list"[\s\S]*className="category-item"[\s\S]*<ControlledFormItem/,
  );
  assert.match(searchForm, /className="search-form-row"/);
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

test("reuses one controlled form item for RHF field wiring", async () => {
  const [searchForm, controlledFormItem] = await Promise.all([
    readFile(
      new URL("../components/search-form/SearchForm.jsx", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL(
        "../components/form/ControlledFormItem.jsx",
        import.meta.url,
      ),
      "utf8",
    ),
  ]);

  assert.match(searchForm, /import ControlledFormItem/);
  assert.match(searchForm, /<ControlledFormItem/);
  assert.match(searchForm, /formItemClassName="search-form-item"/);
  assert.doesNotMatch(searchForm, /<Controller/);
  assert.match(controlledFormItem, /useController/);
  assert.match(controlledFormItem, /children\(\{ field, fieldState \}\)/);
  assert.doesNotMatch(controlledFormItem, /useFormState|<Controller/);
  assert.match(
    controlledFormItem,
    /formItemClassName = "controlled-form-item"/,
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

  assert.match(searchForm, /function SearchCategory/);
  assert.match(
    searchForm,
    /className="category-item"[\s\S]*\{children\}/,
  );
  assert.match(
    searchForm,
    /<SearchCategory label="검색어"[\s\S]*name="keyword"[\s\S]*name="searchTarget"[\s\S]*<\/SearchCategory>/,
  );
  assert.match(
    css,
    /\.search-form-item \+ \.search-form-item::before/,
  );
  assert.match(css, /content:\s*"\/"/);
});
