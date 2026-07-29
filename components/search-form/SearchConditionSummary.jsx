"use client";

import { Descriptions, Empty, Typography } from "antd";

const { Text } = Typography;

export default function SearchConditionSummary({ items }) {
  if (items.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="저장할 조회조건이 없습니다."
        className="condition-summary-empty"
      />
    );
  }

  const descriptionItems = items.map(({ key, label, displayValue }) => ({
    key,
    label: <Text className="condition-summary-label">{label}</Text>,
    children: <Text>{displayValue}</Text>,
  }));

  return (
    <Descriptions
      bordered
      column={1}
      size="small"
      items={descriptionItems}
      className="condition-summary"
    />
  );
}
