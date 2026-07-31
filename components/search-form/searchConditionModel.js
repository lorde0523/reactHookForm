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

function formatFieldValue(field, value) {
  if (field.formatValue) {
    return field.formatValue(value);
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

  return field.shouldDisplay ? field.shouldDisplay(value, values) : true;
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

export function serializeSearchValues(schema, values) {
  return Object.fromEntries(
    getSearchFields(schema).map((field) => [
      field.name,
      field.serialize
        ? field.serialize(values[field.name], values)
        : serializeValue(values[field.name]),
    ]),
  );
}

/**
 * 서버에서 받은 일부 또는 전체 조회조건을 RHF 입력 타입으로 복원한다.
 * 여러 setValue 호출 대신 reset에 한 번 전달할 완성 객체를 반환한다.
 */
export function hydrateSearchValues(schema, serverValues, defaultValues) {
  return Object.fromEntries(
    getSearchFields(schema).map((field) => {
      const serverValue = serverValues?.[field.name];
      const value =
        serverValue === undefined ? defaultValues[field.name] : serverValue;

      return [
        field.name,
        field.hydrate ? field.hydrate(value, serverValues) : value,
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
          rawValue: values[field.name],
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
