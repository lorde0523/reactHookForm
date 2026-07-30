"use client";

import { Form } from "antd";
import { useController } from "react-hook-form";

export default function ControlledFormItem({
  name,
  control,
  rules,
  children,
  formItemProps = {},
  formItemClassName = "controlled-form-item",
}) {
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
      {children({ field, fieldState })}
    </Form.Item>
  );
}
