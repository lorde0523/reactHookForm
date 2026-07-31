"use client";

import {
  CalendarOutlined,
  CheckCircleFilled,
  DatabaseOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  Checkbox,
  DatePicker,
  Empty,
  Flex,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { useCallback, useState } from "react";
import ConditionForm from "./ConditionForm";
import {
  ConditionField,
  ConditionGroup,
} from "./conditionDsl";

const { RangePicker } = DatePicker;
const { Text } = Typography;

const searchTargetOptions = [
  { label: "제목 + 내용", value: "TITLE_CONTENT" },
  { label: "제목", value: "TITLE" },
  { label: "내용", value: "CONTENT" },
  { label: "작성자", value: "WRITER" },
];

const statusOptions = [
  { label: "대기", value: "READY" },
  { label: "처리중", value: "IN_PROGRESS" },
  { label: "완료", value: "COMPLETE" },
  { label: "반려", value: "REJECTED" },
];

const visibilityOptions = [
  { label: "전체", value: "ALL" },
  { label: "공개", value: "PUBLIC" },
  { label: "비공개", value: "PRIVATE" },
];

const departmentOptions = [
  { label: "서비스기획팀", value: "SERVICE_PLAN" },
  { label: "플랫폼개발팀", value: "PLATFORM_DEV" },
  { label: "고객지원팀", value: "CUSTOMER_SUPPORT" },
  { label: "경영지원팀", value: "MANAGEMENT_SUPPORT" },
];

const tagOptions = [
  { label: "공지", value: "NOTICE" },
  { label: "장애", value: "INCIDENT" },
  { label: "배포", value: "RELEASE" },
  { label: "정책", value: "POLICY" },
  { label: "문의", value: "QUESTION" },
];

/**
 * 실제 화면 개발자가 작성하는 부분이다.
 * Controller/onChange/hydrate/serialize 코드는 전혀 작성하지 않는다.
 */
const conditionFields = (
  <>
    <ConditionGroup label="검색어">
      <ConditionField
        name="keyword"
        defaultValue=""
        rules={{
          maxLength: {
            value: 100,
            message: "검색어는 100자 이하로 입력해 주세요.",
          },
        }}
      >
        <Input
          allowClear
          size="large"
          prefix={<SearchOutlined className="field-prefix" />}
          placeholder="제목, 내용 또는 작성자 검색"
          maxLength={100}
        />
      </ConditionField>

      <ConditionField
        name="searchTarget"
        defaultValue="TITLE_CONTENT"
        showWhen={(_value, values) => Boolean(values.keyword?.trim())}
      >
        <Select
          options={searchTargetOptions}
          size="large"
          className="field-full"
        />
      </ConditionField>
    </ConditionGroup>

    <ConditionGroup label="처리상태">
      <ConditionField
        name="status"
        defaultValue={["READY", "IN_PROGRESS"]}
      >
        <Checkbox.Group
          options={statusOptions}
          className="choice-group"
        />
      </ConditionField>

      <ConditionField
        name="visibility"
        defaultValue="ALL"
        showWhen={(value) => value !== "ALL"}
      >
        <Radio.Group
          options={visibilityOptions}
          optionType="button"
          buttonStyle="solid"
          className="radio-segment"
        />
      </ConditionField>
    </ConditionGroup>

    <ConditionGroup label="분류">
      <ConditionField
        name="department"
        label="담당부서"
        defaultValue={undefined}
      >
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder="담당부서 전체"
          options={departmentOptions}
          size="large"
          className="field-full"
        />
      </ConditionField>

      <ConditionField name="tags" label="업무 태그" defaultValue={[]}>
        <Select
          mode="multiple"
          allowClear
          placeholder="태그를 선택해 주세요"
          options={tagOptions}
          maxTagCount="responsive"
          size="large"
          className="field-full"
        />
      </ConditionField>
    </ConditionGroup>

    <ConditionGroup label="등록기간">
      <ConditionField
        name="registeredRange"
        label="등록기간"
        valueType="dateRange"
        defaultValue={() => [dayjs().subtract(29, "day"), dayjs()]}
      >
        <RangePicker
          format="YYYY-MM-DD"
          separator="→"
          allowClear
          size="large"
          className="field-full"
          prefix={<CalendarOutlined />}
          presets={[
            {
              label: "최근 7일",
              value: [dayjs().subtract(6, "day"), dayjs()],
            },
            {
              label: "최근 30일",
              value: [dayjs().subtract(29, "day"), dayjs()],
            },
            {
              label: "이번 달",
              value: [dayjs().startOf("month"), dayjs().endOf("month")],
            },
          ]}
        />
      </ConditionField>

      <ConditionField
        name="minimumViews"
        label="최소 조회수"
        defaultValue={null}
        formatValue={(value) => `${Number(value).toLocaleString()}회 이상`}
      >
        <InputNumber
          min={0}
          max={9999999}
          step={100}
          placeholder="제한 없음"
          addonAfter="회 이상"
          size="large"
          className="field-full"
        />
      </ConditionField>

      <ConditionField
        name="hasAttachment"
        label="첨부파일"
        defaultValue={false}
        valuePropName="checked"
        checkedText="첨부파일이 있는 게시물만 조회"
      >
        <Checkbox>첨부파일이 있는 게시물만 조회</Checkbox>
      </ConditionField>
    </ConditionGroup>
  </>
);

const initialResults = [
  {
    key: "1",
    number: "NTC-2026-0318",
    title: "하반기 서비스 운영 정책 변경 안내",
    department: "서비스기획팀",
    status: "대기",
    writer: "김민지",
    registeredAt: "2026-07-29",
  },
  {
    key: "2",
    number: "OPS-2026-0094",
    title: "정기 배포 점검 결과 및 후속 조치",
    department: "플랫폼개발팀",
    status: "처리중",
    writer: "박서준",
    registeredAt: "2026-07-28",
  },
  {
    key: "3",
    number: "CS-2026-0142",
    title: "고객 문의 유형별 처리 가이드",
    department: "고객지원팀",
    status: "완료",
    writer: "이도윤",
    registeredAt: "2026-07-25",
  },
];

const statusColor = {
  대기: "gold",
  처리중: "blue",
  완료: "green",
  반려: "red",
};

const resultColumns = [
  {
    title: "관리번호",
    dataIndex: "number",
    width: 150,
    render: (value) => <Text className="record-number">{value}</Text>,
  },
  {
    title: "제목",
    dataIndex: "title",
    ellipsis: true,
    render: (value) => <Text strong>{value}</Text>,
  },
  { title: "담당부서", dataIndex: "department", width: 140 },
  {
    title: "처리상태",
    dataIndex: "status",
    width: 105,
    render: (value) => <Tag color={statusColor[value]}>{value}</Tag>,
  },
  { title: "작성자", dataIndex: "writer", width: 100 },
  { title: "등록일", dataIndex: "registeredAt", width: 120 },
];

export default function SearchForm({
  loadInitialCondition,
  onSearch,
  onSaveCondition,
}) {
  const [lastSearch, setLastSearch] = useState(null);
  const [savedConditions, setSavedConditions] = useState([]);
  const [results, setResults] = useState(initialResults);

  const search = useCallback(
    async (values) => {
      const nextResults = onSearch
        ? await onSearch(values)
        : initialResults;

      if (Array.isArray(nextResults)) {
        setResults(nextResults);
      }

      setLastSearch({
        values,
        searchedAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      });

      return nextResults;
    },
    [onSearch],
  );

  const save = useCallback(
    async (payload) => {
      if (onSaveCondition) {
        await onSaveCondition(payload);
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
      }

      const count = payload.displayValues.reduce(
        (total, item) => total + item.names.length,
        0,
      );
      setSavedConditions((current) =>
        [
          { name: payload.name, count },
          ...current.filter((item) => item.name !== payload.name),
        ].slice(0, 4),
      );
    },
    [onSaveCondition],
  );

  return (
    <>
      <ConditionForm
        loadValues={loadInitialCondition}
        onSearch={search}
        onSave={save}
        onReset={() => setLastSearch(null)}
      >
        {conditionFields}
      </ConditionForm>

      <section className="results-panel" aria-labelledby="results-title">
        <div className="results-header">
          <div>
            <p className="section-kicker">SEARCH RESULTS</p>
            <h2 id="results-title">
              조회 결과 <span>{results.length}</span>
            </h2>
          </div>
          {lastSearch ? (
            <Space size={7} className="last-search">
              <CheckCircleFilled />
              마지막 조회 {lastSearch.searchedAt}
            </Space>
          ) : (
            <Text type="secondary">기본 조회 결과를 표시하고 있습니다.</Text>
          )}
        </div>

        <Table
          columns={resultColumns}
          dataSource={results}
          pagination={{
            pageSize: 5,
            showSizeChanger: false,
            showTotal: (total) => `총 ${total}건`,
          }}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="조회된 게시물이 없습니다."
              />
            ),
          }}
          scroll={{ x: 850 }}
          className="results-table"
        />
      </section>

      {savedConditions.length > 0 && (
        <section className="saved-strip" aria-label="최근 저장한 조회조건">
          <DatabaseOutlined />
          <Text strong>최근 저장</Text>
          <Flex gap={8} wrap>
            {savedConditions.map((item) => (
              <Tag key={item.name} bordered={false}>
                {item.name} · {item.count}개 조건
              </Tag>
            ))}
          </Flex>
        </section>
      )}
    </>
  );
}
