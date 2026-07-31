import { Children, Fragment, isValidElement } from "react";

const GROUP_ROLE = "search-condition-group";
const ITEM_ROLE = "search-condition-item";
const FIELD_ROLE = "search-condition-field";

/**
 * 아래 세 컴포넌트는 화면에 직접 DOM을 만들지 않는 선언용 컴포넌트다.
 * ConditionForm이 children을 한 번 읽어 Form/Row/Col/Form.Item 구조로 렌더링한다.
 */
export function ConditionGroup() {
  return null;
}
ConditionGroup.conditionRole = GROUP_ROLE;

export function ConditionItem() {
  return null;
}
ConditionItem.conditionRole = ITEM_ROLE;

export function ConditionField() {
  return null;
}
ConditionField.conditionRole = FIELD_ROLE;

function flattenChildren(children) {
  return Children.toArray(children).flatMap((child) => {
    if (isValidElement(child) && child.type === Fragment) {
      return flattenChildren(child.props.children);
    }

    return child;
  });
}

function readRole(element) {
  return isValidElement(element) ? element.type?.conditionRole : undefined;
}

function compileField(element, index) {
  const { children, ...field } = element.props;

  if (!field.name) {
    throw new Error("ConditionField에는 name이 필요합니다.");
  }

  const controls = flattenChildren(children).filter(isValidElement);

  if (controls.length !== 1) {
    throw new Error(
      `ConditionField '${field.name}'에는 입력 컴포넌트 하나만 넣어야 합니다.`,
    );
  }

  return {
    ...field,
    key: field.key ?? field.name,
    index,
    control: controls[0],
    options: field.options ?? controls[0].props.options,
  };
}

function compileItemProps(props, index) {
  const fields = flattenChildren(props.children)
    .filter((child) => readRole(child) === FIELD_ROLE)
    .map(compileField);

  return {
    key: props.itemKey ?? `item-${index}`,
    colProps: props.colProps,
    className: props.className,
    fields,
  };
}

/**
 * JSX 선언을 기존 searchConditionModel이 사용할 수 있는 정규화된 정의로 바꾼다.
 * 직접 배치한 Field들은 한 item으로 묶고, 슬래시 묶음을 나눌 때만 ConditionItem을 쓴다.
 */
export function compileConditionChildren(children) {
  const groups = flattenChildren(children)
    .filter((child) => readRole(child) === GROUP_ROLE)
    .map((group, groupIndex) => {
      const groupChildren = flattenChildren(group.props.children);
      const explicitItems = groupChildren.filter(
        (child) => readRole(child) === ITEM_ROLE,
      );
      const directFields = groupChildren.filter(
        (child) => readRole(child) === FIELD_ROLE,
      );

      if (explicitItems.length > 0 && directFields.length > 0) {
        throw new Error(
          `ConditionGroup '${group.props.label}'에서는 ConditionItem과 직접 Field 선언을 섞을 수 없습니다.`,
        );
      }

      const items =
        explicitItems.length > 0
          ? explicitItems.map((item, index) =>
              compileItemProps(item.props, index),
            )
          : [compileItemProps({ children: groupChildren }, 0)];

      return {
        key: group.props.groupKey ?? `group-${groupIndex}`,
        categoryLabel: group.props.label,
        colProps: group.props.colProps,
        rowProps: group.props.rowProps,
        className: group.props.className,
        items,
      };
    });

  const names = groups.flatMap((group) =>
    group.items.flatMap((item) => item.fields.map((field) => field.name)),
  );
  const duplicateName = names.find(
    (name, index) => names.indexOf(name) !== index,
  );

  if (duplicateName) {
    throw new Error(`중복된 조회조건 name입니다: ${duplicateName}`);
  }

  return groups;
}

export function getConditionDefaultValues(schema, overrides = {}) {
  return Object.fromEntries(
    schema.flatMap((group) =>
      group.items.flatMap((item) =>
        item.fields.map((field) => {
          const declared =
            typeof field.defaultValue === "function"
              ? field.defaultValue()
              : field.defaultValue;

          return [
            field.name,
            Object.hasOwn(overrides, field.name)
              ? overrides[field.name]
              : declared,
          ];
        }),
      ),
    ),
  );
}

/** Ant 컴포넌트마다 다른 onChange 모양을 RHF 값 하나로 정규화한다. */
export function extractConditionValue(args, valuePropName = "value") {
  const first = args[0];

  if (first?.target) {
    return valuePropName === "checked"
      ? first.target.checked
      : first.target.value;
  }

  return first;
}
