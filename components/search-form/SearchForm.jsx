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
import {
  useForm,
  useWatch,
} from "react-hook-form";
import ControlledFormItem from "../form/ControlledFormItem";
import SearchConditionSummary from "./SearchConditionSummary";

const { RangePicker } = DatePicker;
const { Text } = Typography;

// 입력 컴포넌트와 저장 확인 화면이 같은 options 배열을 공유한다.
// 별도 설정 객체에 라벨을 복제하지 않으므로 선택지가 바뀌어도 한 곳만 수정하면 된다.
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

// RHF가 조회조건 값의 유일한 상태 저장소다.
// 필드를 추가할 때는 컴포넌트가 제어 컴포넌트로 동작하도록 여기에도 초기값을 추가한다.
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

// 저장 확인 화면에 필요한 필드명/표시 라벨/options만 공유한다.
// 실제 사용자가 입력한 값은 Context나 ref에 저장하지 않고 RHF에서만 읽는다.
const PreviewRegistryContext = createContext(null);

/**
 * 저장 확인 목록에서 제외할 "입력되지 않은 값"의 공통 기준이다.
 * false와 0은 사용자가 선택할 수 있는 유효한 값이므로 빈 값으로 처리하지 않는다.
 */
function isEmptyValue(value) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  );
}

// Select/Checkbox/Radio가 보관하는 실제 값(value)을 화면 표시값(label)으로 바꾼다.
// String 비교를 사용해 true/false 같은 값도 options와 안정적으로 매칭한다.
function findOptionLabel(options, value) {
  return (
    options?.find((option) => String(option.value) === String(value))?.label ??
    String(value)
  );
}

/**
 * RHF 원본 값을 저장 확인 화면용 문자열로 변환한다.
 * 변환 우선순위는 필드별 formatValue → options 라벨 → 원본 문자열이다.
 * 배열 값은 Checkbox.Group, 다중 Select처럼 여러 항목을 선택한 경우를 처리한다.
 */
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

/**
 * 조회조건 카테고리의 DOM 구조를 한 곳에서 고정한다.
 *
 * 모든 children을 하나의 Col.category-item 안에 넣기 때문에 카테고리에
 * Form.Item이 여러 개여도 같은 행에 배치되고 CSS의 "/" 구분자를 공유한다.
 */
function SearchCategory({ label, children }) {
  return (
    <Col span={24} className="flex-group">
      <div className="category-name">{label}</div>
      <Row className="category-list">
        <Col span={24} className="category-item">
          {children}
        </Col>
      </Row>
    </Col>
  );
}

/**
 * 조회 입력 필드의 RHF 연결과 저장 미리보기 메타데이터 등록을 함께 처리한다.
 *
 * 사용 예:
 * <SearchField
 *   name="status"
 *   label="처리상태"
 *   control={control}
 *   options={statusOptions}
 * >
 *   {({ field, options }) => (
 *     <Checkbox.Group
 *       value={field.value}
 *       options={options}
 *       onChange={field.onChange}
 *     />
 *   )}
 * </SearchField>
 *
 * options를 입력 컴포넌트와 미리보기가 함께 사용하므로 value → label 변환을 위한
 * 별도 설정 객체가 필요 없다. 날짜/숫자처럼 options가 없는 필드만 formatValue를
 * 전달해 표시 형식을 정의한다.
 */
