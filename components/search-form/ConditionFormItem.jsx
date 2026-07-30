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
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(getReactNodeText).filter(Boolean).join(" ");
  }

  if (isValidElement(node)) {
    return getReactNodeText(node.props.children);
  }

  return "";
}

/**
 * Ant Design Form.Item의 props와 스타일 사용법을 유지하면서 조회조건 메타데이터를
 * Provider에 등록한다. styled(Form.Item) 대신 styled(ConditionFormItem)으로도
 * 사용할 수 있다.
 */
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
  const { register } = useConditionCollector();
  const child = Children.only(children);
  const displayLabel = conditionLabel ?? formItemProps.label ?? null;
  const resolvedCheckedLabel = useMemo(() => {
    if (controlType !== "single-checkbox") {
      return null;
    }

    if (checkedLabel) {
      return checkedLabel;
    }

    return isValidElement(child)
      ? getReactNodeText(child.props.children)
      : "";
  }, [checkedLabel, child, controlType]);

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

  return <Form.Item {...formItemProps}>{children}</Form.Item>;
}
