# RHF + Ant Design SearchForm

React Hook Form을 값의 유일한 저장소로 사용하고 Ant Design의 기본 `Form`,
`Form.Item`, `Row`, `Col` 구조를 유지하는 조회조건 예제입니다.

## 핵심 설계

- `searchConditionSchema.jsx`: 렌더링, 기본값, options, 표시 및 서버 복원 규칙
- `searchConditionModel.js`: 서버 값 복원, 조회 직렬화, 모달 snapshot 생성
- `SearchForm.jsx`: RHF 제어, 서버 초기값 로딩, 조회, 초기화, 저장 흐름
- `SearchConditionSaveModal.jsx`: 조회조건 이름과 표시용 snapshot 출력

렌더링 시 별도의 메타데이터 등록 effect나 DOM 탐색을 사용하지 않습니다.
동일한 스키마가 FormItem 렌더링과 값 변환에 재사용됩니다.

```jsx
{
  name: "department",
  label: "담당부서",
  options: departmentOptions,
  render: ({ field, options }) => (
    <Select
      value={field.value}
      onChange={field.onChange}
      options={options}
    />
  ),
}
```

## 렌더링 구조

```jsx
<FormProvider {...methods}>
  <Form component="form" onFinish={submitSearch}>
    <Row>
      {searchConditionSchema.map((category) => (
        <Col key={category.key} className="flex-group">
          <div className="category-name">
            {category.categoryLabel}
          </div>

          <Row className="category-list">
            {category.items.map((item) => (
              <Col key={item.key} className="category-item">
                {item.fields.map((fieldConfig) => (
                  <Controller
                    key={fieldConfig.name}
                    name={fieldConfig.name}
                    control={control}
                    render={({ field, fieldState }) => (
                      <Form.Item
                        label={fieldConfig.label}
                        validateStatus={
                          fieldState.invalid ? "error" : undefined
                        }
                      >
                        {fieldConfig.render({
                          field,
                          fieldState,
                          options: fieldConfig.options,
                        })}
                      </Form.Item>
                    )}
                  />
                ))}
              </Col>
            ))}
          </Row>
        </Col>
      ))}
    </Row>
  </Form>
</FormProvider>
```

## 서버 조회조건 로딩

`loadInitialCondition`은 저장된 서버 조회조건을 반환합니다. 폼은 여러 번의
`setValue` 대신 한 번의 `reset`으로 값을 반영합니다.

```jsx
<SearchForm
  loadInitialCondition={async ({ signal }) => {
    const response = await fetch("/api/search-condition/default", {
      signal,
    });

    return response.json();
  }}
/>
```

서버 응답의 날짜 문자열은 스키마의 `hydrate`를 통해 `dayjs`로 복원됩니다.

## 조회와 저장

```jsx
<SearchForm
  onSearch={async (values) => {
    const response = await searchNoticeList(values);
    return response.items;
  }}
  onSaveCondition={async (payload) => {
    await saveSearchCondition(payload);
  }}
/>
```

저장 payload:

```js
{
  name: "이번 달 처리 대기 건",
  values: {
    keyword: "장애",
    searchTarget: "TITLE_CONTENT",
    status: ["READY"],
    hasAttachment: false,
    registeredRange: ["2026-07-01", "2026-07-31"]
  },
  displayValues: [
    {
      names: ["keyword", "searchTarget"],
      label: "검색어",
      displayValue: "장애 / 제목 + 내용"
    },
    {
      names: ["status"],
      label: "처리상태",
      displayValue: "대기"
    },
    {
      names: ["registeredRange"],
      label: "등록기간",
      displayValue: "2026-07-01 ~ 2026-07-31"
    }
  ],
  savedAt: "2026-07-31T..."
}
```

단일 Checkbox의 `false`는 `values`에 저장되지만 모달의 `displayValues`에서는
제외됩니다. `true`이면 Checkbox 문구가 표시됩니다.

상세 전환 방법은
[조회조건 저장 로직 마이그레이션 가이드](docs/search-condition-provider-migration.md)를
참고하세요.

## 실행과 검증

```bash
npm install
npm run dev
```

```bash
npm run lint
npm test
```
