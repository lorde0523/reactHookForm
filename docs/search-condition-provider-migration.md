# 조회조건 저장 로직 Provider 방식 마이그레이션 가이드

## 1. 문서 목적

현재 저장소에는 이 문서의 목표 구조가
[`ConditionCollector.jsx`](../components/search-form/ConditionCollector.jsx),
[`ConditionFormItem.jsx`](../components/search-form/ConditionFormItem.jsx),
[`createConditionDisplayRows.js`](../components/search-form/createConditionDisplayRows.js)에
구현되어 있다.

마이그레이션 전 레거시 버전은 `searchCategories` 전체 설정과 RHF의 `getValues()`를
`createSearchConditionRows()`에 함께 전달해 조회조건 저장 모달용 데이터를 만든다.

```jsx
setPreviewRows(
  createSearchConditionRows(searchCategories, getValues()),
);
```

이 문서는 위 방식을 다음 구조로 변경하는 절차를 설명한다.

1. RHF의 `FormProvider`가 실제 필드 값을 관리한다.
2. 화면에 렌더링된 `ConditionFormItem`이 자신의 메타데이터를 등록한다.
3. 저장 모달을 열 때 등록된 메타데이터와 RHF 최신 값을 결합한다.
4. 모달에는 변환이 끝난 표시 데이터만 전달한다.
5. API에는 원본 값과 표시용 값을 함께 전달한다.

이 방식의 목표는 별도의 대형 조회조건 설정을 다시 순회하지 않고, 실제 화면에
존재하는 FormItem을 기준으로 저장 데이터를 만드는 것이다.

---

## 2. 최종 동작 규칙

### 2.1 FormItem에 라벨이 있는 경우

```jsx
<ConditionFormItem
  fieldName="department"
  label="담당부서"
>
  <Select />
</ConditionFormItem>
```

모달 표시:

| 왼쪽 라벨 | 오른쪽 값 |
|---|---|
| 담당부서 | 개발팀 |

### 2.2 같은 category-item에 라벨 없는 FormItem이 여러 개인 경우

```jsx
<ConditionCategory categoryKey="keyword" label="검색어">
  <ConditionCategoryItem itemKey="main">
    <ConditionFormItem fieldName="keyword">
      <Input />
    </ConditionFormItem>

    <ConditionFormItem
      fieldName="searchTarget"
      options={searchTargetOptions}
    >
      <Select />
    </ConditionFormItem>
  </ConditionCategoryItem>
</ConditionCategory>
```

모달 표시:

| 왼쪽 라벨 | 오른쪽 값 |
|---|---|
| 검색어 | 장애 대응 / 제목 + 내용 |

### 2.3 단일 Checkbox

- 체크 상태 `true`는 원본 조회조건에 저장한다.
- 체크 해제 상태 `false`도 원본 조회조건에 저장한다.
- 체크된 경우에만 모달에 표시한다.
- 모달의 오른쪽 값은 Checkbox 내부 문자열을 사용한다.

```jsx
<Checkbox>
  첨부파일이 있는 게시물만 조회
</Checkbox>
```

| Checkbox 값 | API 원본 값 | 모달 표시 |
|---:|---:|---|
| `true` | `true` | 첨부파일이 있는 게시물만 조회 |
| `false` | `false` | 표시하지 않음 |

### 2.4 DatePicker

- RHF 내부에서는 `dayjs` 객체를 사용한다.
- 모달 표시값은 `formatValue`로 문자열 변환한다.
- API 저장 직전에는 날짜를 직렬화한다.
- 서버에서 불러온 문자열 날짜는 `reset()` 전에 다시 `dayjs`로 변환한다.

---

## 3. 레거시 코드와 적용 코드 비교

### 3.1 레거시 방식

레거시 `SearchForm.jsx`는 화면 렌더링, 필드 메타데이터, 모달 표시 데이터가
`searchCategories`에 함께 들어 있다.

```jsx
const searchCategories = [
  {
    key: "classification-category",
    categoryLabel: "분류",
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
];
```

모달을 열 때 전체 설정을 다시 순회한다.

```jsx
const openSaveModal = () => {
  setPreviewRows(
    createSearchConditionRows(
      searchCategories,
      getValues(),
    ),
  );

  setSaveModalOpen(true);
};
```

### 3.2 적용된 Provider 방식

각 FormItem이 렌더링될 때 다음 메타데이터만 Provider에 등록한다.

```js
{
  name: "department",
  label: "담당부서",
  options: departmentOptions,
  categoryKey: "classification",
  categoryLabel: "분류",
  itemKey: "main",
}
```

실제 값은 등록하지 않는다. 모달을 여는 시점에 RHF에서 최신 값을 읽는다.

```jsx
const openSaveModal = () => {
  const rawValues = getValues();
  const displayValues = collect();

  setConditionSnapshot({
    rawValues,
    displayValues,
  });

  setSaveModalOpen(true);
};
```

