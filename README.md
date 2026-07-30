# RHF + Ant Design SearchForm

React Hook Form을 폼 데이터의 유일한 상태로 사용하는 실무형 조회조건 예제입니다.
애플리케이션 코드는 TypeScript 없이 JSX/JavaScript로 작성되어 있습니다.

## 제공 기능

- Input, Select, Multi Select, Checkbox, Radio, Date Range, InputNumber, Switch
- `Controller`를 통한 Ant Design 컴포넌트 제어
- 조회, 초기화, 유효성 검사
- 현재 조회조건의 표시 라벨을 보여주는 저장 확인 모달
- 조건 이름 입력 및 DB 저장 콜백 연결 지점
- 데스크톱·태블릿·모바일 반응형 레이아웃

## 핵심 구조

`searchCategories` 객체가 카테고리 레이아웃, RHF 필드 연결, 저장 확인 화면의
표시 정보를 함께 관리합니다. `label`은 실제 `Form.Item`의 라벨로도 사용되고,
`options`는 입력 컴포넌트와 저장 확인 화면에서 재사용되므로 같은 옵션을 다른
설정에 다시 작성하지 않습니다.

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

표시부에서는 카테고리와 필드를 반복하면서 `Controller`를 렌더링합니다.
반복문 안에서 Hook을 호출하지 않고 `<Controller>` 컴포넌트를 사용하므로 React의
Hook 호출 순서 규칙도 지킬 수 있습니다.

```jsx
{searchCategories.map((category) => (
  <Col key={category.key} className="flex-group">
    <div className="category-name">{category.categoryLabel}</div>
    <Row className="category-list">
      <Col className="category-item">
        {category.fields.map((fieldConfig) => (
          <Controller
            key={fieldConfig.name}
            name={fieldConfig.name}
            control={control}
            rules={fieldConfig.rules}
            render={({ field, fieldState }) => (
              <Form.Item
                label={fieldConfig.label}
                className="search-form-item"
                validateStatus={fieldState.invalid ? "error" : undefined}
                help={fieldState.error?.message}
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
    </Row>
  </Col>
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

값은 모두 RHF에서 조회합니다.

```jsx
const values = getValues();
const submitSearch = handleSubmit((data) => {
  // 조회 API 호출
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
