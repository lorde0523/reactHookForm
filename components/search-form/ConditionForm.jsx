"use client";

import {
  ReloadOutlined,
  SaveOutlined,
  SearchOutlined,
  SlidersOutlined,
} from "@ant-design/icons";
import { Button, Col, Divider, Form, Row, Tag, message } from "antd";
import {
  cloneElement,
  forwardRef,
  useCallback,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
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
  compileConditionChildren,
  extractConditionValue,
  getConditionDefaultValues,
} from "./conditionDsl";
import {
  countActiveSearchFields,
  createSearchSnapshot,
  hydrateSearchValues,
  serializeSearchValues,
} from "./searchConditionModel";

function ActiveConditionCount({ control, schema }) {
  const values = useWatch({ control });
  const count = useMemo(
    () => countActiveSearchFields(schema, values),
    [schema, values],
  );

  return (
    <Tag bordered={false} color="blue">
      {count}개 조건 적용
    </Tag>
  );
}

function joinClassNames(...classNames) {
  return classNames.filter(Boolean).join(" ");
}

function BoundConditionField({ config, control, FormItemComponent }) {
  const valuePropName = config.valuePropName ?? "value";
  const InputComponent = config.control;

  return (
    <Controller
      name={config.name}
      control={control}
      rules={config.rules}
      render={({ field, fieldState }) => {
        const originalOnChange = InputComponent.props.onChange;
        const originalOnBlur = InputComponent.props.onBlur;
        const handleChange = (...args) => {
          const nextValue = config.getValueFromEvent
            ? config.getValueFromEvent(...args)
            : extractConditionValue(args, valuePropName);
          field.onChange(nextValue);
          originalOnChange?.(...args);
        };
        const handleBlur = (...args) => {
          field.onBlur();
          originalOnBlur?.(...args);
        };
        const inputProps = {
          [valuePropName]:
            valuePropName === "checked"
              ? Boolean(field.value)
              : field.value,
          onChange: handleChange,
          onBlur: handleBlur,
          ref: field.ref,
        };

        return (
          <FormItemComponent
            {...config.formItemProps}
            label={config.label}
            className={joinClassNames(
              "search-form-item",
              config.label && "search-form-item-labeled",
              config.formItemProps?.className,
            )}
            validateStatus={fieldState.invalid ? "error" : undefined}
            help={fieldState.error?.message}
          >
            {cloneElement(InputComponent, inputProps)}
          </FormItemComponent>
        );
      }}
    />
  );
}

/**
 * 선언된 Group/Field만으로 RHF 연결, 서버 복원, 조회, 저장 모달을 처리하는 공통 폼.
 * 외부 컴포넌트는 FormProvider/useFormContext/Controller를 알 필요가 없다.
 */
