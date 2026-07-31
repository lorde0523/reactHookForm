# 레거시 조회폼을 공통 ConditionForm으로 바꾸는 방법

## 1. 목표

레거시 화면의 `Form`, `Form.Item`, `Row`, `Col` 기반 레이아웃과 Ant Design 입력
컴포넌트는 유지합니다. 다음 반복 코드만 공통 엔진으로 이동합니다.

- 화면마다 반복되는 `useForm`, `FormProvider`, `Controller`
- Input, Select, Checkbox, DatePicker마다 다른 `onChange` 연결
- 서버 조회조건을 필드별 `setValue`로 반복 적용하는 코드
- 날짜의 `dayjs` 복원과 서버 문자열 변환
- Form.Item 라벨을 별도 저장 메타데이터에 복사하는 코드
- 조회조건 저장 모달을 열 때 표시 데이터를 다시 조립하는 코드

마이그레이션 후 화면 개발자는 `ConditionGroup`, `ConditionField`, 기존 Ant 입력
컴포넌트만 작성합니다.

## 2. 변경 전

```jsx
const methods = useForm({
  defaultValues: {
    keyword: "",
    department: undefined,
    registeredRange: null,
    hasAttachment: false,
  },
});

useEffect(() => {
  getSavedCondition().then((values) => {
    methods.setValue("keyword", values.keyword);
    methods.setValue("department", values.department);
    methods.setValue(
      "registeredRange",
      values.registeredRange?.map(dayjs),
    );
    methods.setValue("hasAttachment", values.hasAttachment);
  });
}, [methods]);

return (
  <FormProvider {...methods}>
    <Form onFinish={methods.handleSubmit(search)}>
      <Row>
        <Col className="flex-group">
          <div className="category-name">검색어</div>
          <Row className="category-list">
            <Col className="category-item">
              <Controller
                name="keyword"
                control={methods.control}
                render={({ field }) => (
                  <Form.Item>
                    <Input {...field} />
                  </Form.Item>
                )}
              />
            </Col>
          </Row>
        </Col>
      </Row>
    </Form>
  </FormProvider>
);
```

이 구조에서는 새 필드 하나를 추가할 때 기본값, Controller, 서버 복원, 직렬화,
모달 표시 메타데이터를 여러 위치에 수정하게 됩니다.

## 3. 변경 후

```jsx
import {
  ConditionField,
  ConditionForm,
  ConditionGroup,
} from "@/components/search-form";

export default function SearchArea() {
  return (
    <ConditionForm
      loadValues={getSavedCondition}
      onSearch={search}
      onSave={saveCondition}
    >
      <ConditionGroup label="검색어">
        <ConditionField name="keyword" defaultValue="">
          <Input />
        </ConditionField>
      </ConditionGroup>
    </ConditionForm>
  );
}
```

`ConditionForm` 내부에서 실제로 Ant `Form`, `Form.Item`, `Row`, `Col`을 렌더링하므로
기존 CSS 선택자와 레이아웃을 유지할 수 있습니다.

## 4. 필드별 변환 예시

### Input

```jsx
<ConditionField name="keyword" defaultValue="">
  <Input allowClear placeholder="검색어" />
</ConditionField>
```

Input의 `event.target.value`는 자동으로 RHF 값으로 변환됩니다.

### Select

```jsx
<ConditionField name="department" label="담당부서">
  <Select allowClear options={departmentOptions} />
</ConditionField>
```

`options`는 Select에서 자동으로 읽습니다. 모달에는 코드값 `PLATFORM_DEV` 대신
옵션 라벨 `플랫폼개발팀`이 표시됩니다.

### Checkbox.Group

```jsx
<ConditionField
  name="status"
  defaultValue={["READY", "IN_PROGRESS"]}
>
  <Checkbox.Group options={statusOptions} />
</ConditionField>
```

배열 값과 옵션 라벨 변환을 자동 처리합니다.

### 단일 Checkbox

```jsx
<ConditionField
  name="hasAttachment"
  label="첨부파일"
  defaultValue={false}
  valuePropName="checked"
  checkedText="첨부파일이 있는 게시물만 조회"
>
  <Checkbox>첨부파일이 있는 게시물만 조회</Checkbox>
</ConditionField>
```

- 체크: `values.hasAttachment === true`
- 체크 해제: `values.hasAttachment === false`
- 저장 모달: true일 때만 `checkedText` 표시
- DB/API 저장값: false도 제거하지 않고 전달

### DatePicker

```jsx
<ConditionField
  name="registeredDate"
  label="등록일"
  valueType="date"
  defaultValue={null}
>
  <DatePicker />
</ConditionField>
```

