"use client";

import { Form } from "antd";
import { Controller, useFormState } from "react-hook-form";

function getFieldError(errors, name) {
  return name
    .split(".")
    .reduce((current, path) => current?.[path], errors);
}

export default function ControlledFormItem({
  name,
  control,
  rules,
  children,
  formItemProps = {},
  formItemClassName = "controlled-form-item",
}) {
  const { errors } = useFormState({ control, name });
  const fieldError = getFieldError(errors, name);

  return (
    <Form.Item
      {...formItemProps}
      className={formItemClassName}
      validateStatus={
        fieldError ? "error" : formItemProps.validateStatus
      }
      help={fieldError?.message ?? formItemProps.help}
    >
      <Controller
        name={name}
        control={control}
        rules={rules}
        render={children}
      />
    </Form.Item>
  );
}
