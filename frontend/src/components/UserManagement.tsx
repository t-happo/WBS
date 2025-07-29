import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, message, Space, Popconfirm, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../services/api';

const { Option } = Select;

interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

const UserManagement: React.FC = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  // For now, we'll create a simple user list
  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => Promise.resolve([
      {
        id: 1,
        username: 'admin',
        email: 'admin@example.com',
        full_name: 'システム管理者',
        role: 'system_admin',
        is_active: true,
        created_at: '2025-07-29T00:00:00Z'
      }
    ]),
  });

  const handleCreate = () => {
    setEditingUser(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue(user);
    setIsModalVisible(true);
  };

  const handleDelete = (id: number) => {
    message.success('ユーザーを削除しました（デモ）');
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      if (editingUser) {
        message.success('ユーザーを更新しました（デモ）');
      } else {
        message.success('ユーザーを作成しました（デモ）');
      }
      setIsModalVisible(false);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingUser(null);
    form.resetFields();
  };

  const getRoleColor = (role: string) => {
    const colors: { [key: string]: string } = {
      system_admin: 'red',
      project_owner: 'purple',
      project_manager: 'blue',
      team_member: 'green',
      viewer: 'default',
    };
    return colors[role] || 'default';
  };

  const getRoleLabel = (role: string) => {
    const labels: { [key: string]: string } = {
      system_admin: 'システム管理者',
      project_owner: 'プロジェクトオーナー',
      project_manager: 'プロジェクトマネージャー',
      team_member: 'チームメンバー',
      viewer: '閲覧者',
    };
    return labels[role] || role;
  };

  const columns = [
    {
      title: 'ユーザー名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'フルネーム',
      dataIndex: 'full_name',
      key: 'full_name',
    },
    {
      title: 'メールアドレス',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '役割',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => (
        <Tag color={getRoleColor(role)}>
          {getRoleLabel(role)}
        </Tag>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'default'}>
          {isActive ? 'アクティブ' : '無効'}
        </Tag>
      ),
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
      render: (_: any, record: User) => (
        <Space size="middle">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="ユーザーを削除しますか？"
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>ユーザー管理</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          新規ユーザー
        </Button>
      </div>

      <Table
        dataSource={users}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />

      <Modal
        title={editingUser ? 'ユーザー編集' : '新規ユーザー作成'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="username"
            label="ユーザー名"
            rules={[{ required: true, message: 'ユーザー名を入力してください' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="full_name"
            label="フルネーム"
            rules={[{ required: true, message: 'フルネームを入力してください' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="email"
            label="メールアドレス"
            rules={[
              { required: true, message: 'メールアドレスを入力してください' },
              { type: 'email', message: '有効なメールアドレスを入力してください' }
            ]}
          >
            <Input />
          </Form.Item>

          {!editingUser && (
            <Form.Item
              name="password"
              label="パスワード"
              rules={[{ required: true, message: 'パスワードを入力してください' }]}
            >
              <Input.Password />
            </Form.Item>
          )}

          <Form.Item
            name="role"
            label="役割"
            rules={[{ required: true, message: '役割を選択してください' }]}
          >
            <Select>
              <Option value="system_admin">システム管理者</Option>
              <Option value="project_owner">プロジェクトオーナー</Option>
              <Option value="project_manager">プロジェクトマネージャー</Option>
              <Option value="team_member">チームメンバー</Option>
              <Option value="viewer">閲覧者</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="is_active"
            label="ステータス"
            rules={[{ required: true, message: 'ステータスを選択してください' }]}
          >
            <Select>
              <Option value={true}>アクティブ</Option>
              <Option value={false}>無効</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;