`valueType="date"` 하나로 다음 변환이 적용됩니다.

- 서버 문자열 `"2026-07-31"` → DatePicker용 dayjs
- 조회/저장 시 dayjs → `"2026-07-31"`
- 모달 표시 → `2026-07-31`

### RangePicker

```jsx
<ConditionField
  name="registeredRange"
  label="등록기간"
  valueType="dateRange"
  defaultValue={() => [dayjs().subtract(29, "day"), dayjs()]}
>
  <DatePicker.RangePicker />
</ConditionField>
```

`valueType="dateRange"`가 서버 복원, 직렬화, `시작일 ~ 종료일` 표시까지 처리합니다.

### InputNumber

```jsx
<ConditionField
  name="minimumViews"
  label="최소 조회수"
  defaultValue={null}
  formatValue={(value) => `${value.toLocaleString()}회 이상`}
>
  <InputNumber min={0} />
</ConditionField>
```

InputNumber는 숫자를 첫 번째 인자로 전달하므로 추가 연결 코드가 없습니다.

## 5. 서버 데이터 조회와 초기화

```jsx
<ConditionForm
  loadValues={async ({ signal }) => {
    const response = await fetch("/api/search-conditions/default", { signal });
    return response.json();
  }}
  onSearch={search}
>
  {/* fields */}
</ConditionForm>
```

서버가 일부 필드만 반환해도 나머지는 각 `ConditionField.defaultValue`로 채웁니다.
완성된 객체를 RHF `reset()`에 한 번 전달하므로 여러 `setValue()` 호출보다 렌더링이
적고, 서버 응답이 적용되는 시점도 하나로 고정됩니다.

부모 리렌더링은 서버 재조회를 발생시키지 않습니다. 선택한 저장조건처럼 조회 기준이
바뀌어 다시 로드해야 한다면 명시적인 `loadKey`를 함께 전달합니다.

```jsx
<ConditionForm
  loadKey={selectedConditionId}
  loadValues={() => getSavedCondition(selectedConditionId)}
  onSearch={search}
>
  {/* fields */}
</ConditionForm>
```

```js
// 서버 응답
{
  keyword: "장애",
  registeredRange: ["2026-07-01", "2026-07-31"],
  hasAttachment: false
}
```

## 6. 조회

```jsx
<ConditionForm
  onSearch={async (values) => {
    await searchApi(values);
  }}
>
  {/* fields */}
</ConditionForm>
```

`onSearch`에는 JSON 전송 가능한 값이 들어옵니다. `false`, `0`, 빈 배열도 필드 값으로
보존되며 날짜만 문자열로 변환됩니다.

## 7. 저장 모달과 DB 저장

`onSave`가 있으면 저장 버튼과 모달이 자동으로 활성화됩니다.

```jsx
<ConditionForm
  onSearch={searchApi}
  onSave={async (payload) => {
    await saveConditionApi(payload);
  }}
>
  {/* fields */}
</ConditionForm>
```

모달을 여는 순간 `getValues()`를 한 번 읽어 다음 snapshot을 만듭니다.

```js
{
  name: "장애 게시물",
  values: {
    keyword: "장애",
    target: "TITLE_CONTENT",
    hasAttachment: false
  },
  displayValues: [
    {
      names: ["keyword", "target"],
      label: "검색어",
      displayValue: "장애 / 제목 + 내용"
    }
  ],
  savedAt: "2026-07-31T..."
}
```

모달을 연 뒤 폼 값이 바뀌더라도 확인 중인 snapshot은 변하지 않습니다. 모달을 다시
열면 최신 RHF 값으로 새 snapshot을 생성합니다.

## 8. 라벨과 슬래시 표시 규칙

`label`이 있는 필드는 독립된 행입니다.

```jsx
<ConditionField name="department" label="담당부서">
  <Select options={departmentOptions} />
</ConditionField>
```

```text
담당부서 | 플랫폼개발팀
```

`label`이 없는 필드는 같은 Group/Item 단위로 합쳐집니다.

```jsx
<ConditionGroup label="검색어">
  <ConditionField name="keyword"><Input /></ConditionField>
  <ConditionField name="target"><Select options={targetOptions} /></ConditionField>
</ConditionGroup>
```

```text
검색어 | 장애 / 제목 + 내용
```

한 카테고리에서 서로 다른 슬래시 묶음이 필요할 때만 `ConditionItem`을 추가합니다.

```jsx
<ConditionGroup label="기간">
  <ConditionItem>
    <ConditionField name="start"><DatePicker /></ConditionField>
    <ConditionField name="end"><DatePicker /></ConditionField>
  </ConditionItem>

  <ConditionItem>
    <ConditionField name="baseType"><Select /></ConditionField>
  </ConditionItem>
</ConditionGroup>
```

