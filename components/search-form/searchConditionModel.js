import dayjs from "dayjs";

export function isEmptyValue(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function getSearchFields(schema) {
  return schema.flatMap((category) =>
    category.items.flatMap((item) => item.fields),
  );
}

function findOptionLabel(options, value) {
  return (
    options?.find((option) => String(option.value) === String(value))?.label ??
    String(value)
  );
}

function formatDate(value) {
  const date = dayjs(value);
  return date.isValid() ? date.format("YYYY-MM-DD") : "";
}

function formatFieldValue(field, value) {
  if (field.formatValue) {
    return field.formatValue(value);
  }

  if (field.valueType === "date") {
    return formatDate(value);
  }

  if (field.valueType === "dateRange") {
    return Array.isArray(value) ? value.map(formatDate).join(" ~ ") : "";
  }

  if (field.valuePropName === "checked") {
    return field.checkedText ?? field.control?.props?.children ?? String(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => findOptionLabel(field.options, item)).join(", ");
  }

  if (field.options?.length) {
    return findOptionLabel(field.options, value);
  }

  return String(value);
}

export function shouldDisplayField(field, value, values) {
  if (isEmptyValue(value)) {
    return false;
  }

  // 단일 체크박스의 false는 저장 데이터에는 남지만 확인 모달에는 표시하지 않는다.
  if (field.valuePropName === "checked" && value !== true) {
    return false;
  }

  const predicate = field.showWhen ?? field.shouldDisplay;
  return predicate ? predicate(value, values) : true;
}

function serializeValue(value) {
  if (dayjs.isDayjs(value)) {
    return value.format("YYYY-MM-DD");
  }

  if (Array.isArray(value) && value.every((item) => dayjs.isDayjs(item))) {
    return value.map((item) => item.format("YYYY-MM-DD"));
  }

  return value;
}

function serializeFieldValue(field, value, values) {
  if (field.serialize) {
    return field.serialize(value, values);
  }

  if (field.valueType === "date") {
    return value ? formatDate(value) : value;
  }

  if (field.valueType === "dateRange") {
    return Array.isArray(value) ? value.map(formatDate) : value;
  }

  return serializeValue(value);
}

export function serializeSearchValues(schema, values) {
  return Object.fromEntries(
    getSearchFields(schema).map((field) => [
      field.name,
      serializeFieldValue(field, values[field.name], values),
    ]),
  );
}

function hydrateFieldValue(field, value, serverValues) {
  if (field.hydrate) {
    return field.hydrate(value, serverValues);
  }

  if (field.valueType === "date") {
    return value ? dayjs(value) : value;
  }

  if (field.valueType === "dateRange") {
    return Array.isArray(value) ? value.map((item) => dayjs(item)) : value;
  }

  return value;
}

/** 서버의 일부 또는 전체 조회조건을 reset 한 번에 사용할 값으로 복원한다. */
export function hydrateSearchValues(schema, serverValues, defaultValues) {
  return Object.fromEntries(
    getSearchFields(schema).map((field) => {
      const serverValue = serverValues?.[field.name];
      const value =
        serverValue === undefined ? defaultValues[field.name] : serverValue;

      return [
        field.name,
        hydrateFieldValue(field, value, serverValues),
      ];
    }),
  );
}

export function createDisplayRows(schema, values) {
  return schema.flatMap((category) =>
    category.items.flatMap((item) => {
      const visibleFields = item.fields
        .filter((field) =>
          shouldDisplayField(field, values[field.name], values),
        )
        .map((field, index) => ({
          index,
          name: field.name,
          label: field.label,
          displayValue: formatFieldValue(field, values[field.name]),
        }));
      const rows = visibleFields
        .filter(({ label }) => Boolean(label))
        .map((field) => ({
          index: field.index,
          key: field.name,
          names: [field.name],
          label: field.label,
          displayValue: field.displayValue,
        }));
      const unlabeledFields = visibleFields.filter(({ label }) => !label);

      if (unlabeledFields.length > 0) {
        rows.push({
          index: unlabeledFields[0].index,
          key: `${category.key}:${item.key}:unlabeled`,
          names: unlabeledFields.map(({ name }) => name),
          label: category.categoryLabel,
          displayValue: unlabeledFields
            .map(({ displayValue }) => displayValue)
            .join(" / "),
        });
      }

      return rows
        .sort((left, right) => left.index - right.index)
        .map(({ key, names, label, displayValue }) => ({
          key,
          names,
          label,
          displayValue,
        }));
    }),
  );
}

export function createSearchSnapshot(schema, values) {
  return {
    values: serializeSearchValues(schema, values),
    displayValues: createDisplayRows(schema, values),
  };
}

export function countActiveSearchFields(schema, values) {
  return getSearchFields(schema).filter((field) =>
    shouldDisplayField(field, values[field.name], values),
  ).length;
}
