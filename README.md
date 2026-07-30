# RHF + Ant Design SearchForm

React Hook Form을 폼 데이터의 유일한 상태로 사용하는 실무형 조회조건 예제입니다.
애플리케이션 코드는 TypeScript 없이 JSX/JavaScript로 작성되어 있습니다.

## 제공 기능

- Input, Select, Multi Select, Checkbox, Radio, Date Range, InputNumber
- `Controller`를 통한 Ant Design 컴포넌트 제어
- 조회, 초기화, 유효성 검사
- 현재 조회조건의 표시 라벨을 보여주는 저장 확인 모달
- 조건 이름 입력 및 DB 저장 콜백 연결 지점
- 데스크톱·태블릿·모바일 반응형 레이아웃

## 핵심 구조

현재 구현은 `FormProvider`와 렌더링된 FormItem의 메타데이터 등록 방식을 사용합니다.
레거시 일괄 설정 방식에서 전환하는 전체 과정은
[조회조건 저장 로직 Provider 방식 마이그레이션 가이드](docs/search-condition-provider-migration.md)를
참고하세요. 기본/스타일 FormItem 비교, 단일 Checkbox, DatePicker, 서버 데이터
반영, 저장 모달 snapshot 및 API payload까지 단계별 코드로 정리되어 있습니다.

`searchCategories`는 화면 반복 렌더링을 담당하고, 실제로 렌더링된
`ConditionFormItem`은 `label`, `options`, `formatValue` 메타데이터를
`ConditionCollectorProvider`에 등록합니다. 필드 값은 복제하지 않으며 저장 모달을
여는 순간 RHF의 `getValues()`로 최신 값을 읽습니다.

```jsx
{
  name: "status",
  label: "처리상태",
  options: statusOptions,
  render: ({ field, options }) => (
    <Checkbox.Group
      value={field.value}
      onChange={field.onChange}
      options={options}
    />
  ),
}
```

폼 전체는 `FormProvider`와 `ConditionCollectorProvider`로 감쌉니다.

```jsx
<FormProvider {...methods}>
  <ConditionCollectorProvider>
    <SearchFormContent />
  </ConditionCollectorProvider>
</FormProvider>
```

표시부에서는 기존 DOM 구조를 유지하면서 카테고리 경계와 FormItem을 등록합니다.

```jsx
{searchCategories.map((category) => (
  <ConditionCategory
    key={category.key}
    categoryKey={category.key}
    label={category.categoryLabel}
  >
    <Col className="flex-group">
      <div className="category-name">{category.categoryLabel}</div>
      <Row className="category-list">
        <ConditionCategoryItem itemKey="default">
          <Col className="category-item">
            {category.fields.map((fieldConfig) => (
              <Controller
                key={fieldConfig.name}
                name={fieldConfig.name}
                control={control}
                render={({ field }) => (
                  <ConditionFormItem
                    fieldName={fieldConfig.name}
                    label={fieldConfig.label}
                    options={fieldConfig.options}
                    formatValue={fieldConfig.formatValue}
                  >
                    {fieldConfig.render({ field })}
                  </ConditionFormItem>
                )}
              />
            ))}
          </Col>
        </ConditionCategoryItem>
      </Row>
    </Col>
  </ConditionCategory>
))}
```

`label`이 있는 필드는 저장 확인 화면에서 해당 라벨로 독립된 행을 만듭니다.
`label`을 생략한 필드가 같은 `category-item`에 여러 개 있으면 최상위
`categoryLabel`을 왼쪽 라벨로 사용하고 각 값을 `/`로 연결합니다.

```jsx
{
  key: "keyword-category",
  categoryLabel: "검색어",
  fields: [
    { name: "keyword", render: /* Input */ },
    { name: "searchTarget", render: /* Select */ },
  ],
}

// 저장 확인 결과
// 검색어 | 장애 대응 / 제목 + 내용
```

모달을 열 때 원본 값과 표시용 값을 같은 시점의 snapshot으로 고정합니다.

```jsx
setConditionSnapshot({
  rawValues: toSerializableValues(getValues()),
  displayValues: collect(),
});
```

## DB/API 연결

`SearchForm`의 콜백에 실제 API 함수를 연결하면 됩니다.

```jsx
<SearchForm
  onSearch={(values) => searchNoticeList(values)}
  onSaveCondition={(payload) => saveSearchCondition(payload)}
/>
```

저장 payload에는 원본 값과 사용자에게 표시한 값이 함께 포함됩니다.

```jsx
{
  name: "이번 달 처리 대기 건",
  values: {
    status: ["READY", "IN_PROGRESS"],
    registeredRange: ["2026-07-01", "2026-07-30"]
  },
  displayValues: [
    {
      names: ["status", "visibility"],
      label: "처리상태",
      displayValue: "대기, 처리중 / 전체"
    }
  ],
  savedAt: "2026-07-30T..."
}
```

## 실행

```bash
npm install
npm run dev
```

검증 명령:

```bash
npm run lint
npm test
```