## 9. 조건부 표시

값은 조회/저장하되 모달 표시 여부만 결정하려면 `showWhen`을 사용합니다.

```jsx
<ConditionField
  name="target"
  defaultValue="TITLE_CONTENT"
  showWhen={(_value, values) => Boolean(values.keyword?.trim())}
>
  <Select options={targetOptions} />
</ConditionField>
```

## 10. 스타일 FormItem 호환

기존 스타일 컴포넌트가 Ant `Form.Item`에 className이나 props를 추가한 형태라면 그대로
사용할 수 있습니다.

```jsx
function StyledFormItem(props) {
  return <Form.Item {...props} className={`legacy-item ${props.className ?? ""}`} />;
}
```

전체 적용:

```jsx
<ConditionForm components={{ FormItem: StyledFormItem }}>
  {/* fields */}
</ConditionForm>
```

필드별 적용:

```jsx
<ConditionField name="keyword" as={CompactFormItem}>
  <Input />
</ConditionField>
```

스타일 FormItem이 여러 개 있어도 데이터 로직은 동일한 `ConditionField`가 담당합니다.

## 11. 외부 이벤트에서 값 변경

저장된 조건 목록에서 특정 조건을 선택하는 것처럼 폼 외부에서 값 변경이 필요하면 ref를
사용합니다.

```jsx
const formRef = useRef(null);

<ConditionForm ref={formRef} onSearch={searchApi}>
  {/* fields */}
</ConditionForm>
```

```js
formRef.current.setValue("keyword", "긴급");
formRef.current.reset(serverValues);
formRef.current.resetToDefaults();
formRef.current.openSaveModal();
const currentValues = formRef.current.getValues();
```

`ConditionForm`이 Provider를 내부에서 생성하므로 외부 컴포넌트에서 `useFormContext()`를
호출할 필요가 없고 `control is null` 문제도 발생하지 않습니다.

## 12. 특수 필드

공통 규칙으로 처리할 수 없는 사내 컴포넌트만 다음 확장 props를 사용합니다.

```jsx
<ConditionField
  name="customCode"
  defaultValue={null}
  serialize={(value) => value?.code}
  hydrate={(serverValue) => findOption(serverValue)}
  formatValue={(value) => value?.label}
  showWhen={(value) => Boolean(value)}
  getValueFromEvent={(selectedItem) => selectedItem}
>
  <CompanyCodePicker />
</ConditionField>
```

입력 컴포넌트의 `onChange` 첫 번째 인자가 실제 값이면 별도 연결이 필요 없습니다.
이벤트 구조가 완전히 다를 때만 `getValueFromEvent`로 RHF에 저장할 값을 반환합니다.

## 13. 마이그레이션 순서

1. 기존 조회 API와 저장 API 함수는 유지합니다.
2. 화면 최상단의 `useForm`, `FormProvider`, 필드별 `Controller`를 제거합니다.
3. 기존 카테고리 단위를 `ConditionGroup`으로 바꿉니다.
4. 각 Ant 입력을 `ConditionField`로 감싸고 `name`, `defaultValue`를 옮깁니다.
5. DatePicker에 `valueType="date"` 또는 `dateRange`를 지정합니다.
6. 단일 Checkbox에 `valuePropName="checked"`를 지정합니다.
7. 기존 스타일 FormItem은 `components.FormItem` 또는 `as`로 연결합니다.
8. 서버 초기 조회 함수를 `loadValues`, 조회 함수를 `onSearch`, 저장 함수를 `onSave`에
   연결합니다.
9. 필드별 `setValue`, 날짜 변환, 모달 메타데이터 조립 코드를 삭제합니다.
10. false, 0, 빈 배열, 날짜 범위, 라벨 없는 다중 필드 저장 결과를 검증합니다.

## 14. 파일 역할

| 파일 | 역할 |
| --- | --- |
| `ConditionForm.jsx` | RHF, Form 렌더링, 조회/초기화/모달/저장 흐름 |
| `conditionDsl.js` | Group/Item/Field 선언 해석과 Ant onChange 값 정규화 |
| `searchConditionModel.js` | hydrate, serialize, 표시 행, snapshot 순수 함수 |
| `SearchConditionSaveModal.jsx` | 저장 이름과 표시용 조회조건 출력 |
| `SearchForm.jsx` | 공통 컴포넌트를 사용하는 실제 예제 |

이 구조의 핵심은 화면 개발자가 RHF 연결 코드를 작성하지 않는다는 점입니다. 새 필드를
추가할 때 변경 지점은 해당 `ConditionField` 선언 한 곳뿐입니다.