---

## 4. 권장 파일 구조

```text
components/
  search-form/
    ConditionCollector.jsx
    ConditionFormItem.jsx
    createConditionDisplayRows.js
    SearchConditionSaveModal.jsx
    SearchForm.jsx
```

역할:

| 파일 | 책임 |
|---|---|
| `ConditionCollector.jsx` | FormItem 메타데이터 등록 및 RHF 최신 값 수집 |
| `ConditionFormItem.jsx` | 기존 Ant Design Form.Item 대체 |
| `createConditionDisplayRows.js` | 순수 데이터 변환 |
| `SearchConditionSaveModal.jsx` | 변환이 끝난 데이터를 출력 |
| `SearchForm.jsx` | 폼 렌더링, 서버 데이터 적용, 저장 요청 |

---

## 5. FormProvider 적용

### 변경 전

```jsx
export default function SearchForm() {
  const {
    control,
    getValues,
    handleSubmit,
    reset,
  } = useForm({
    defaultValues,
  });

  return (
    <Form>
      {/* 조회조건 */}
    </Form>
  );
}
```

### 변경 후

```jsx
import {
  FormProvider,
  useForm,
  useFormContext,
} from "react-hook-form";
import {
  ConditionCollectorProvider,
  useConditionCollector,
} from "./ConditionCollector";

export default function SearchForm(props) {
  const methods = useForm({
    defaultValues,
  });

  return (
    <FormProvider {...methods}>
      <ConditionCollectorProvider>
        <SearchFormContent {...props} />
      </ConditionCollectorProvider>
    </FormProvider>
  );
}

function SearchFormContent({
  onSearch,
  onSaveCondition,
}) {
  const {
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
  } = useFormContext();

  const {
    collect,
  } = useConditionCollector();

  return (
    <Form>
      {/* 기존 조회조건 JSX */}
    </Form>
  );
}
```

`SearchFormContent`로 분리하는 이유는 `useConditionCollector()`가
`ConditionCollectorProvider` 아래에서 실행돼야 하기 때문이다.

---

## 6. 메타데이터 수집 Provider

`components/search-form/ConditionCollector.jsx`

```jsx
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useFormContext } from "react-hook-form";
import { createConditionDisplayRows } from "./createConditionDisplayRows";

const CollectorContext = createContext(null);
const CategoryContext = createContext(null);
const CategoryItemContext = createContext(null);

export function ConditionCollectorProvider({
  children,
}) {
  const {
    getValues,
  } = useFormContext();

  const registryRef = useRef(new Map());

  const register = useCallback((metadata) => {
    const registryKey = [
      metadata.categoryKey,
      metadata.itemKey,
      metadata.name,
    ].join(":");

    registryRef.current.set(
      registryKey,
      metadata,
    );

    return () => {
      registryRef.current.delete(registryKey);
    };
  }, []);

  const collect = useCallback(() => {
    const metadataList = Array.from(
      registryRef.current.values(),
    );

    return createConditionDisplayRows(
      metadataList,
      (fieldName) => getValues(fieldName),
    );
  }, [getValues]);

  const contextValue = useMemo(
    () => ({
      register,
      collect,
    }),
    [collect, register],
  );

  return (
    <CollectorContext.Provider value={contextValue}>
      {children}
    </CollectorContext.Provider>
  );
}

export function ConditionCategory({
  categoryKey,
  label,
  children,
}) {
  const contextValue = useMemo(
    () => ({
      categoryKey,
      categoryLabel: label,
    }),
    [categoryKey, label],
  );

  return (
    <CategoryContext.Provider value={contextValue}>
      {children}
    </CategoryContext.Provider>
  );
}

export function ConditionCategoryItem({
  itemKey = "default",
  children,
}) {
  const contextValue = useMemo(
    () => ({
      itemKey,
    }),
    [itemKey],
  );

  return (
    <CategoryItemContext.Provider value={contextValue}>
      {children}
    </CategoryItemContext.Provider>
  );
}

export function useConditionCollector() {
  const context = useContext(CollectorContext);

  if (!context) {
    throw new Error(
      "ConditionCollectorProvider 내부에서 사용해야 합니다.",
    );
  }

  return context;
}

export function useConditionLocation() {
  const category = useContext(CategoryContext);
  const categoryItem = useContext(
    CategoryItemContext,
  );

  if (!category) {
    throw new Error(
      "ConditionFormItem은 ConditionCategory 내부에 있어야 합니다.",
    );
  }

  return {
    ...category,
    itemKey:
      categoryItem?.itemKey ?? "default",
  };
}
```

### Provider에 값을 등록하지 않는 이유

Provider에는 `label`, `options`, `formatValue`와 같은 메타데이터만 등록한다.
사용자 입력값을 ref나 별도 state에 복제하면 RHF와 저장된 값이 달라질 수 있다.

