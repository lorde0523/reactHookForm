/**
 * 저장 확인 목록에서 제외할 "입력되지 않은 값"의 공통 기준이다.
 * false와 0은 원본 조회조건으로 저장할 수 있으므로 빈 값으로 처리하지 않는다.
 */
export function isEmptyValue(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

function findOptionLabel(options, value) {
  return (
    options?.find((option) => String(option.value) === String(value))?.label ??
    String(value)
  );
}

function formatFieldValue(metadata, value) {
  if (metadata.formatValue) {
    return metadata.formatValue(value);
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => findOptionLabel(metadata.options, item))
      .join(", ");
  }

  if (metadata.options?.length) {
    return findOptionLabel(metadata.options, value);
  }

  return String(value);
}

function createFieldPreview(metadata, getValue) {
  const rawValue = getValue(metadata.name);

  // 단일 Checkbox의 false는 원본 values에는 남지만 저장 확인 화면에서는 숨긴다.
  if (metadata.controlType === "single-checkbox" && rawValue !== true) {
    return null;
  }

  if (isEmptyValue(rawValue)) {
    return null;
  }

  return {
    ...metadata,
    rawValue,
    displayValue:
      metadata.controlType === "single-checkbox"
        ? metadata.checkedLabel
        : formatFieldValue(metadata, rawValue),
  };
}

/**
 * 렌더링된 ConditionFormItem 메타데이터와 RHF 최신 값을 모달 표시용 행으로 바꾼다.
 *
 * - label이 있는 FormItem은 자신의 label로 한 행을 만든다.
 * - label이 없는 FormItem은 같은 category-item 안에서 categoryLabel로 묶는다.
 * - 단일 Checkbox는 true일 때만 내부 문자열을 표시한다.
 */
export function createConditionDisplayRows(metadataList, getValue) {
  const groups = new Map();

  metadataList.forEach((metadata, index) => {
    const groupKey = `${metadata.categoryKey}:${metadata.itemKey}`;
    const group = groups.get(groupKey) ?? [];

    group.push({ ...metadata, index });
    groups.set(groupKey, group);
  });

  return Array.from(groups.values()).flatMap((group) => {
    const fields = group
      .map((metadata) => createFieldPreview(metadata, getValue))
      .filter(Boolean);
    const rows = fields
      .filter(({ label }) => Boolean(label))
      .map((field) => ({
        index: field.index,
        key: field.name,
        names: [field.name],
        label: field.label,
        rawValues: { [field.name]: field.rawValue },
        displayValue: field.displayValue,
      }));
    const unlabeledFields = fields.filter(({ label }) => !label);

    if (unlabeledFields.length > 0) {
      const firstField = unlabeledFields[0];

      rows.push({
        index: firstField.index,
        key: `${firstField.categoryKey}:${firstField.itemKey}:unlabeled`,
        names: unlabeledFields.map(({ name }) => name),
        label: firstField.categoryLabel,
        rawValues: Object.fromEntries(
          unlabeledFields.map(({ name, rawValue }) => [name, rawValue]),
        ),
        displayValue: unlabeledFields
          .map(({ displayValue }) => displayValue)
          .join(" / "),
      });
    }

    return rows
      .sort((left, right) => left.index - right.index)
      .map(({ key, names, label, rawValues, displayValue }) => ({
        key,
        names,
        label,
        rawValues,
        displayValue,
      }));
  });
}
