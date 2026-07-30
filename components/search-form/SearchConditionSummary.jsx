"use client";

import { Descriptions, Empty, Typography } from "antd";

const { Text } = Typography;

/**
 * 저장 확인 모달에서 값이 입력된 조회조건만 왼쪽 라벨/오른쪽 값 형태로 출력한다.
 *
 * Ant Design Table 대신 Descriptions를 사용한 이유는 상단 컬럼 헤더가 없는
 * 2열 요약 구조가 목적이기 때문이다. items는 SearchForm에서 이미 빈 값을 제외하고
 * 화면 표시 라벨로 변환한 결과이므로 이 컴포넌트는 출력 책임만 가진다.
 *
 * 사용 예:
 * <SearchConditionSummary
 *   items={[{ key: "status", label: "처리상태", displayValue: "대기, 완료" }]}
 * />
 */
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

  // column={1}인 Descriptions의 각 항목은 라벨 셀과 값 셀을 한 행에 만든다.
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