```text
RHF                  메타데이터 Provider
─────────────────    ─────────────────────────
keyword 값           keyword의 label
status 값            status의 options
DatePicker 값        DatePicker formatValue
```

모달을 여는 시점의 실제 값은 항상 `getValues(fieldName)`으로 읽는다.

---

## 7. 수집 가능한 ConditionFormItem

`components/search-form/ConditionFormItem.jsx`

```jsx
"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useMemo,
} from "react";
import { Form } from "antd";
import {
  useConditionCollector,
  useConditionLocation,
} from "./ConditionCollector";

function getReactNodeText(node) {
  if (
    typeof node === "string" ||
    typeof node === "number"
  ) {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node
      .map(getReactNodeText)
      .filter(Boolean)
      .join(" ");
  }

  if (isValidElement(node)) {
    return getReactNodeText(
      node.props.children,
    );
  }

  return "";
}

export default function ConditionFormItem({
  fieldName,
  conditionLabel,
  controlType,
  checkedLabel,
  options,
  formatValue,
  children,
  ...formItemProps
}) {
  const {
    categoryKey,
    categoryLabel,
    itemKey,
  } = useConditionLocation();
  const {
    register,
  } = useConditionCollector();

  const child = Children.only(children);

  const displayLabel =
    conditionLabel ??
    formItemProps.label ??
    null;

  const resolvedCheckedLabel = useMemo(() => {
    if (controlType !== "single-checkbox") {
      return null;
    }

    if (checkedLabel) {
      return checkedLabel;
    }

    if (!isValidElement(child)) {
      return "";
    }

    return getReactNodeText(
      child.props.children,
    );
  }, [
    checkedLabel,
    child,
    controlType,
  ]);

  useEffect(() => {
    return register({
      name: fieldName,
      label: displayLabel,
      controlType,
      checkedLabel: resolvedCheckedLabel,
      options,
      formatValue,
      categoryKey,
      categoryLabel,
      itemKey,
    });
  }, [
    categoryKey,
    categoryLabel,
    controlType,
    displayLabel,
    fieldName,
    formatValue,
    itemKey,
    options,
    register,
    resolvedCheckedLabel,
  ]);

  return (
    <Form.Item {...formItemProps}>
      {children}
    </Form.Item>
  );
}
```

### `fieldName`을 별도 prop으로 사용하는 이유

RHF의 필드명과 Ant Design Form.Item의 `name` 역할이 다를 수 있으므로
수집용 이름은 `fieldName`으로 명확하게 분리한다.

```jsx
<ConditionFormItem
  fieldName="department"
  label="담당부서"
>
  <Select />
</ConditionFormItem>
```

### JSX Form.Item 라벨

Form.Item 라벨이 문자열이 아닌 JSX라면 API 저장용 라벨을 별도로 전달한다.

```jsx
<ConditionFormItem
  fieldName="department"
  label={
    <Space>
      담당부서
      <Tooltip title="담당 조직 기준" />
    </Space>
  }
  conditionLabel="담당부서"
>
  <Select />
</ConditionFormItem>
```

---

## 8. 표시 데이터 생성

`components/search-form/createConditionDisplayRows.js`

```js
export function isEmptyValue(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (
      Array.isArray(value) &&
      value.length === 0
    )
  );
}

function findOptionLabel(options, value) {
  return (
    options?.find(
      (option) =>
        String(option.value) === String(value),
    )?.label ??
    String(value)
  );
}

function formatFieldValue(metadata, value) {
  if (metadata.formatValue) {
    return metadata.formatValue(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) =>
        findOptionLabel(metadata.options, item),
      )
      .join(", ");
  }

  if (metadata.options?.length) {
    return findOptionLabel(
      metadata.options,
      value,
    );
  }

  return String(value);
}

export function createConditionDisplayRows(
  metadataList,
  getValue,
) {
  const groups = new Map();

  metadataList.forEach((metadata, index) => {
    const groupKey = [
      metadata.categoryKey,
      metadata.itemKey,
    ].join(":");

    const group = groups.get(groupKey) ?? [];

    group.push({
      ...metadata,
      index,
    });

    groups.set(groupKey, group);
  });

  return Array.from(groups.values()).flatMap(
    (group) => {
      const fields = group
        .map((metadata) => {
          const rawValue = getValue(
            metadata.name,
          );

          /*
           * 단일 Checkbox:
           * false는 원본 저장값에는 남지만
           * 모달 표시 데이터에서만 제외한다.
           */
          if (
            metadata.controlType ===
              "single-checkbox" &&
            rawValue !== true
          ) {
            return null;
          }

          if (isEmptyValue(rawValue)) {
            return null;
          }

          const displayValue =
            metadata.controlType ===
            "single-checkbox"
              ? metadata.checkedLabel
              : formatFieldValue(
                  metadata,
                  rawValue,
                );

          return {
            ...metadata,
            rawValue,
            displayValue,
          };
        })
        .filter(Boolean);

      const labeledRows = fields
        .filter(({ label }) => Boolean(label))
        .map((field) => ({
          index: field.index,
          key: field.name,
          names: [field.name],
          label: field.label,
          rawValues: {
            [field.name]: field.rawValue,
          },
          displayValue: field.displayValue,
        }));

      const unlabeledFields = fields.filter(
        ({ label }) => !label,
      );

      if (unlabeledFields.length > 0) {
        labeledRows.push({
          index: unlabeledFields[0].index,
          key: [
            unlabeledFields[0].categoryKey,
            unlabeledFields[0].itemKey,
            "unlabeled",
          ].join(":"),
          names: unlabeledFields.map(
            ({ name }) => name,
          ),
          label:
            unlabeledFields[0].categoryLabel,
          rawValues: Object.fromEntries(
            unlabeledFields.map(
              ({ name, rawValue }) => [
                name,
                rawValue,
              ],
            ),
          ),
          displayValue: unlabeledFields
            .map(
              ({ displayValue }) =>
                displayValue,
            )
            .join(" / "),
        });
      }

      return labeledRows
        .sort(
          (left, right) =>
            left.index - right.index,
        )
        .map(
          ({
            index: _index,
            ...displayRow
          }) => displayRow,
        );
    },
  );
}
```

