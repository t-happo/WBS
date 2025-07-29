import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsAPI, Project } from '../services/api';
import { useNavigate } from 'react-router-dom';

const { Option } = Select;

const ProjectList: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.getAll().then(res => res.data),
  });

  const createMutation = useMutation({
    mutationFn: projectsAPI.create,
    onSuccess: () => {
      message.success('プロジェクトを作成しました');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      console.error('Create project error:', error);
      message.error(`プロジェクトの作成に失敗しました: ${error.response?.data?.detail || error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Project> }) =>
      projectsAPI.update(id, data),
    onSuccess: () => {
      message.success('プロジェクトを更新しました');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsModalVisible(false);
      setEditingProject(null);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(`プロジェクトの更新に失敗しました: ${error.response?.data?.detail || error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: projectsAPI.delete,
    onSuccess: () => {
      message.success('プロジェクトを削除しました');
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
    onError: () => {
      message.error('プロジェクトの削除に失敗しました');
    },
  });

  const handleCreate = () => {
    setEditingProject(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    form.setFieldsValue(project);
    setIsModalVisible(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingProject) {
        updateMutation.mutate({ id: editingProject.id, data: values });
      } else {
        createMutation.mutate(values);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingProject(null);
    form.resetFields();
  };

  const columns = [
    {
      title: 'プロジェクト名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '説明',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: { [key: string]: string } = {
          planning: '計画中',
          active: '進行中',
          completed: '完了',
          on_hold: '保留',
        };
        return statusMap[status] || status;
      },
    },
    {
      title: '作成日',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString('ja-JP'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: Project) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/projects/${record.id}`)}
          >
            詳細
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="プロジェクトを削除しますか？"
            onConfirm={() => handleDelete(record.id)}
            okText="はい"
            cancelText="いいえ"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              削除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新規プロジェクト
        </Button>
      </div>

      <Table
        dataSource={projects}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />

      <Modal
        title={editingProject ? 'プロジェクト編集' : '新規プロジェクト作成'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="プロジェクト名"
            rules={[{ required: true, message: 'プロジェクト名を入力してください' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="説明">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item
            name="status"
            label="ステータス"
            rules={[{ required: true, message: 'ステータスを選択してください' }]}
          >
            <Select>
              <Option value="planning">計画中</Option>
              <Option value="active">進行中</Option>
              <Option value="completed">完了</Option>
              <Option value="on_hold">保留</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ProjectList;