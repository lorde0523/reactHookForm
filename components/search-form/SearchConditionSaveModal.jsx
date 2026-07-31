"use client";

import { DatabaseOutlined, SaveOutlined } from "@ant-design/icons";
import { Alert, Input, Modal, Space } from "antd";
import { useState } from "react";
import SearchConditionSummary from "./SearchConditionSummary";

export default function SearchConditionSaveModal({
  open,
  snapshot,
  saving,
  onCancel,
  onSave,
}) {
  const [conditionName, setConditionName] = useState("");

  const submit = () => {
    onSave(conditionName.trim());
  };

  return (
    <Modal
      title={
        <Space>
          <span className="modal-title-icon">
            <SaveOutlined />
          </span>
          조회조건 저장 확인
        </Space>
      }
      open={open}
      onCancel={onCancel}
      onOk={submit}
      afterClose={() => setConditionName("")}
      okText="DB 저장"
      cancelText="취소"
      confirmLoading={saving}
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
            onPressEnter={submit}
            placeholder="예: 이번 달 처리 대기 건"
            maxLength={40}
            showCount
            autoFocus
            size="large"
          />
        </div>

        <SearchConditionSummary items={snapshot?.displayValues ?? []} />
      </div>
    </Modal>
  );
}