실제 구현에서는 ESLint 설정에 따라 `_index`도 미사용 변수로 판단될 수 있다.
그 경우 반환할 속성을 명시적으로 작성한다.

```js
.map(
  ({
    key,
    names,
    label,
    rawValues,
    displayValue,
  }) => ({
    key,
    names,
    label,
    rawValues,
    displayValue,
  }),
);
```

---

## 9. 카테고리 DOM 마이그레이션

### 변경 전

```jsx
<Col span={24} className="flex-group">
  <div className="category-name">
    검색어
  </div>

  <Row className="category-list">
    <Col span={24} className="category-item">
      {/* Form.Item들 */}
    </Col>
  </Row>
</Col>
```

### 변경 후

```jsx
<ConditionCategory
  categoryKey="keyword"
  label="검색어"
>
  <Col span={24} className="flex-group">
    <div className="category-name">
      검색어
    </div>

    <Row className="category-list">
      <ConditionCategoryItem itemKey="main">
        <Col
          span={24}
          className="category-item"
        >
          {/* ConditionFormItem들 */}
        </Col>
      </ConditionCategoryItem>
    </Row>
  </Col>
</ConditionCategory>
```

`ConditionCategory`와 `ConditionCategoryItem`은 실제 DOM을 추가하지 않으므로
기존 `.flex-group`, `.category-name`, `.category-list`, `.category-item`
스타일은 유지된다.

### 하나의 카테고리에 category-item이 여러 개인 경우

```jsx
<ConditionCategory
  categoryKey="period"
  label="기간"
>
  <ConditionCategoryItem itemKey="created">
    <Col className="category-item">
      {/* 등록일 조건 */}
    </Col>
  </ConditionCategoryItem>

  <ConditionCategoryItem itemKey="modified">
    <Col className="category-item">
      {/* 수정일 조건 */}
    </Col>
  </ConditionCategoryItem>
</ConditionCategory>
```

무라벨 FormItem 값은 같은 `itemKey` 안에서만 `/`로 결합된다.

---

## 10. 기본 Form.Item 마이그레이션

### 변경 전

```jsx
<Controller
  name="department"
  control={control}
  render={({ field, fieldState }) => (
    <Form.Item
      label="담당부서"
      className="search-form-item"
      validateStatus={
        fieldState.invalid
          ? "error"
          : undefined
      }
      help={fieldState.error?.message}
    >
      <Select
        value={field.value}
        onChange={field.onChange}
        options={departmentOptions}
      />
    </Form.Item>
  )}
/>
```

### 변경 후

```jsx
<Controller
  name="department"
  control={control}
  render={({ field, fieldState }) => (
    <ConditionFormItem
      fieldName="department"
      label="담당부서"
      options={departmentOptions}
      className="search-form-item"
      validateStatus={
        fieldState.invalid
          ? "error"
          : undefined
      }
      help={fieldState.error?.message}
    >
      <Select
        value={field.value}
        onChange={field.onChange}
        options={departmentOptions}
      />
    </ConditionFormItem>
  )}
/>
```

핵심 diff:

```diff
- <Form.Item
+ <ConditionFormItem
+   fieldName="department"
    label="담당부서"
+   options={departmentOptions}
```

Input, Select, Checkbox, DatePicker와 RHF Controller 연결은 변경하지 않는다.

---

## 11. 스타일 FormItem 마이그레이션