function SearchField({
  name,
  label,
  control,
  options,
  formatValue,
  rules,
  children,
}) {
  const registry = useContext(PreviewRegistryContext);

  useEffect(() => {
    // 필드가 화면에 존재하는 동안만 메타데이터를 등록한다.
    // cleanup에서 삭제하므로 조건부 렌더링 필드가 사라져도 미리보기에 남지 않는다.
    return registry.register({
      name,
      label,
      options,
      formatValue,
    });
  }, [formatValue, label, name, options, registry]);

  return (
    <ControlledFormItem
      name={name}
      control={control}
      rules={rules}
      formItemClassName="search-form-item"
    >
      {({ field, fieldState }) =>
        children({ field, options, fieldState })
      }
    </ControlledFormItem>
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

/**
 * RHF 값에 포함된 dayjs 객체를 API/DB로 전달 가능한 문자열로 바꾼다.
 * 화면 입력 중에는 DatePicker 호환을 위해 dayjs를 유지하고, 조회 또는 저장 직전에만
 * 직렬화하여 UI 컴포넌트용 값과 서버 전송용 값의 책임을 분리한다.
 */
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

/**
 * RHF 기반 조회조건 입력, 조회 실행, 조회조건 저장 확인을 제공하는 화면 컴포넌트다.
 *
 * 사용 예:
 * <SearchForm
 *   onSearch={async (values) => searchApi(values)}
 *   onSaveCondition={async (payload) => saveConditionApi(payload)}
 * />
 *
 * onSearch에는 dayjs가 YYYY-MM-DD로 변환된 조회 값이 전달된다.
 * onSaveCondition에는 저장 이름, DB 저장용 values, 확인 화면용 displayValues,
 * 저장 시각이 전달된다. 두 콜백을 생략하면 현재 예제용 조회/저장 동작으로 실행된다.
 */
export default function SearchForm({ onSearch, onSaveCondition }) {
  const [messageApi, contextHolder] = message.useMessage();

  // 이 ref에는 form 값이 아니라 SearchField가 등록한 label/options 메타데이터만 있다.
  // 값은 항상 RHF의 handleSubmit/getValues/useWatch로 읽으므로 폼 값용 ref와 다르다.
  const registryRef = useRef(new Map());

  // 아래 state는 모달 열림, 로딩, 결과처럼 일시적인 화면 UI 상태다.
  // 조회조건 필드 값은 포함하지 않으며 RHF가 계속 단독으로 관리한다.
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

  // 화면 상단의 적용 조건 개수처럼 입력 즉시 갱신되어야 하는 UI만 구독한다.
  // 실제 조회/저장 시점의 전체 값은 불필요한 렌더링 없이 handleSubmit/getValues로 읽는다.
  const watchedValues = useWatch({ control });

  const registry = useMemo(
    () => ({
      register(fieldMeta) {
        registryRef.current.set(fieldMeta.name, fieldMeta);

        // useEffect cleanup 함수로 사용되어 언마운트된 필드의 메타데이터를 제거한다.
        return () => {
          registryRef.current.delete(fieldMeta.name);
        };
      },
    }),
    // Context 객체를 한 번만 만들어 SearchField의 등록 effect가 매 렌더마다 재실행되지 않게 한다.
    [],
  );

  // RHF 값과 JSX에서 등록한 메타데이터를 결합해 모달 출력 행을 만든다.
  // 빈 값은 이 단계에서 제외하므로 SearchConditionSummary는 표시 작업에만 집중한다.
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

  // 조회 버튼은 handleSubmit을 거치므로 rules 검증을 통과한 데이터만 전달된다.
  // 부모가 onSearch를 제공하면 실제 API 호출을 위임하고, 없으면 예제 결과를 사용한다.
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
    // 버튼을 누른 순간의 RHF 스냅샷으로 미리보기를 고정한다.
    // 모달 렌더링을 위해 폼 전체를 watch하지 않아도 되므로 불필요한 재렌더링을 줄인다.
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

      // 실제 화면에서는 onSaveCondition 안에서 DB 저장 API를 호출하면 된다.
      // 콜백이 없는 현재 예제에서는 짧은 지연으로 저장 동작만 시뮬레이션한다.
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
          <Row gutter={[24, 20]} className="search-form-row">
            <SearchCategory label="검색어">
              <SearchField
                name="keyword"
                label="검색어"
                control={control}
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
            </SearchCategory>

            <SearchCategory label="처리상태">
              <SearchField
                name="status"
                label="처리상태"
                control={control}
                options={statusOptions}
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
            </SearchCategory>

            <SearchCategory label="분류">
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
            </SearchCategory>

            <SearchCategory label="등록기간">
              <SearchField
                name="registeredRange"
                label="등록기간"
                control={control}
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
            </SearchCategory>
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

          <SearchConditionSummary items={previewRows} />
        </div>
      </Modal>
    </PreviewRegistryContext.Provider>
  );
}
