"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from "react";
import { useFormContext } from "react-hook-form";
import { createConditionDisplayRows } from "./createConditionDisplayRows";

const ConditionCollectorContext = createContext(null);
const ConditionCategoryContext = createContext(null);
const ConditionCategoryItemContext = createContext(null);

/**
 * 화면에 실제 렌더링된 ConditionFormItem의 메타데이터만 보관한다.
 * 필드 값은 복제하지 않고 collect 호출 시 RHF에서 최신 값을 읽는다.
 */
export function ConditionCollectorProvider({ children }) {
  const { getValues } = useFormContext();
  const registryRef = useRef(new Map());

  const register = useCallback((metadata) => {
    const registryKey = [
      metadata.categoryKey,
      metadata.itemKey,
      metadata.name,
    ].join(":");

    registryRef.current.set(registryKey, metadata);

    return () => {
      registryRef.current.delete(registryKey);
    };
  }, []);

  const collect = useCallback(() => {
    return createConditionDisplayRows(
      Array.from(registryRef.current.values()),
      (fieldName) => getValues(fieldName),
    );
  }, [getValues]);

  const contextValue = useMemo(
    () => ({ register, collect }),
    [collect, register],
  );

  return (
    <ConditionCollectorContext.Provider value={contextValue}>
      {children}
    </ConditionCollectorContext.Provider>
  );
}

/**
 * 기존 카테고리 DOM을 변경하지 않고 최상위 표시 라벨만 Context로 전달한다.
 */
export function ConditionCategory({
  categoryKey,
  label,
  children,
}) {
  const contextValue = useMemo(
    () => ({
      categoryKey,
      categoryLabel: label,
    }),
    [categoryKey, label],
  );

  return (
    <ConditionCategoryContext.Provider value={contextValue}>
      {children}
    </ConditionCategoryContext.Provider>
  );
}

/**
 * 무라벨 FormItem을 "/"로 합칠 category-item 경계를 정의한다.
 */
export function ConditionCategoryItem({
  itemKey = "default",
  children,
}) {
  const contextValue = useMemo(() => ({ itemKey }), [itemKey]);

  return (
    <ConditionCategoryItemContext.Provider value={contextValue}>
      {children}
    </ConditionCategoryItemContext.Provider>
  );
}

export function useConditionCollector() {
  const context = useContext(ConditionCollectorContext);

  if (!context) {
    throw new Error(
      "useConditionCollector는 ConditionCollectorProvider 내부에서 사용해야 합니다.",
    );
  }

  return context;
}

export function useConditionLocation() {
  const category = useContext(ConditionCategoryContext);
  const categoryItem = useContext(ConditionCategoryItemContext);

  if (!category) {
    throw new Error(
      "ConditionFormItem은 ConditionCategory 내부에서 사용해야 합니다.",
    );
  }

  return {
    ...category,
    itemKey: categoryItem?.itemKey ?? "default",
  };
}