현재 스타일 FormItem이 기본 `Form.Item`에 CSS만 추가한 형태라면 사용처 전체를
다시 작성할 필요가 없다. 스타일 컴포넌트의 베이스만 변경한다.

### styled-components 또는 Emotion

변경 전:

```jsx
const StyledFormItem = styled(Form.Item)`
  margin-bottom: 12px;

  .ant-form-item-label {
    font-weight: 700;
  }
`;
```

변경 후:

```jsx
const StyledFormItem = styled(ConditionFormItem)`
  margin-bottom: 12px;

  .ant-form-item-label {
    font-weight: 700;
  }
`;
```

사용:

```jsx
<StyledFormItem
  fieldName="department"
  label="담당부서"
  options={departmentOptions}
>
  <Select />
</StyledFormItem>
```

### 함수형 스타일 FormItem

변경 전:

```jsx
function InlineFormItem({
  className,
  children,
  ...props
}) {
  return (
    <Form.Item
      {...props}
      className={[
        "inline-form-item",
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </Form.Item>
  );
}
```

변경 후:

```jsx
function InlineFormItem({
  className,
  children,
  ...props
}) {
  return (
    <ConditionFormItem
      {...props}
      className={[
        "inline-form-item",
        className,
      ].filter(Boolean).join(" ")}
    >
      {children}
    </ConditionFormItem>
  );
}
```

모든 스타일 FormItem은 다음 props를 `ConditionFormItem`까지 전달해야 한다.

| prop | 설명 |
|---|---|
| `fieldName` | RHF 필드명 |
| `label` | Form.Item 화면 라벨 |
| `conditionLabel` | JSX 라벨의 저장용 문자열 |
| `options` | Select, Radio, Checkbox.Group의 값-라벨 변환 |
| `formatValue` | 날짜, 금액 등 사용자 정의 변환 |
| `controlType` | 단일 Checkbox 등 특수 처리 종류 |
| `checkedLabel` | Checkbox 내부 문구 자동 추출이 불가능할 때 사용 |

---

## 12. 단일 Checkbox 마이그레이션

### 변경 전

```jsx
<Controller
  name="hasAttachment"
  control={control}
  render={({ field }) => (
    <Form.Item label="첨부파일">
      <Checkbox
        checked={Boolean(field.value)}
        onChange={(event) => {
          field.onChange(
            event.target.checked,
          );
        }}
      >
        첨부파일이 있는 게시물만 조회
      </Checkbox>
    </Form.Item>
  )}
/>
```

### 변경 후

```jsx
<Controller
  name="hasAttachment"
  control={control}
  render={({ field }) => (
    <ConditionFormItem
      fieldName="hasAttachment"
      label="첨부파일"
      controlType="single-checkbox"
    >
      <Checkbox
        checked={Boolean(field.value)}
        onChange={(event) => {
          field.onChange(
            event.target.checked,
          );
        }}
        onBlur={field.onBlur}
      >
        첨부파일이 있는 게시물만 조회
      </Checkbox>
    </ConditionFormItem>
  )}
/>
```

체크된 경우:

```js
{
  values: {
    hasAttachment: true,
  },
  displayValues: [
    {
      names: ["hasAttachment"],
      label: "첨부파일",
      displayValue:
        "첨부파일이 있는 게시물만 조회",
    },
  ],
}
```

체크 해제된 경우:

```js
{
  values: {
    hasAttachment: false,
  },
  displayValues: [],
}
```

중요한 점은 `false`를 저장 데이터에서 제거하지 않는 것이다. 모달 표시 목록에서만
제외한다.

```js
// 사용 금지: false, 0까지 제거한다.
Object.entries(values).filter(
  ([, value]) => Boolean(value),
);
```

필요하다면 `undefined`만 제거한다.

```js
const valuesForSave = Object.fromEntries(
  Object.entries(values).filter(
    ([, value]) => value !== undefined,
  ),
);
```

### Checkbox 내부가 번역 컴포넌트인 경우

```jsx
<ConditionFormItem
  fieldName="hasAttachment"
  label="첨부파일"
  controlType="single-checkbox"
  checkedLabel="첨부파일이 있는 게시물만 조회"
>
  <Checkbox checked={field.value}>
    <TranslationText id="attachment-only" />
  </Checkbox>
</ConditionFormItem>
```

---

## 13. Checkbox.Group

단일 Checkbox와 Checkbox.Group은 처리 규칙이 다르다.

```jsx
<Controller
  name="status"
  control={control}
  render={({ field }) => (
    <ConditionFormItem
      fieldName="status"
      label="처리상태"
      options={statusOptions}
    >
      <Checkbox.Group
        value={field.value}
        onChange={field.onChange}
        options={statusOptions}
      />
    </ConditionFormItem>
  )}
/>
```

RHF 값:

```js
{
  status: [
    "READY",
    "COMPLETE",
  ],
}
```

모달 표시:

