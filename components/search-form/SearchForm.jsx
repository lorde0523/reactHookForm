"use client";

import {
  CheckCircleFilled,
  DatabaseOutlined,
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  SlidersOutlined,
} from "@ant-design/icons";
import {
  Button,
  Col,
  Divider,
  Empty,
  Flex,
  Form,
  Row,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import dayjs from "dayjs";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Controller,
  FormProvider,
  useForm,
  useWatch,
} from "react-hook-form";
import SearchConditionSaveModal from "./SearchConditionSaveModal";
import {
  countActiveSearchFields,
  createSearchSnapshot,
  hydrateSearchValues,
  serializeSearchValues,
} from "./searchConditionModel";
import {
  createDefaultSearchValues,
  searchConditionSchema,
} from "./searchConditionSchema";

const { Text } = Typography;

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

function ActiveConditionCount({ control }) {
  const values = useWatch({ control });
  const count = useMemo(
    () => countActiveSearchFields(searchConditionSchema, values),
    [values],
  );

  return (
    <Tag bordered={false} color="blue">
      {count}개 조건 적용
    </Tag>
  );
}

/**
 * RHF가 조회조건 값의 유일한 상태 저장소다.
 *
 * loadInitialCondition은 서버에 저장된 조회조건을 반환하는 async 함수다.
 * 여러 setValue 호출 대신 reset 한 번으로 전체 값을 반영해 렌더링을 최소화한다.
 */
export default function SearchForm({
  loadInitialCondition,
  onSearch,
  onSaveCondition,
}) {
  const [messageApi, contextHolder] = message.useMessage();
  const defaultValues = useMemo(() => createDefaultSearchValues(), []);
  const methods = useForm({ defaultValues });
  const {
    control,
    getValues,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = methods;
  const [isLoadingInitialCondition, setIsLoadingInitialCondition] =
    useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [conditionSnapshot, setConditionSnapshot] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSearch, setLastSearch] = useState(null);
  const [savedConditions, setSavedConditions] = useState([]);
  const [results, setResults] = useState(initialResults);

  useEffect(() => {
    if (!loadInitialCondition) {
      return undefined;
    }

    const abortController = new AbortController();
    let active = true;

    const load = async () => {
      try {
        setIsLoadingInitialCondition(true);
        const serverValues = await loadInitialCondition({
          signal: abortController.signal,
        });

        if (active && serverValues) {
          reset(
            hydrateSearchValues(
              searchConditionSchema,
              serverValues,
              defaultValues,
            ),
          );
        }
      } catch (error) {
        if (active && error?.name !== "AbortError") {
          messageApi.error("저장된 조회조건을 불러오지 못했습니다.");
        }
      } finally {
        if (active) {
          setIsLoadingInitialCondition(false);
        }
      }
    };

    load();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [defaultValues, loadInitialCondition, messageApi, reset]);

  const submitSearch = handleSubmit(async (values) => {
    const payload = serializeSearchValues(searchConditionSchema, values);

    try {
      if (onSearch) {
        const nextResults = await onSearch(payload);

        if (Array.isArray(nextResults)) {
          setResults(nextResults);
        }
      } else {
        setResults(initialResults);
      }

      setLastSearch({
        values: payload,
        searchedAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
      });
      messageApi.success("조회가 완료되었습니다.");
    } catch {
      messageApi.error("조회에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  });

  const resetSearchConditions = useCallback(() => {
    reset(defaultValues);
    setLastSearch(null);
    messageApi.info("조회조건을 초기화했습니다.");
  }, [defaultValues, messageApi, reset]);

  const openSaveModal = useCallback(() => {
    setConditionSnapshot(
      createSearchSnapshot(searchConditionSchema, getValues()),
    );
    setSaveModalOpen(true);
  }, [getValues]);

  const closeSaveModal = useCallback(() => {
    setSaveModalOpen(false);
  }, []);

  const saveCondition = useCallback(
    async (conditionName) => {
      if (!conditionName) {
        messageApi.warning("저장할 조회조건 이름을 입력해 주세요.");
        return;
      }

      if (!conditionSnapshot) {
        return;
      }

      const payload = {
        name: conditionName,
        values: conditionSnapshot.values,
        displayValues: conditionSnapshot.displayValues,
        savedAt: dayjs().toISOString(),
      };

      try {
        setIsSaving(true);

        if (onSaveCondition) {
          await onSaveCondition(payload);
        } else {
          await new Promise((resolve) => window.setTimeout(resolve, 450));
        }

        const conditionCount = conditionSnapshot.displayValues.reduce(
          (count, item) => count + item.names.length,
          0,
        );

        setSavedConditions((current) =>
          [
            { name: conditionName, count: conditionCount },
            ...current.filter((item) => item.name !== conditionName),
          ].slice(0, 4),
        );
        setSaveModalOpen(false);
        messageApi.success(`‘${conditionName}’ 조회조건을 저장했습니다.`);
      } catch {
        messageApi.error(
          "조회조건 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
        );
      } finally {
        setIsSaving(false);
      }
    },
    [conditionSnapshot, messageApi, onSaveCondition],
  );

  return (
    <FormProvider {...methods}>
      {contextHolder}

      <section className="search-panel" aria-labelledby="search-panel-title">
        <div className="panel-header">
          <div>
            <div className="panel-title-line">
              <span className="panel-icon">
                <SlidersOutlined />
              </span>
              <h2 id="search-panel-title">상세 조회조건</h2>
              <ActiveConditionCount control={control} />
            </div>
            <p>필요한 항목만 입력하세요. 비어 있는 조건은 전체로 조회됩니다.</p>
          </div>
          <Button
            icon={<SaveOutlined />}
            onClick={openSaveModal}
            loading={isLoadingInitialCondition}
          >
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
            {searchConditionSchema.map((category) => (
              <Col key={category.key} span={24} className="flex-group">
                <div className="category-name">{category.categoryLabel}</div>

                <Row className="category-list">
                  {category.items.map((item) => (
                    <Col
                      key={item.key}
                      span={24}
                      className="category-item"
                    >
                      {item.fields.map((fieldConfig) => (
                        <Controller
                          key={fieldConfig.name}
                          name={fieldConfig.name}
                          control={control}
                          rules={fieldConfig.rules}
                          render={({ field, fieldState }) => (
                            <Form.Item
                              label={fieldConfig.label}
                              className={[
                                "search-form-item",
                                fieldConfig.label &&
                                  "search-form-item-labeled",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              validateStatus={
                                fieldState.invalid ? "error" : undefined
                              }
                              help={fieldState.error?.message}
                            >
                              {fieldConfig.render({
                                field,
                                fieldState,
                                options: fieldConfig.options,
                              })}
                            </Form.Item>
                          )}
                        />
                      ))}
                    </Col>
                  ))}
                </Row>
              </Col>
            ))}
          </Row>

          <div className="form-actions">
            <Button
              icon={<ReloadOutlined />}
              onClick={resetSearchConditions}
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

      <SearchConditionSaveModal
        open={saveModalOpen}
        snapshot={conditionSnapshot}
        saving={isSaving}
        onCancel={closeSaveModal}
        onSave={saveCondition}
      />
    </FormProvider>
  );
}
