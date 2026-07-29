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

`SearchField`에 전달한 `label`과 `options`는 입력 컴포넌트와 저장 확인
테이블에서 함께 사용됩니다. 별도의 `searchConfig`에 같은 옵션을 다시 작성하지
않습니다.

```jsx
<SearchField
  name="status"
  label="처리상태"
  control={control}
  options={statusOptions}
>
  {({ field, options }) => (
    <Checkbox.Group
      value={field.value}
      onChange={field.onChange}
      options={options}
    />
  )}
</SearchField>
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
      name: "status",
      label: "처리상태",
      displayValue: "대기, 처리중"
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
