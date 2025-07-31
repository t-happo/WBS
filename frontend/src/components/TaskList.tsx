import React, { useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, DatePicker, message, Space, Popconfirm, Tag, Tabs, Progress } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LinkOutlined } from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksAPI, Task, TaskDependency } from '../services/api';
import { useParams } from 'react-router-dom';
import dayjs from 'dayjs';

const { Option } = Select;
const { RangePicker } = DatePicker;

interface TaskListProps {}

const TaskList: React.FC<TaskListProps> = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isDependencyModalVisible, setIsDependencyModalVisible] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState('tasks');
  const [form] = Form.useForm();
  const [dependencyForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: () => tasksAPI.getByProject(Number(projectId)).then(res => {
      console.log('TaskList query executed, got tasks:', res.data?.length);
      return res.data;
    }),
    enabled: !!projectId,
  });

  const { data: dependencies, isLoading: isDependenciesLoading } = useQuery({
    queryKey: ['dependencies', projectId],
    queryFn: () => tasksAPI.getDependencies(Number(projectId)).then(res => res.data),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: tasksAPI.create,
    onSuccess: () => {
      message.success('タスクを作成しました');
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['gantt', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
      setIsModalVisible(false);
      form.resetFields();
    },
    onError: (error: any) => {
      message.error(`タスクの作成に失敗しました: ${error.response?.data?.detail || error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Task> }) =>
      tasksAPI.update(id, data),
    onSuccess: (result, variables) => {
      console.log('Task updated successfully from TaskList:', variables.id, result);
      console.log('Invalidating queries for projectId:', projectId, typeof projectId);
      message.success('タスクを更新しました');
      
      // より明示的なクエリ無効化と強制リフェッチ
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', projectId],
        exact: false,
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gantt', projectId],
        exact: false,
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dependencies', projectId],
        exact: false,
        refetchType: 'active'
      });
      
      console.log('All queries invalidated successfully');
      setIsModalVisible(false);
      setEditingTask(null);
      form.resetFields();
    },
    onError: (error: any) => {
      console.error('Task update failed from TaskList:', error);
      message.error('タスクの更新に失敗しました');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: tasksAPI.delete,
    onSuccess: (result, taskId) => {
      console.log('Task deleted successfully from TaskList:', taskId, result);
      message.success('タスクを削除しました');
      
      // より明示的なクエリ無効化と強制リフェッチ
      queryClient.invalidateQueries({ 
        queryKey: ['tasks', projectId],
        exact: false,
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['gantt', projectId],
        exact: false,
        refetchType: 'active'
      });
      queryClient.invalidateQueries({ 
        queryKey: ['dependencies', projectId],
        exact: false,
        refetchType: 'active'
      });
      
      console.log('Queries invalidated after delete for projectId:', projectId);
    },
    onError: (error: any) => {
      console.error('Task delete failed from TaskList:', error);
      message.error('タスクの削除に失敗しました');
    },
  });

  const createDependencyMutation = useMutation({
    mutationFn: tasksAPI.createDependency,
    onSuccess: () => {
      message.success('依存関係を作成しました');
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
      queryClient.invalidateQueries({ queryKey: ['gantt', projectId] });
      setIsDependencyModalVisible(false);
      dependencyForm.resetFields();
    },
    onError: (error: any) => {
      console.error('Dependency creation failed:', error);
      const errorMessage = error.response?.data?.detail || error.message;
      if (errorMessage.includes('already exists')) {
        message.error('この依存関係は既に存在します');
      } else {
        message.error(`依存関係の作成に失敗しました: ${errorMessage}`);
      }
    },
  });

  const deleteDependencyMutation = useMutation({
    mutationFn: tasksAPI.deleteDependency,
    onSuccess: () => {
      message.success('依存関係を削除しました');
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
      queryClient.invalidateQueries({ queryKey: ['gantt', projectId] });
    },
    onError: () => {
      message.error('依存関係の削除に失敗しました');
    },
  });

  const handleCreate = () => {
    setEditingTask(null);
    form.resetFields();
    form.setFieldsValue({ project_id: Number(projectId) });
    setIsModalVisible(true);
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    const formData = {
      ...task,
      date_range: task.start_date && task.end_date 
        ? [dayjs(task.start_date), dayjs(task.end_date)]
        : undefined,
    };
    form.setFieldsValue(formData);
    setIsModalVisible(true);
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate(id);
  };

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      const { date_range, ...taskData } = values;
      
      if (date_range) {
        taskData.start_date = date_range[0].format('YYYY-MM-DD');
        taskData.end_date = date_range[1].format('YYYY-MM-DD');
      }

      if (editingTask) {
        updateMutation.mutate({ id: editingTask.id, data: taskData });
      } else {
        createMutation.mutate(taskData);
      }
    } catch (error) {
      message.error('入力値を確認してください');
    }
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setEditingTask(null);
    form.resetFields();
  };

  const handleCreateDependency = () => {
    dependencyForm.resetFields();
    dependencyForm.setFieldsValue({
      dependency_type: 'finish_to_start',
      lag_days: 0
    });
    setIsDependencyModalVisible(true);
  };

  const handleDependencyOk = async () => {
    try {
      console.log('Attempting to create dependency...');
      const values = await dependencyForm.validateFields();
      console.log('Dependency form values:', values);
      
      // Check for self-dependency
      if (values.predecessor_id === values.successor_id) {
        console.log('Self-dependency detected, preventing creation');
        message.error('同じタスクに依存関係を設定することはできません');
        return;
      }
      
      console.log('Creating dependency with values:', values);
      createDependencyMutation.mutate(values);
    } catch (error) {
      console.error('Dependency creation validation error:', error);
      message.error('入力値を確認してください');
    }
  };

  const handleDependencyCancel = () => {
    setIsDependencyModalVisible(false);
    dependencyForm.resetFields();
  };

  const handleDeleteDependency = (id: number) => {
    deleteDependencyMutation.mutate(id);
  };

  const getTaskTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      phase: 'blue',
      task: 'green',
      detail_task: 'orange',
    };
    return colors[type] || 'default';
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      not_started: 'default',
      in_progress: 'processing',
      completed: 'success',
      on_hold: 'warning',
    };
    return colors[status] || 'default';
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      low: 'default',
      medium: 'processing',
      high: 'warning',
      critical: 'error',
    };
    return colors[priority] || 'default';
  };

  const columns = [
    {
      title: 'タスク名',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'タイプ',
      dataIndex: 'task_type',
      key: 'task_type',
      width: 100,
      render: (type: string) => (
        <Tag color={getTaskTypeColor(type)}>
          {type === 'phase' ? 'フェーズ' : 
           type === 'task' ? 'タスク' : '詳細タスク'}
        </Tag>
      ),
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {status === 'not_started' ? '未開始' :
           status === 'in_progress' ? '進行中' :
           status === 'completed' ? '完了' : '保留'}
        </Tag>
      ),
    },
    {
      title: '優先度',
      dataIndex: 'priority',
      key: 'priority',
      width: 80,
      render: (priority: string) => (
        <Tag color={getPriorityColor(priority)}>
          {priority === 'low' ? '低' :
           priority === 'medium' ? '中' :
           priority === 'high' ? '高' : '緊急'}
        </Tag>
      ),
    },
    {
      title: '予定工数',
      dataIndex: 'estimated_hours',
      key: 'estimated_hours',
      width: 80,
      render: (hours: number) => hours ? `${hours}h` : '-',
    },
    {
      title: '実績工数',
      dataIndex: 'actual_hours',
      key: 'actual_hours',
      width: 80,
      render: (hours: number) => hours ? `${hours}h` : '-',
    },
    {
      title: '進捗率',
      dataIndex: 'progress_percentage',
      key: 'progress_percentage',
      width: 100,
      render: (progress: number) => (
        <Progress 
          percent={progress || 0} 
          size="small" 
          status={progress === 100 ? 'success' : progress > 0 ? 'active' : 'normal'}
        />
      ),
    },
    {
      title: '開始日',
      dataIndex: 'start_date',
      key: 'start_date',
      width: 100,
      render: (date: string) => date ? new Date(date).toLocaleDateString('ja-JP') : '-',
    },
    {
      title: '終了日',
      dataIndex: 'end_date',
      key: 'end_date',
      width: 100,
      render: (date: string) => date ? new Date(date).toLocaleDateString('ja-JP') : '-',
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: Task) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            編集
          </Button>
          <Popconfirm
            title="タスクを削除しますか？"
            onConfirm={() => handleDelete(record.id)}
            okText="はい"
            cancelText="いいえ"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />}>
              削除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const dependencyColumns = [
    {
      title: '先行タスク',
      dataIndex: 'predecessor_name',
      key: 'predecessor_name',
      width: 200,
    },
    {
      title: '後続タスク',
      dataIndex: 'successor_name',
      key: 'successor_name',
      width: 200,
    },
    {
      title: '依存タイプ',
      dataIndex: 'dependency_type',
      key: 'dependency_type',
      width: 120,
      render: (type: string) => {
        const typeMap: { [key: string]: string } = {
          finish_to_start: '完了→開始',
          start_to_start: '開始→開始',
          finish_to_finish: '完了→完了',
          start_to_finish: '開始→完了',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: 'ラグ日数',
      dataIndex: 'lag_days',
      key: 'lag_days',
      width: 80,
      render: (lag: number) => `${lag}日`,
    },
    {
      title: '操作',
      key: 'actions',
      width: 80,
      render: (_: any, record: TaskDependency) => (
        <Popconfirm
          title="依存関係を削除しますか？"
          onConfirm={() => handleDeleteDependency(record.id)}
          okText="はい"
          cancelText="いいえ"
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>
            削除
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const tabItems = [
    {
      key: 'tasks',
      label: 'タスク一覧',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新規タスク
            </Button>
          </div>
          <Table
            dataSource={tasks}
            columns={columns}
            rowKey="id"
            loading={isLoading}
            scroll={{ x: 1000 }}
            size="small"
          />
        </div>
      ),
    },
    {
      key: 'dependencies',
      label: (
        <span>
          <LinkOutlined />
          依存関係
        </span>
      ),
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<LinkOutlined />} onClick={handleCreateDependency}>
              依存関係追加
            </Button>
          </div>
          <Table
            dataSource={dependencies}
            columns={dependencyColumns}
            rowKey="id"
            loading={isDependenciesLoading}
            size="small"
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />

      <Modal
        title={editingTask ? 'タスク編集' : '新規タスク作成'}
        open={isModalVisible}
        onOk={handleOk}
        onCancel={handleCancel}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="タスク名"
            rules={[{ required: true, message: 'タスク名を入力してください' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="description" label="説明">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item name="project_id" hidden>
            <Input type="hidden" />
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item
              name="task_type"
              label="タスクタイプ"
              rules={[{ required: true, message: 'タスクタイプを選択してください' }]}
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="phase">フェーズ</Option>
                <Option value="task">タスク</Option>
                <Option value="detail_task">詳細タスク</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="priority"
              label="優先度"
              rules={[{ required: true, message: '優先度を選択してください' }]}
              style={{ flex: 1 }}
            >
              <Select>
                <Option value="low">低</Option>
                <Option value="medium">中</Option>
                <Option value="high">高</Option>
                <Option value="critical">緊急</Option>
              </Select>
            </Form.Item>
          </div>

          <Form.Item
            name="status"
            label="ステータス"
            rules={[{ required: true, message: 'ステータスを選択してください' }]}
          >
            <Select>
              <Option value="not_started">未開始</Option>
              <Option value="in_progress">進行中</Option>
              <Option value="completed">完了</Option>
              <Option value="on_hold">保留</Option>
            </Select>
          </Form.Item>

          <div style={{ display: 'flex', gap: 16 }}>
            <Form.Item name="estimated_hours" label="予定工数" style={{ flex: 1 }}>
              <InputNumber min={0} step={0.5} addonAfter="時間" style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item name="actual_hours" label="実績工数" style={{ flex: 1 }}>
              <InputNumber min={0} step={0.5} addonAfter="時間" style={{ width: '100%' }} />
            </Form.Item>
          </div>

          <Form.Item name="date_range" label="期間">
            <RangePicker style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="依存関係追加"
        open={isDependencyModalVisible}
        onOk={handleDependencyOk}
        onCancel={handleDependencyCancel}
        confirmLoading={createDependencyMutation.isPending}
        okButtonProps={{ 
          loading: createDependencyMutation.isPending,
          disabled: createDependencyMutation.isPending 
        }}
        width={500}
      >
        <Form form={dependencyForm} layout="vertical">
          <Form.Item
            name="predecessor_id"
            label="先行タスク"
            rules={[{ required: true, message: '先行タスクを選択してください' }]}
          >
            <Select placeholder="先行タスクを選択">
              {tasks?.map(task => (
                <Option key={task.id} value={task.id}>
                  {task.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="successor_id"
            label="後続タスク"
            rules={[{ required: true, message: '後続タスクを選択してください' }]}
          >
            <Select placeholder="後続タスクを選択">
              {tasks?.map(task => (
                <Option key={task.id} value={task.id}>
                  {task.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="dependency_type"
            label="依存タイプ"
            rules={[{ required: true, message: '依存タイプを選択してください' }]}
          >
            <Select defaultValue="finish_to_start">
              <Option value="finish_to_start">完了→開始</Option>
              <Option value="start_to_start">開始→開始</Option>
              <Option value="finish_to_finish">完了→完了</Option>
              <Option value="start_to_finish">開始→完了</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="lag_days"
            label="ラグ日数"
          >
            <InputNumber min={-365} max={365} defaultValue={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TaskList;