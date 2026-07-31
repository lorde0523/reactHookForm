# 조회조건 저장 로직 마이그레이션 가이드

## 목표

기존 레거시 폼의 `Form`, `Form.Item`, `Row`, `Col` DOM과 스타일은 유지하면서
데이터 제어를 RHF로 통일한다.

최종 흐름:

```text
기본값 생성
  → 서버 조회조건 hydrate
  → RHF reset
  → 사용자 입력
  → 조회 시 serialize
  → 모달 열 때 snapshot
  → 이름 입력 후 API 저장
```

## 파일 구성

| 파일 | 책임 |
|---|---|
| `searchConditionSchema.jsx` | 렌더링, default, options, 표시 규칙 |
| `searchConditionModel.js` | hydrate, serialize, snapshot |
| `SearchForm.jsx` | RHF와 화면 동작 |
| `SearchConditionSaveModal.jsx` | 표시와 저장 이름 입력 |

## 1. 레거시 FormItem을 스키마로 이동

변경 전:

```jsx
<Col className="flex-group">
  <div className="category-name">분류</div>
  <Row className="category-list">
    <Col className="category-item">
      <Controller
        name="department"
        control={control}
        render={({ field }) => (
          <Form.Item label="담당부서">
            <Select
              value={field.value}
              onChange={field.onChange}
              options={departmentOptions}
            />
          </Form.Item>
        )}
      />
    </Col>
  </Row>
</Col>
```

변경 후 스키마:

```jsx
{
  key: "classification-category",
  categoryLabel: "분류",
  items: [
    {
      key: "main",
      fields: [
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
        },
      ],
    },
  ],
}
```

렌더링:

```jsx
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
              rules={fieldConfig.rules}
              render={({ field, fieldState }) => (
                <Form.Item
                  label={fieldConfig.label}
                  validateStatus={
                    fieldState.invalid ? "error" : undefined
                  }
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
      ))}
    </Row>
  </Col>
))}
```

## 2. 초기값

날짜 기본값이 모듈 로드 시점에 고정되지 않도록 함수로 생성한다.

```js
export function createDefaultSearchValues() {
  return {
    keyword: "",
    searchTarget: "TITLE_CONTENT",
    status: ["READY", "IN_PROGRESS"],
    visibility: "ALL",
    department: undefined,
    tags: [],
    registeredRange: [
      dayjs().subtract(29, "day"),
      dayjs(),
    ],
    minimumViews: null,
    hasAttachment: false,
  };
}
```

```jsx
const defaultValues = useMemo(
  () => createDefaultSearchValues(),
  [],
);

const methods = useForm({
  defaultValues,
});
```

## 3. 서버 데이터 반영

여러 `setValue` 호출은 필드별 상태 갱신을 반복할 수 있다. 서버가 전체 조회조건을
반환한다면 입력 타입으로 변환한 객체를 `reset`에 한 번 전달하는 것이 효율적이다.

```jsx
useEffect(() => {
  if (!loadInitialCondition) {
    return;
  }

  const load = async () => {
    const serverValues =
      await loadInitialCondition();

    reset(
      hydrateSearchValues(
        searchConditionSchema,
        serverValues,
        defaultValues,
      ),
    );
  };

  load();
}, [
  defaultValues,
  loadInitialCondition,
  reset,
]);
```

DatePicker 복원:

```jsx
{
  name: "registeredRange",
  hydrate: (value) =>
    value?.map((date) => dayjs(date)) ?? null,
}
```

필드 하나만 서버 이벤트로 변경할 때는 `setValue`가 적합하다.

```jsx
setValue("department", serverDepartment, {
  shouldDirty: false,
  shouldValidate: true,
});
```

## 4. 조회

```jsx
const submitSearch = handleSubmit(
  async (values) => {
    const payload = serializeSearchValues(
      searchConditionSchema,
      values,
    );

    const results = await onSearch(payload);
    setResults(results);
  },
);
```

DatePicker와 RangePicker의 `dayjs` 값은 직렬화 단계에서 문자열로 변환한다.

## 5. 모달 snapshot

모달을 렌더링할 때마다 폼 전체를 구독하지 않는다. 사용자가 저장 버튼을 누른
순간에 원본 저장값과 표시용 값을 한 번 만든다.

```jsx
const openSaveModal = () => {
  setConditionSnapshot(
    createSearchSnapshot(
      searchConditionSchema,
      getValues(),
    ),
  );

  setSaveModalOpen(true);
};
```

snapshot:

```js
{
  values: {
    keyword: "장애",
    hasAttachment: false,
    registeredRange: [
      "2026-07-01",
      "2026-07-31",
    ],
  },
  displayValues: [
    {
      names: [
        "keyword",
        "searchTarget",
      ],
      label: "검색어",
      displayValue:
        "장애 / 제목 + 내용",
    },
  ],
}
```

모달에는 스키마나 `getValues`를 전달하지 않고 `displayValues`만 전달한다.

## 6. 표시 규칙

### FormItem label이 있는 경우

```jsx
{
  name: "department",
  label: "담당부서",
}
```

| 라벨 | 값 |
|---|---|
| 담당부서 | 플랫폼개발팀 |

### 동일 item 안의 무라벨 필드

```jsx
{
  key: "main",
  fields: [
    { name: "keyword" },
    { name: "searchTarget" },
  ],
}
```

| 라벨 | 값 |
|---|---|
| 검색어 | 장애 / 제목 + 내용 |

### 단일 Checkbox

```jsx
{
  name: "hasAttachment",
  label: "첨부파일",
  shouldDisplay: (value) => value === true,
  formatValue: () =>
    "첨부파일이 있는 게시물만 조회",
}
```

- `true`: 원본 저장 및 모달 표시
- `false`: 원본 저장, 모달에서는 숨김

### Checkbox.Group

`options` 라벨을 찾아 `대기, 완료`처럼 표시한다.

### DatePicker

```jsx
{
  name: "registeredRange",
  label: "등록기간",
  formatValue: (value) =>
    value
      .map((date) =>
        date.format("YYYY-MM-DD"),
      )
      .join(" ~ "),
}
```

## 7. 저장

```jsx
const saveCondition = async (
  conditionName,
) => {
  const payload = {
    name: conditionName,
    values:
      conditionSnapshot.values,
    displayValues:
      conditionSnapshot.displayValues,
    savedAt: dayjs().toISOString(),
  };

  await onSaveCondition(payload);
};
```

`false`, `0`을 제거하는 `filter(Boolean)`은 사용하지 않는다.

## 8. 성능 원칙

- RHF만 실제 필드 값을 저장한다.
- 서버 전체 값은 `reset` 한 번으로 반영한다.
- 메타데이터 등록을 위한 `useEffect`를 만들지 않는다.
- DOM이나 React children을 탐색하지 않는다.
- 모달은 열 때 snapshot을 한 번 생성한다.
- 적용 조건 수처럼 실시간 구독이 필요한 작은 UI만 별도 `useWatch` 컴포넌트로
  분리한다.
- 렌더링, 모달, API 변환 규칙은 동일한 스키마를 사용한다.

## 9. 확인 항목

- 기본값으로 폼이 렌더링된다.
- 서버 날짜가 DatePicker의 `dayjs` 값으로 복원된다.
- 서버의 `false` Checkbox 값이 유지된다.
- 사용자 변경 후 조회 payload가 최신 값이다.
- 모달에는 표시 대상 조건만 나타난다.
- 저장 payload에는 `values`와 `displayValues`가 함께 존재한다.
- 초기화 시 기본값으로 돌아간다.