| 왼쪽 라벨 | 오른쪽 값 |
|---|---|
| 처리상태 | 대기, 완료 |

`Checkbox.Group`에는 `controlType="single-checkbox"`를 전달하지 않는다.

---

## 14. DatePicker 마이그레이션

### 표시 포맷

```jsx
function formatDate(value) {
  if (!value) {
    return "";
  }

  return dayjs(value).format(
    "YYYY-MM-DD",
  );
}
```

### 변경 전

```jsx
<Controller
  name="registeredDate"
  control={control}
  render={({ field }) => (
    <Form.Item label="등록일">
      <DatePicker
        value={field.value}
        onChange={field.onChange}
        format="YYYY-MM-DD"
      />
    </Form.Item>
  )}
/>
```

### 변경 후

```jsx
<Controller
  name="registeredDate"
  control={control}
  render={({ field }) => (
    <ConditionFormItem
      fieldName="registeredDate"
      label="등록일"
      formatValue={formatDate}
    >
      <DatePicker
        value={field.value}
        onChange={(date) => {
          field.onChange(date);
        }}
        onBlur={field.onBlur}
        format="YYYY-MM-DD"
        allowClear
      />
    </ConditionFormItem>
  )}
/>
```

모달 표시:

| 왼쪽 라벨 | 오른쪽 값 |
|---|---|
| 등록일 | 2026-07-31 |

---

## 15. 라벨 없는 DatePicker 두 개

```jsx
<ConditionCategory
  categoryKey="registered-period"
  label="등록기간"
>
  <ConditionCategoryItem itemKey="main">
    <Controller
      name="registeredFrom"
      control={control}
      render={({ field }) => (
        <ConditionFormItem
          fieldName="registeredFrom"
          formatValue={formatDate}
        >
          <DatePicker
            value={field.value}
            onChange={field.onChange}
          />
        </ConditionFormItem>
      )}
    />

    <Controller
      name="registeredTo"
      control={control}
      render={({ field }) => (
        <ConditionFormItem
          fieldName="registeredTo"
          formatValue={formatDate}
        >
          <DatePicker
            value={field.value}
            onChange={field.onChange}
          />
        </ConditionFormItem>
      )}
    />
  </ConditionCategoryItem>
</ConditionCategory>
```

모달 표시:

| 왼쪽 라벨 | 오른쪽 값 |
|---|---|
| 등록기간 | 2026-07-01 / 2026-07-31 |

---

## 16. RangePicker

```jsx
const {
  RangePicker,
} = DatePicker;

function formatDateRange(value) {
  if (
    !Array.isArray(value) ||
    value.length !== 2
  ) {
    return "";
  }

  return value
    .map((date) =>
      dayjs(date).format("YYYY-MM-DD"),
    )
    .join(" ~ ");
}
```

```jsx
<Controller
  name="registeredRange"
  control={control}
  render={({ field }) => (
    <ConditionFormItem
      fieldName="registeredRange"
      label="등록기간"
      formatValue={formatDateRange}
    >
      <RangePicker
        value={field.value}
        onChange={(dates) => {
          field.onChange(dates);
        }}
        onBlur={field.onBlur}
        format="YYYY-MM-DD"
        allowClear
      />
    </ConditionFormItem>
  )}
/>
```

모달 표시:

| 왼쪽 라벨 | 오른쪽 값 |
|---|---|
| 등록기간 | 2026-07-01 ~ 2026-07-31 |

---

## 17. 서버 데이터 조회 후 RHF 반영

`useForm({ defaultValues: serverData })`의 `defaultValues`는 최초 마운트 때만
적용된다. 서버 데이터가 나중에 도착하면 반드시 `reset()` 또는 `setValue()`를
사용한다.

```jsx
useEffect(() => {
  if (!serverCondition) {
    return;
  }

  reset({
    keyword:
      serverCondition.keyword ?? "",

    searchTarget:
      serverCondition.searchTarget ??
      "TITLE_CONTENT",

    status:
      serverCondition.status ?? [],

    hasAttachment:
      serverCondition.hasAttachment ??
      false,

    registeredDate:
      serverCondition.registeredDate
        ? dayjs(
            serverCondition.registeredDate,
          )
        : null,

    registeredRange:
      serverCondition.registeredFrom &&
      serverCondition.registeredTo
        ? [
            dayjs(
              serverCondition.registeredFrom,
            ),
            dayjs(
              serverCondition.registeredTo,
            ),
          ]
        : null,
  });
}, [
  reset,
  serverCondition,
]);
```

필드 하나만 갱신할 때:

```jsx
setValue(
  "department",
  serverDepartment,
  {
    shouldDirty: false,
    shouldValidate: true,
  },
);
```

`collect()`는 호출 시점에 `getValues(fieldName)`을 실행하므로 `reset()`이나
`setValue()`로 반영된 최신 값을 사용한다.

