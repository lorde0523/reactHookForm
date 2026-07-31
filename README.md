# Easy RHF + Ant Design Search Conditions

기존 Ant Design 입력 컴포넌트는 그대로 사용하면서 조회조건의 데이터 제어만
React Hook Form으로 통합한 공통 조회조건 폼입니다.

화면 개발자가 알아야 하는 컴포넌트는 세 개뿐입니다.

- `ConditionForm`: 초기값, 서버 로딩, 조회, 초기화, 저장 모달 담당
- `ConditionGroup`: 화면 왼쪽 카테고리 라벨
- `ConditionField`: RHF 필드명, Form.Item 라벨, 기본값 선언

`Controller`, `FormProvider`, `useFormContext`, `setValue 반복 호출`, 날짜 변환,
모달용 데이터 생성은 공통 엔진 내부에만 있습니다.

## 가장 간단한 사용법

```jsx
import { Checkbox, DatePicker, Input, Select } from "antd";
import dayjs from "dayjs";
import {
  ConditionField,
  ConditionForm,
  ConditionGroup,
} from "./components/search-form";

const { RangePicker } = DatePicker;

export default function NoticeSearch() {
  return (
    <ConditionForm
      loadValues={loadSavedCondition}
      onSearch={searchNotices}
      onSave={saveCondition}
    >
      <ConditionGroup label="검색어">
        <ConditionField name="keyword" defaultValue="">
          <Input placeholder="검색어" />
        </ConditionField>

        <ConditionField name="target" defaultValue="TITLE">
          <Select options={targetOptions} />
        </ConditionField>
      </ConditionGroup>

      <ConditionGroup label="등록기간">
        <ConditionField
          name="registeredRange"
          label="등록기간"
          valueType="dateRange"
          defaultValue={() => [dayjs().subtract(29, "day"), dayjs()]}
        >
          <RangePicker />
        </ConditionField>

        <ConditionField
          name="hasAttachment"
          label="첨부파일"
          defaultValue={false}
          valuePropName="checked"
          checkedText="첨부파일이 있는 게시물만 조회"
        >
          <Checkbox>첨부파일이 있는 게시물만 조회</Checkbox>
        </ConditionField>
      </ConditionGroup>
    </ConditionForm>
  );
}
```

Ant `Input`, `Select`, `Checkbox.Group`, `Radio.Group`, `InputNumber`,
`DatePicker`, `RangePicker`의 서로 다른 `onChange` 형식은 자동으로 RHF 값으로
변환됩니다.

## API 연결

```jsx
async function loadSavedCondition({ signal }) {
  const response = await fetch("/api/search-conditions/default", { signal });
  return response.json();
}

async function searchNotices(values) {
  // RangePicker는 ["2026-07-01", "2026-07-31"]로 변환됩니다.
  // 체크 해제된 단일 Checkbox도 false로 포함됩니다.
  const response = await fetch("/api/notices/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });

  return response.json();
}

async function saveCondition(payload) {
  await fetch("/api/search-conditions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
```

`onSave`에는 원본 저장 값과 모달 표시 값이 같은 시점의 snapshot으로 전달됩니다.

```js
{
  name: "이번 달 장애 조회",
  values: {
    keyword: "장애",
    target: "TITLE",
    registeredRange: ["2026-07-01", "2026-07-31"],
    hasAttachment: false
  },
  displayValues: [
    {
      names: ["keyword", "target"],
      label: "검색어",
      displayValue: "장애 / 제목"
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

`hasAttachment: false`는 `values`에는 저장되고 모달의 `displayValues`에서만
제외됩니다.

## 서버 조회 후 원하는 시점에 값 변경

서버 기본 조회는 `loadValues`만 전달하면 `reset()` 한 번으로 적용됩니다.
저장조건 선택처럼 외부 이벤트로 변경해야 할 때는 ref API를 사용합니다.

`loadValues`를 인라인 함수로 작성해도 부모 리렌더링만으로 재조회하지 않습니다.
사용자나 저장조건 ID가 바뀌어 다시 불러와야 할 때는 해당 값을 `loadKey`로 전달합니다.

```jsx
<ConditionForm
  loadKey={selectedConditionId}
  loadValues={() => loadCondition(selectedConditionId)}
  onSearch={searchNotices}
>
  {/* fields */}
</ConditionForm>
```

```jsx
const conditionFormRef = useRef(null);

<ConditionForm ref={conditionFormRef} onSearch={searchNotices}>
  {/* fields */}
</ConditionForm>

conditionFormRef.current.setValue("keyword", "긴급");
conditionFormRef.current.reset(serverCondition);
conditionFormRef.current.resetToDefaults();
conditionFormRef.current.openSaveModal();
```

외부 코드에서 `useFormContext`를 호출하지 않으므로 Provider 밖에서 호출하여 생기는
`control is null` 오류가 없습니다.

## 스타일 Form.Item 사용

모든 필드에 공통 스타일 FormItem을 적용할 수 있습니다.

```jsx
<ConditionForm
  components={{ FormItem: StyledFormItem }}
  onSearch={searchNotices}
>
  {/* fields */}
</ConditionForm>
```

특정 필드만 다른 FormItem을 사용할 수도 있습니다.

```jsx
<ConditionField
  name="keyword"
  defaultValue=""
  as={CompactFormItem}
  formItemProps={{ required: true }}
>
  <Input />
</ConditionField>
```

`StyledFormItem`과 `CompactFormItem`은 내부에서 Ant Design `Form.Item`을 반환하는
기존 스타일 컴포넌트를 그대로 사용할 수 있습니다.

표준 Ant 컴포넌트와 다른 `onChange` 구조를 가진 사내 컴포넌트도 필드 한 곳에서
정규화할 수 있습니다.

```jsx
<ConditionField
  name="employee"
  defaultValue={null}
  getValueFromEvent={(employee, meta) => ({
    id: employee.id,
    source: meta.source,
  })}
>
  <EmployeePicker />
</ConditionField>
```

## 표시 규칙

라벨이 있는 필드는 모달에서 독립된 행이 됩니다.

```jsx
<ConditionField name="department" label="담당부서">
  <Select options={departmentOptions} />
</ConditionField>
```

라벨이 없는 필드는 같은 Group 안에서 `/`로 합쳐집니다.

```text
검색어 | 장애 / 제목 + 내용
```

조건에 따라 모달 표시 여부를 제어하려면 `showWhen`만 추가합니다.

```jsx
<ConditionField
  name="target"
  showWhen={(_value, allValues) => Boolean(allValues.keyword)}
>
  <Select options={targetOptions} />
</ConditionField>
```

같은 카테고리 안에서 슬래시 묶음을 분리해야 할 때만 `ConditionItem`을 사용합니다.

상세한 마이그레이션 과정은
[공통 ConditionForm 마이그레이션 가이드](docs/search-condition-provider-migration.md)를
참고하세요.

## 검증

```bash
npm run lint
npm test
```
