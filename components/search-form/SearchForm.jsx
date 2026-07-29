"use client";

import {
  CalendarOutlined,
  CheckCircleFilled,
  DatabaseOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  SlidersOutlined,
} from "@ant-design/icons";
import {
  Alert,
  Button,
  Checkbox,
  Col,
  DatePicker,
  Divider,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

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

const attachmentOptions = [
  { label: "포함", value: true },
  { label: "미포함", value: false },
];

const defaultValues = {
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

const initialResults = [
  {
    key: "1",
    number: "NTC-2026-0318",
    title: "하반기 서비스 운영 정책 변경 안내",
    department: "서비스기획팀",
    status: "대기",
    writer: "김민준",
    registeredAt: "2026-07-29",
  },
  {
    key: "2",
    number: "OPS-2026-0094",
    title: "정기 배포 점검 결과 및 후속 조치",
    department: "플랫폼개발팀",
    status: "처리중",
    writer: "박서연",
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

const PreviewRegistryContext = createContext(null);

function isEmptyValue(value) {
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

function formatFieldValue(value, options, customFormatter) {
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

function formatDateRange(value) {
  return value?.length === 2
    ? `${value[0].format("YYYY-MM-DD")} ~ ${value[1].format("YYYY-MM-DD")}`
    : "전체";
}

function formatMinimumViews(value) {
  return isEmptyValue(value)
    ? "전체"
    : `${Number(value).toLocaleString()}회 이상`;
}

function SearchField({
  name,
  label,
  control,
  options,
  formatValue,
  rules,
  children,
  wide = false,
}) {
  const registry = useContext(PreviewRegistryContext);

  useEffect(() => {
    return registry.register({
      name,
      label,
      options,
      formatValue,
    });
  }, [formatValue, label, name, options, registry]);

  return (
    <Col xs={24} lg={wide ? 24 : 12} xxl={wide ? 16 : 8} className="flex-group">
      <div className="category-name">{label}</div>
      <Row className="category-list">
        <Col span={24} className="category-item">
          <Controller
            name={name}
            control={control}
            rules={rules}
            render={({ field, fieldState }) => (
              <Form.Item
                validateStatus={fieldState.error ? "error" : undefined}
                help={fieldState.error?.message}
              >
                {children({ field, options, fieldState })}
              </Form.Item>
            )}
          />
        </Col>
      </Row>
    </Col>
  );
}

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
  {
    title: "담당부서",
    dataIndex: "department",
    width: 140,
  },
  {
    title: "처리상태",
    dataIndex: "status",
    width: 105,
    render: (value) => <Tag color={statusColor[value]}>{value}</Tag>,
  },
  {
    title: "작성자",
    dataIndex: "writer",
    width: 100,
  },
  {
    title: "등록일",
    dataIndex: "registeredAt",
    width: 120,
  },
];

const previewColumns = [
  {
    title: "조건명",
    dataIndex: "label",
    key: "label",
    width: 150,
    render: (value) => <Text className="preview-label">{value}</Text>,
  },
  {
    title: "선택한 값",
    dataIndex: "displayValue",
    key: "displayValue",
    render: (value) => <Text>{value}</Text>,
  },
];

function toSerializableValues(values) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => {
      if (Array.isArray(value) && value.every((item) => dayjs.isDayjs(item))) {
        return [key, value.map((item) => item.format("YYYY-MM-DD"))];
      }

      return [key, value];
    }),
  );
}

export default function SearchForm({ onSearch, onSaveCondition }) {
  const [messageApi, contextHolder] = message.useMessage();
  const registryRef = useRef(new Map());
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [conditionName, setConditionName] = useState("");
  const [previewRows, setPreviewRows] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSearch, setLastSearch] = useState(null);
  const [savedConditions, setSavedConditions] = useState([]);
  const [results, setResults] = useState(initialResults);

  const {
    control,
    handleSubmit,
    getValues,
    reset,
    formState: { isSubmitting },
  } = useForm({
    defaultValues,
  });

  const watchedValues = useWatch({ control });

  const registry = useMemo(
    () => ({
      register(fieldMeta) {
        registryRef.current.set(fieldMeta.name, fieldMeta);

        return () => {
          registryRef.current.delete(fieldMeta.name);
        };
      },
    }),
    [],
  );

  const createPreviewRows = useCallback((values) => {
    return Array.from(registryRef.current.values())
      .filter((fieldMeta) => !isEmptyValue(values[fieldMeta.name]))
      .map((fieldMeta) => ({
        key: fieldMeta.name,
        name: fieldMeta.name,
        label: fieldMeta.label,
        rawValue: values[fieldMeta.name],
        displayValue: formatFieldValue(
          values[fieldMeta.name],
          fieldMeta.options,
          fieldMeta.formatValue,
        ),
      }));
  }, []);

  const activeConditionCount = useMemo(() => {
    return Object.entries(watchedValues).filter(([key, value]) => {
      if (key === "visibility" && value === "ALL") return false;
      if (key === "searchTarget" && value === "TITLE_CONTENT") return false;
      if (key === "hasAttachment" && value === false) return false;
      return !isEmptyValue(value);
    }).length;
  }, [watchedValues]);

  const submitSearch = handleSubmit(async (data) => {
    const payload = toSerializableValues(data);

    if (onSearch) {
      await onSearch(payload);
    }

    setLastSearch({
      values: payload,
      searchedAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
    });
    setResults(initialResults);
    messageApi.success("조회가 완료되었습니다.");
  });

  const handleReset = () => {
    reset(defaultValues);
    setLastSearch(null);
    messageApi.info("조회조건을 초기화했습니다.");
  };

  const openSaveModal = () => {
    setPreviewRows(createPreviewRows(getValues()));
    setConditionName("");
    setSaveModalOpen(true);
  };

  const saveCondition = async () => {
    const trimmedName = conditionName.trim();

    if (!trimmedName) {
      messageApi.warning("저장할 조회조건 이름을 입력해 주세요.");
      return;
    }

    const values = toSerializableValues(getValues());
    const payload = {
      name: trimmedName,
      values,
      displayValues: previewRows.map(({ name, label, displayValue }) => ({
        name,
        label,
        displayValue,
      })),
      savedAt: dayjs().toISOString(),
    };

    try {
      setIsSaving(true);

      if (onSaveCondition) {
        await onSaveCondition(payload);
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, 450));
      }

      setSavedConditions((current) => [
        { name: trimmedName, count: activeConditionCount },
        ...current.filter((item) => item.name !== trimmedName),
      ].slice(0, 4));
      setSaveModalOpen(false);
      messageApi.success(`‘${trimmedName}’ 조회조건을 저장했습니다.`);
    } catch {
      messageApi.error("조회조건 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PreviewRegistryContext.Provider value={registry}>
      {contextHolder}

      <section className="search-panel" aria-labelledby="search-panel-title">
        <div className="panel-header">
          <div>
            <div className="panel-title-line">
              <span className="panel-icon">
                <SlidersOutlined />
              </span>
              <h2 id="search-panel-title">상세 조회조건</h2>
              <Tag bordered={false} color="blue">
                {activeConditionCount}개 조건 적용
              </Tag>
            </div>
            <p>필요한 항목만 입력하세요. 비어 있는 조건은 전체로 조회됩니다.</p>
          </div>
          <Button icon={<SaveOutlined />} onClick={openSaveModal}>
            조회조건 저장
          </Button>
        </div>

        <Divider className="panel-divider" />

        <Form
          layout="vertical"
          component="form"
          onFinish={submitSearch}
          className="search-form"
        >
          <Row gutter={[24, 20]}>
            <SearchField
              name="keyword"
              label="검색어"
              control={control}
              wide
              rules={{
                maxLength: {
                  value: 100,
                  message: "검색어는 100자 이하로 입력해 주세요.",
                },
              }}
            >
              {({ field }) => (
                <Input
                  {...field}
                  allowClear
                  size="large"
                  prefix={<SearchOutlined className="field-prefix" />}
                  placeholder="제목, 내용 또는 작성자 검색"
                  maxLength={100}
                />
              )}
            </SearchField>

            <SearchField
              name="searchTarget"
              label="검색 대상"
              control={control}
              options={searchTargetOptions}
            >
              {({ field, options }) => (
                <Select
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  options={options}
                  size="large"
                  className="field-full"
                />
              )}
            </SearchField>

            <SearchField
              name="status"
              label="처리상태"
              control={control}
              options={statusOptions}
              wide
            >
              {({ field, options }) => (
                <Checkbox.Group
                  value={field.value}
                  onChange={field.onChange}
                  options={options}
                  className="choice-group"
                />
              )}
            </SearchField>

            <SearchField
              name="visibility"
              label="공개여부"
              control={control}
              options={visibilityOptions}
              wide
            >
              {({ field, options }) => (
                <Radio.Group
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.value)}
                  options={options}
                  optionType="button"
                  buttonStyle="solid"
                  className="radio-segment"
                />
              )}
            </SearchField>

            <SearchField
              name="department"
              label="담당부서"
              control={control}
              options={departmentOptions}
            >
              {({ field, options }) => (
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
              )}
            </SearchField>

            <SearchField
              name="tags"
              label="업무 태그"
              control={control}
              options={tagOptions}
              wide
            >
              {({ field, options }) => (
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
              )}
            </SearchField>

            <SearchField
              name="registeredRange"
              label="등록기간"
              control={control}
              wide
              formatValue={formatDateRange}
            >
              {({ field }) => (
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
                      value: [dayjs().startOf("month"), dayjs().endOf("month")],
                    },
                  ]}
                />
              )}
            </SearchField>

            <SearchField
              name="minimumViews"
              label="최소 조회수"
              control={control}
              formatValue={formatMinimumViews}
            >
              {({ field }) => (
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
              )}
            </SearchField>

            <SearchField
              name="hasAttachment"
              label="첨부파일"
              control={control}
              options={attachmentOptions}
            >
              {({ field }) => (
                <Flex align="center" gap={10} className="switch-row">
                  <Switch
                    checked={field.value}
                    onChange={field.onChange}
                    checkedChildren="포함"
                    unCheckedChildren="미포함"
                  />
                  <Text type="secondary">
                    첨부파일이 있는 게시물만 조회
                  </Text>
                </Flex>
              )}
            </SearchField>
          </Row>

          <div className="form-actions">
            <Button
              icon={<ReloadOutlined />}
              onClick={handleReset}
              size="large"
            >
              초기화
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              loading={isSubmitting}
              size="large"
              className="search-button"
            >
              조회
            </Button>
          </div>
        </Form>
      </section>

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

      <Modal
        title={
          <Space>
            <span className="modal-title-icon">
              <SaveOutlined />
            </span>
            조회조건 저장 확인
          </Space>
        }
        open={saveModalOpen}
        onCancel={() => setSaveModalOpen(false)}
        onOk={saveCondition}
        okText="DB 저장"
        cancelText="취소"
        confirmLoading={isSaving}
        okButtonProps={{ icon: <DatabaseOutlined /> }}
        width={680}
        destroyOnHidden
      >
        <div className="modal-content">
          <Alert
            type="info"
            showIcon
            message="현재 입력한 조건을 확인한 뒤 저장해 주세요."
            description="저장된 조건은 사용자별 즐겨찾기 조회조건으로 연결할 수 있습니다."
          />

          <div className="condition-name-field">
            <label htmlFor="condition-name">조회조건 이름</label>
            <Input
              id="condition-name"
              value={conditionName}
              onChange={(event) => setConditionName(event.target.value)}
              onPressEnter={saveCondition}
              placeholder="예: 이번 달 처리 대기 건"
              maxLength={40}
              showCount
              autoFocus
              size="large"
            />
          </div>

          <Table
            columns={previewColumns}
            dataSource={previewRows}
            pagination={false}
            size="small"
            scroll={{ y: 320 }}
            className="preview-table"
          />
        </div>
      </Modal>
    </PreviewRegistryContext.Provider>
  );
}