const ConditionForm = forwardRef(function ConditionForm(
  {
    children,
    defaultValues: defaultValueOverrides,
    loadValues,
    loadKey,
    onSearch,
    onSave,
    onReset,
    title = "상세 조회조건",
    description = "필요한 항목만 입력하세요. 비어 있는 조건은 전체로 조회됩니다.",
    saveButtonText = "조회조건 저장",
    resetButtonText = "초기화",
    searchButtonText = "조회",
    formProps,
    components = {},
    className,
  },
  ref,
) {
  const [messageApi, contextHolder] = message.useMessage();
  const schema = useMemo(() => compileConditionChildren(children), [children]);
  const initialDefaultValues = useMemo(
    () => getConditionDefaultValues(
      schema,
      defaultValueOverrides,
    ),
    [defaultValueOverrides, schema],
  );

  const methods = useForm({ defaultValues: initialDefaultValues });
  const {
    control,
    getValues,
    handleSubmit,
    reset,
    setValue,
    formState: { isSubmitting },
  } = methods;
  const [isLoadingValues, setIsLoadingValues] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [conditionSnapshot, setConditionSnapshot] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const canLoadValues = Boolean(loadValues);

  const createFreshDefaults = useCallback(
    () =>
      getConditionDefaultValues(
        schema,
        defaultValueOverrides,
      ),
    [defaultValueOverrides, schema],
  );

  const resetServerValues = useCallback(
    (serverValues = {}) => {
      reset(
        hydrateSearchValues(
          schema,
          serverValues,
          createFreshDefaults(),
        ),
      );
    },
    [createFreshDefaults, reset, schema],
  );

  const openSaveModal = useCallback(() => {
    setConditionSnapshot(
      createSearchSnapshot(schema, getValues()),
    );
    setSaveModalOpen(true);
  }, [getValues, schema]);

  useImperativeHandle(
    ref,
    () => ({
      getValues,
      setValue,
      reset: resetServerValues,
      resetToDefaults: () => reset(createFreshDefaults()),
      openSaveModal,
    }),
    [createFreshDefaults, getValues, openSaveModal, reset, resetServerValues, setValue],
  );

  const executeLoadValues = useEffectEvent((signal) =>
    loadValues?.({ signal }),
  );
  const applyLoadedValues = useEffectEvent((serverValues) => {
    reset(
      hydrateSearchValues(
        schema,
        serverValues,
        getConditionDefaultValues(schema, defaultValueOverrides),
      ),
    );
  });

  useEffect(() => {
    if (!canLoadValues) {
      return undefined;
    }

    const abortController = new AbortController();
    let active = true;

    const load = async () => {
      try {
        setIsLoadingValues(true);
        const serverValues = await executeLoadValues(abortController.signal);

        if (active && serverValues) {
          applyLoadedValues(serverValues);
        }
      } catch (error) {
        if (active && error?.name !== "AbortError") {
          messageApi.error("저장된 조회조건을 불러오지 못했습니다.");
        }
      } finally {
        if (active) {
          setIsLoadingValues(false);
        }
      }
    };

    load();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [canLoadValues, loadKey, messageApi]);

  const submitSearch = handleSubmit(async (values) => {
    const payload = serializeSearchValues(schema, values);

    try {
      await onSearch?.(payload);
      messageApi.success("조회가 완료되었습니다.");
    } catch {
      messageApi.error("조회에 실패했습니다. 잠시 후 다시 시도해 주세요.");
    }
  });

  const resetToDefaults = useCallback(() => {
    reset(createFreshDefaults());
    onReset?.();
    messageApi.info("조회조건을 초기화했습니다.");
  }, [createFreshDefaults, messageApi, onReset, reset]);

  const saveCondition = useCallback(
    async (conditionName) => {
      if (!conditionName) {
        messageApi.warning("저장할 조회조건 이름을 입력해 주세요.");
        return;
      }

      if (!conditionSnapshot || !onSave) {
        return;
      }

      const payload = {
        name: conditionName,
        ...conditionSnapshot,
        savedAt: new Date().toISOString(),
      };

      try {
        setIsSaving(true);
        await onSave(payload);
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
    [conditionSnapshot, messageApi, onSave],
  );

  const FormComponent = components.Form ?? Form;
  const RowComponent = components.Row ?? Row;
  const ColComponent = components.Col ?? Col;
  const DefaultFormItem = components.FormItem ?? Form.Item;

  return (
    <FormProvider {...methods}>
      {contextHolder}

      <section
        className={joinClassNames("search-panel", className)}
        aria-labelledby="search-panel-title"
      >
        <div className="panel-header">
          <div>
            <div className="panel-title-line">
              <span className="panel-icon">
                <SlidersOutlined />
              </span>
              <h2 id="search-panel-title">{title}</h2>
              <ActiveConditionCount control={control} schema={schema} />
            </div>
            <p>{description}</p>
          </div>

          {onSave && (
            <Button
              icon={<SaveOutlined />}
              onClick={openSaveModal}
              loading={isLoadingValues}
            >
              {saveButtonText}
            </Button>
          )}
        </div>

        <Divider className="panel-divider" />

        <FormComponent
          {...formProps}
          layout={formProps?.layout ?? "vertical"}
          component={formProps?.component ?? "form"}
          onFinish={submitSearch}
          className={joinClassNames("search-form", formProps?.className)}
        >
          <RowComponent gutter={[24, 20]} className="search-form-row">
            {schema.map((group) => (
              <ColComponent
                {...group.colProps}
                key={group.key}
                span={group.colProps?.span ?? 24}
                className={joinClassNames("flex-group", group.className)}
              >
                <div className="category-name">{group.categoryLabel}</div>

                <RowComponent {...group.rowProps} className="category-list">
                  {group.items.map((item) => (
                    <ColComponent
                      {...item.colProps}
                      key={item.key}
                      span={item.colProps?.span ?? 24}
                      className={joinClassNames(
                        "category-item",
                        item.className,
                      )}
                    >
                      {item.fields.map((fieldConfig) => (
                        <BoundConditionField
                          key={fieldConfig.key}
                          config={fieldConfig}
                          control={control}
                          FormItemComponent={
                            fieldConfig.as ?? DefaultFormItem
                          }
                        />
                      ))}
                    </ColComponent>
                  ))}
                </RowComponent>
              </ColComponent>
            ))}
          </RowComponent>

          <div className="form-actions">
            <Button
              icon={<ReloadOutlined />}
              onClick={resetToDefaults}
              size="large"
            >
              {resetButtonText}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SearchOutlined />}
              loading={isSubmitting}
              size="large"
              className="search-button"
            >
              {searchButtonText}
            </Button>
          </div>
        </FormComponent>
      </section>

      {onSave && (
        <SearchConditionSaveModal
          open={saveModalOpen}
          snapshot={conditionSnapshot}
          saving={isSaving}
          onCancel={() => setSaveModalOpen(false)}
          onSave={saveCondition}
        />
      )}
    </FormProvider>
  );
});

export default ConditionForm;
