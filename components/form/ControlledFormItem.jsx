"use client";

import { Form } from "antd";
import { useController } from "react-hook-form";

/**
 * Ant Design 입력 컴포넌트를 RHF 필드로 연결하는 공통 Form.Item이다.
 *
 * 사용 예:
 * <ControlledFormItem name="status" control={control} rules={{ required: true }}>
 *   {({ field, fieldState }) => (
 *     <Select
 *       value={field.value}
 *       onChange={field.onChange}
 *       onBlur={field.onBlur}
 *       status={fieldState.invalid ? "error" : undefined}
 *     />
 *   )}
 * </ControlledFormItem>
 *
 * Input처럼 value/onChange 규격이 같은 컴포넌트는 <Input {...field} />로 연결해도
 * 된다. Select, DatePicker, Checkbox, Switch처럼 이벤트나 값 속성이 다른 경우에는
 * value(또는 checked)와 field.onChange를 명시적으로 연결해야 RHF 값이 변경된다.
 *
 * Form.Item에는 name을 전달하지 않는다. Ant Design Form과 RHF가 동시에 같은 값을
 * 관리하면 상태의 출처가 두 개가 되므로, Form.Item은 레이아웃과 오류 표시만 맡고
 * 실제 값과 검증 상태는 RHF가 단독으로 관리한다.
 */
export default function ControlledFormItem({
  name,
  control,
  rules,
  children,
  formItemProps = {},
  formItemClassName = "controlled-form-item",
}) {
  // Controller 컴포넌트를 한 번 더 중첩하지 않고 훅을 직접 사용한다.
  // field와 fieldState를 같은 필드 구독에서 받아 값 연결과 오류 표시를 함께 처리한다.
  const { field, fieldState } = useController({
    name,
    control,
    rules,
  });

  return (
    <Form.Item
      {...formItemProps}
      className={formItemClassName}
      validateStatus={
        fieldState.invalid ? "error" : formItemProps.validateStatus
      }
      help={fieldState.error?.message ?? formItemProps.help}
    >
      {/* render prop으로 컴포넌트별 value/onChange 규격을 호출부에서 연결한다. */}
      {children({ field, fieldState })}
    </Form.Item>
  );
}