### 서버에서 options도 조회하는 경우

```jsx
<ConditionFormItem
  fieldName="department"
  label="담당부서"
  options={departmentOptions}
>
  <Select
    loading={isDepartmentLoading}
    disabled={isDepartmentLoading}
    options={departmentOptions}
  />
</ConditionFormItem>
```

options 로딩 전에 모달을 열면 코드값이 그대로 표시될 수 있으므로 필수 options가
준비될 때까지 저장 버튼을 비활성화하는 것이 안전하다.

---

## 18. 저장 모달 데이터 전달

모달에 메타데이터와 `getValues()`를 따로 전달하지 않는다. 모달을 열기 전에
Provider에서 변환을 끝낸다.

```jsx
const [
  conditionSnapshot,
  setConditionSnapshot,
] = useState({
  rawValues: null,
  displayValues: [],
});

const openSaveModal = () => {
  const rawValues = getValues();
  const displayValues = collect();

  setConditionSnapshot({
    rawValues,
    displayValues,
  });

  setConditionName("");
  setSaveModalOpen(true);
};
```

모달에는 표시용 데이터만 출력 책임으로 전달한다.

```jsx
<SearchConditionSaveModal
  open={saveModalOpen}
  displayValues={
    conditionSnapshot.displayValues
  }
  onCancel={() =>
    setSaveModalOpen(false)
  }
  onSave={saveCondition}
/>
```

```jsx
function SearchConditionSaveModal({
  open,
  displayValues,
  onCancel,
  onSave,
}) {
  return (
    <Modal
      open={open}
      title="조회조건 저장"
      onCancel={onCancel}
      onOk={onSave}
    >
      <Descriptions
        bordered
        column={1}
        items={displayValues.map(
          ({
            names,
            label,
            displayValue,
          }) => ({
            key: names.join("-"),
            label,
            children: displayValue,
          }),
        )}
      />
    </Modal>
  );
}
```

모달이 열린 이후에도 폼 변경을 실시간 반영해야 한다면 `useWatch()`를 사용할 수
있다. 하지만 저장 확인 모달은 일반적으로 모달을 연 시점의 스냅샷을 유지하는 것이
사용자에게 더 예측 가능하다.

---

## 19. API 저장 payload

```jsx
const saveCondition = async () => {
  const payload = {
    name: conditionName.trim(),

    values: toSerializableValues(
      conditionSnapshot.rawValues,
    ),

    displayValues:
      conditionSnapshot.displayValues.map(
        ({
          names,
          label,
          displayValue,
        }) => ({
          names,
          label,
          displayValue,
        }),
      ),

    savedAt: dayjs().toISOString(),
  };

  await onSaveCondition(payload);
};
```

예시:

```js
{
  name: "장애 게시물 조회",

  values: {
    keyword: "장애 대응",
    searchTarget: "TITLE_CONTENT",
    department: "DEV",
    status: [
      "READY",
      "COMPLETE",
    ],
    hasAttachment: false,
    registeredDate: "2026-07-31",
  },

  displayValues: [
    {
      names: [
        "keyword",
        "searchTarget",
      ],
      label: "검색어",
      displayValue:
        "장애 대응 / 제목 + 내용",
    },
    {
      names: ["department"],
      label: "담당부서",
      displayValue: "개발팀",
    },
    {
      names: ["status"],
      label: "처리상태",
      displayValue: "대기, 완료",
    },
    {
      names: ["registeredDate"],
      label: "등록일",
      displayValue: "2026-07-31",
    },
  ],
}
```

`hasAttachment: false`는 `values`에 존재하지만 `displayValues`에는 없다.

---

## 20. 날짜 직렬화와 복원

API 저장:

```js
function toSerializableValues(values) {
  return Object.fromEntries(
    Object.entries(values).map(
      ([key, value]) => {
        if (dayjs.isDayjs(value)) {
          return [
            key,
            value.format("YYYY-MM-DD"),
          ];
        }

        if (
          Array.isArray(value) &&
          value.every(dayjs.isDayjs)
        ) {
          return [
            key,
            value.map((date) =>
              date.format("YYYY-MM-DD"),
            ),
          ];
        }

        return [key, value];
      },
    ),
  );
}
```

저장조건 재적용:

```jsx
function applySavedCondition(savedCondition) {
  reset({
    ...savedCondition.values,

    registeredDate:
      savedCondition.values.registeredDate
        ? dayjs(
            savedCondition.values
              .registeredDate,
          )
        : null,

    registeredRange:
      savedCondition.values.registeredRange
        ? savedCondition.values
            .registeredRange
            .map(dayjs)
        : null,
  });
}
```

---

## 21. 조건부 렌더링 필드

`ConditionFormItem`은 마운트될 때 등록하고 언마운트될 때 제거한다.

