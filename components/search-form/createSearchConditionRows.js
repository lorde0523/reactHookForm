/**
 * 저장 목록에서 제외할 "입력되지 않은 값"의 공통 기준이다.
 * false와 0은 사용자가 선택할 수 있는 값이므로 빈 값으로 처리하지 않는다.
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

/**
 * RHF 원본 값을 저장 확인 화면용 문자열로 변환한다.
 * 변환 우선순위는 필드별 formatValue → options 라벨 → 원본 문자열이다.
 */
export function formatFieldValue(value, options, customFormatter) {
  if (isEmptyValue(value)) {
    return "전체";
  }

  if (customFormatter) {
    return customFormatter(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => findOptionLabel(options, item)).join(", ");
  }

  if (options?.length) {
    return findOptionLabel(options, value);
  }

  return String(value);
}

function createFieldPreview(fieldConfig, values, index) {
  const rawValue = values[fieldConfig.name];

  if (isEmptyValue(rawValue)) {
    return null;
  }

  return {
    index,
    name: fieldConfig.name,
    label: fieldConfig.label,
    rawValue,
    displayValue: formatFieldValue(
      rawValue,
      fieldConfig.options,
      fieldConfig.formatValue,
    ),
  };
}

/**
 * 카테고리/Form.Item 구조와 RHF 값을 저장 확인용 라벨-값 행으로 바꾼다.
 *
 * - label이 있는 Form.Item은 자신의 label로 한 행을 만든다.
 * - label이 없는 Form.Item은 같은 category-item 안에서 모아 categoryLabel을
 *   왼쪽 라벨로 쓰고, 각 값을 " / "로 연결한다.
 * - category.items가 없으면 category.fields 전체를 하나의 category-item으로 본다.
 */
export function createSearchConditionRows(categories, values) {
  return categories.flatMap((category) => {
    const categoryItems = category.items ?? [
      {
        key: "default-item",
        fields: category.fields ?? [],
      },
    ];

    return categoryItems.flatMap((categoryItem, itemIndex) => {
      const previews = (categoryItem.fields ?? [])
        .map((fieldConfig, fieldIndex) =>
          createFieldPreview(fieldConfig, values, fieldIndex),
        )
        .filter(Boolean);
      const unlabeledPreviews = previews.filter(({ label }) => !label);
      const rows = previews
        .filter(({ label }) => label)
        .map(({ index, name, label, rawValue, displayValue }) => ({
          index,
          key: name,
          names: [name],
          label,
          rawValues: { [name]: rawValue },
          displayValue,
        }));

      if (unlabeledPreviews.length > 0) {
        const itemKey = categoryItem.key ?? itemIndex;

        rows.push({
          index: unlabeledPreviews[0].index,
          key: `${category.key}-${itemKey}-unlabeled`,
          names: unlabeledPreviews.map(({ name }) => name),
          label: categoryItem.label ?? category.categoryLabel,
          rawValues: Object.fromEntries(
            unlabeledPreviews.map(({ name, rawValue }) => [name, rawValue]),
          ),
          displayValue: unlabeledPreviews
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
  });
}
