"use client";

import { CalendarOutlined, SearchOutlined } from "@ant-design/icons";
import {
  Checkbox,
  DatePicker,
  Input,
  InputNumber,
  Radio,
  Select,
} from "antd";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

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

function formatDateRange(value) {
  return Array.isArray(value) && value.length === 2
    ? value.map((date) => dayjs(date).format("YYYY-MM-DD")).join(" ~ ")
    : "";
}

function formatMinimumViews(value) {
  return `${Number(value).toLocaleString()}회 이상`;
}

function hydrateDateRange(value) {
  return Array.isArray(value) && value.length === 2
    ? value.map((date) => dayjs(date))
    : null;
}

/**
 * 조회조건 렌더링과 값 표시 규칙의 단일 정의다.
 * category.items 경계가 모달에서 무라벨 값을 "/"로 합치는 경계와 동일하다.
 */
export const searchConditionSchema = [
  {
    key: "keyword-category",
    categoryLabel: "검색어",
    items: [
      {
        key: "main",
        fields: [
          {
            name: "keyword",
            rules: {
              maxLength: {
                value: 100,
                message: "검색어는 100자 이하로 입력해 주세요.",
              },
            },
            render: ({ field }) => (
              <Input
                {...field}
                allowClear
                size="large"
                prefix={<SearchOutlined className="field-prefix" />}
                placeholder="제목, 내용 또는 작성자 검색"
                maxLength={100}
              />
            ),
          },
          {
            name: "searchTarget",
            options: searchTargetOptions,
            shouldDisplay: (_value, values) => Boolean(values.keyword?.trim()),
            render: ({ field, options }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                options={options}
                size="large"
                className="field-full"
              />
            ),
          },
        ],
      },
    ],
  },
  {
    key: "status-category",
    categoryLabel: "처리상태",
    items: [
      {
        key: "main",
        fields: [
          {
            name: "status",
            options: statusOptions,
            render: ({ field, options }) => (
              <Checkbox.Group
                value={field.value}
                onChange={field.onChange}
                options={options}
                className="choice-group"
              />
            ),
          },
          {
            name: "visibility",
            options: visibilityOptions,
            shouldDisplay: (value) => value !== "ALL",
            render: ({ field, options }) => (
              <Radio.Group
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                options={options}
                optionType="button"
                buttonStyle="solid"
                className="radio-segment"
              />
            ),
          },
        ],
      },
    ],
  },
  {
    key: "classification-category",
    categoryLabel: "분류",
    items: [
      {
        key: "main",
        fields: [
          {
            name: "department",
            label: "담당부서",
            options: departmentOptions,
            render: ({ field, options }) => (
              <Select
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder="담당부서 전체"
                options={options}
                size="large"
                className="field-full"
              />
            ),
          },
          {
            name: "tags",
            label: "업무 태그",
            options: tagOptions,
            render: ({ field, options }) => (
              <Select
                mode="multiple"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                allowClear
                placeholder="태그를 선택해 주세요"
                options={options}
                maxTagCount="responsive"
                size="large"
                className="field-full"
              />
            ),
          },
        ],
      },
    ],
  },
  {
    key: "registration-category",
    categoryLabel: "등록기간",
    items: [
      {
        key: "main",
        fields: [
          {
            name: "registeredRange",
            label: "등록기간",
            formatValue: formatDateRange,
            hydrate: hydrateDateRange,
            render: ({ field }) => (
              <RangePicker
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
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
                    value: [
                      dayjs().startOf("month"),
                      dayjs().endOf("month"),
                    ],
                  },
                ]}
              />
            ),
          },
          {
            name: "minimumViews",
            label: "최소 조회수",
            formatValue: formatMinimumViews,
            render: ({ field }) => (
              <InputNumber
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                min={0}
                max={9999999}
                step={100}
                placeholder="제한 없음"
                addonAfter="회 이상"
                size="large"
                className="field-full"
              />
            ),
          },
          {
            name: "hasAttachment",
            label: "첨부파일",
            shouldDisplay: (value) => value === true,
            formatValue: () => "첨부파일이 있는 게시물만 조회",
            render: ({ field }) => (
              <Checkbox
                checked={Boolean(field.value)}
                onChange={(event) => field.onChange(event.target.checked)}
                onBlur={field.onBlur}
              >
                첨부파일이 있는 게시물만 조회
              </Checkbox>
            ),
          },
        ],
      },
    ],
  },
];

export function createDefaultSearchValues() {
  return {
    keyword: "",
    searchTarget: "TITLE_CONTENT",
    status: ["READY", "IN_PROGRESS"],
    visibility: "ALL",
    department: undefined,
    tags: [],
    registeredRange: [dayjs().subtract(29, "day"), dayjs()],
    minimumViews: null,
    hasAttachment: false,
  };
}