```jsx
{useAdvancedSearch && (
  <ConditionFormItem
    fieldName="minimumViews"
    label="최소 조회수"
  >
    <InputNumber />
  </ConditionFormItem>
)}
```

조건이 `false`가 되어 컴포넌트가 언마운트되면 모달 표시 대상에서도 제거된다.

CSS의 `display: none`으로만 숨기면 컴포넌트가 계속 마운트되어 있으므로 수집 대상에
남는다. 표시 조건에서 제외해야 한다면 실제 조건부 렌더링을 사용하거나 별도
`displayWhen` 규칙을 메타데이터에 추가한다.

RHF는 언마운트된 필드 값을 기본적으로 유지할 수 있다. 화면에서 제거할 때 값도
삭제해야 한다면 `unregister(fieldName)` 또는 `shouldUnregister` 정책을 별도로
결정한다.

---

## 22. 마이그레이션 순서

한 번에 전체 화면을 바꾸지 않고 다음 순서로 진행한다.

1. `createConditionDisplayRows.js` 순수 함수와 단위 테스트를 추가한다.
2. `ConditionCollectorProvider`를 추가한다.
3. `ConditionFormItem`을 추가한다.
4. `SearchForm`을 `FormProvider`로 감싼다.
5. `SearchFormContent`를 Provider 내부 컴포넌트로 분리한다.
6. 한 카테고리만 `ConditionCategory`와 `ConditionCategoryItem`으로 감싼다.
7. 해당 카테고리의 `Form.Item`을 `ConditionFormItem`으로 교체한다.
8. 모달 미리보기에서 신규 `collect()` 결과를 확인한다.
9. 기본 FormItem을 모두 교체한다.
10. 스타일 FormItem의 베이스를 `ConditionFormItem`으로 교체한다.
11. Checkbox, Checkbox.Group, DatePicker, RangePicker를 각각 검증한다.
12. 서버 데이터 `reset()` 후 결과를 검증한다.
13. 모달 snapshot과 API payload를 검증한다.
14. 모든 필드가 전환된 후 기존 `createSearchConditionRows(searchCategories, values)`
    호출을 제거한다.

화면 렌더링을 위해 `searchCategories`를 계속 사용해도 된다. 단, 저장용
메타데이터를 만드는 책임은 렌더링된 `ConditionFormItem`으로 이동한다.

---

## 23. 필수 테스트 케이스

### 라벨이 있는 필드

```js
{
  label: "담당부서",
  value: "DEV",
  expectedDisplay: "개발팀",
}
```

### 라벨 없는 필드 두 개

```js
{
  categoryLabel: "검색어",
  values: {
    keyword: "장애 대응",
    searchTarget: "TITLE_CONTENT",
  },
  expectedDisplay:
    "장애 대응 / 제목 + 내용",
}
```

### 단일 Checkbox 체크

```js
{
  rawValue: true,
  expectedStoredValue: true,
  expectedDisplay:
    "첨부파일이 있는 게시물만 조회",
}
```

### 단일 Checkbox 체크 해제

```js
{
  rawValue: false,
  expectedStoredValue: false,
  expectedDisplayRows: [],
}
```

### Checkbox.Group

```js
{
  rawValue: [
    "READY",
    "COMPLETE",
  ],
  expectedDisplay: "대기, 완료",
}
```

### DatePicker

```js
{
  rawValue: dayjs("2026-07-31"),
  expectedDisplay: "2026-07-31",
  expectedStoredValue: "2026-07-31",
}
```

### 서버 데이터 반영

1. 최초 렌더링
2. 서버 응답 도착
3. `reset(serverValues)` 실행
4. 사용자가 값 변경
5. `collect()` 실행
6. 사용자 변경까지 포함한 최신 값인지 확인

---

## 24. 완료 조건

- 모든 조회조건 영역이 `FormProvider` 내부에 있다.
- 각 FormItem이 `ConditionFormItem` 또는 이를 기반으로 한 스타일 컴포넌트다.
- `ConditionFormItem`은 RHF 값을 별도 state/ref에 복제하지 않는다.
- FormItem 라벨이 있는 필드는 독립된 모달 행으로 표시된다.
- 무라벨 필드는 동일한 category-item 안에서 `/`로 결합된다.
- Checkbox.Group 값은 `,`로 결합된다.
- 단일 Checkbox의 `false`는 API 원본 값에 저장된다.
- 단일 Checkbox의 `false`는 모달에는 표시되지 않는다.
- 단일 Checkbox의 `true`는 Checkbox 내부 문자열로 표시된다.
- DatePicker 값은 모달과 API에서 각각 올바르게 변환된다.
- 서버 데이터는 `reset()` 또는 `setValue()`로 RHF에 반영된다.
- 모달은 메타데이터가 아니라 변환 완료된 `displayValues`를 받는다.
- 저장 payload는 `values`와 `displayValues`를 분리한다.
