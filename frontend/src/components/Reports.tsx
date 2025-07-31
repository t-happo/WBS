import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Table, Select, DatePicker, Button, Space, Divider, Dropdown, message } from 'antd';
import { BarChartOutlined, ProjectOutlined, CheckCircleOutlined, ClockCircleOutlined, FileExcelOutlined, DownOutlined, FilePdfOutlined, FileTextOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { projectsAPI, tasksAPI } from '../services/api';

interface ProjectProgress {
  id: number;
  name: string;
  status: string;
  total_tasks: number;
  completed_tasks: number;
  progress: number;
}

interface ProjectProgressData {
  key: number;
  name: string;
  status: string;
  tasks: number;
  completed: number;
  progress: number;
}

const { Option } = Select;
const { RangePicker } = DatePicker;

const Reports: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<number | undefined>();
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);

  // プロジェクト一覧取得
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsAPI.getAll().then(res => res.data),
  });

  // 統計データ取得
  const { data: statisticsData, isLoading: isStatsLoading } = useQuery({
    queryKey: ['statistics'],
    queryFn: () => projectsAPI.getStatistics().then(res => res.data),
  });

  const statsData = {
    totalProjects: statisticsData?.project_stats?.total_projects || 0,
    activeProjects: statisticsData?.project_stats?.active_projects || 0,
    completedProjects: statisticsData?.project_stats?.completed_projects || 0,
    totalTasks: statisticsData?.task_stats?.total_tasks || 0,
    completedTasks: statisticsData?.task_stats?.completed_tasks || 0,
    overdueTasks: statisticsData?.task_stats?.overdue_tasks || 0,
  };

  // プロジェクト進捗データ（実データ）
  const projectProgressData: ProjectProgressData[] = statisticsData?.project_progress?.map((project: ProjectProgress) => ({
    key: project.id,
    name: project.name,
    status: project.status,
    tasks: project.total_tasks,
    completed: project.completed_tasks,
    progress: project.progress,
  })) || [];

  // タスク統計データ（実データ）
  const taskStatsData = [
    { 
      status: '未開始', 
      count: statisticsData?.task_stats?.not_started_tasks || 0, 
      color: '#d9d9d9' 
    },
    { 
      status: '進行中', 
      count: statisticsData?.task_stats?.in_progress_tasks || 0, 
      color: '#1890ff' 
    },
    { 
      status: '完了', 
      count: statisticsData?.task_stats?.completed_tasks || 0, 
      color: '#52c41a' 
    },
    { 
      status: '保留', 
      count: statisticsData?.task_stats?.on_hold_tasks || 0, 
      color: '#faad14' 
    },
  ];

  const projectColumns = [
    {
      title: 'プロジェクト名',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'ステータス',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusMap: { [key: string]: { text: string; color: string } } = {
          planning: { text: '計画中', color: '#d9d9d9' },
          active: { text: '進行中', color: '#1890ff' },
          completed: { text: '完了', color: '#52c41a' },
          on_hold: { text: '保留', color: '#faad14' },
        };
        const statusInfo = statusMap[status] || { text: status, color: '#d9d9d9' };
        return <span style={{ color: statusInfo.color }}>{statusInfo.text}</span>;
      },
    },
    {
      title: 'タスク数',
      dataIndex: 'tasks',
      key: 'tasks',
    },
    {
      title: '完了タスク',
      dataIndex: 'completed',
      key: 'completed',
    },
    {
      title: '進捗率',
      dataIndex: 'progress',
      key: 'progress',
      render: (progress: number) => `${progress}%`,
    },
  ];

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      message.loading('エクスポート中...', 0);
      await projectsAPI.exportProjects(format, selectedProject);
      message.destroy();
      message.success(`${format.toUpperCase()}ファイルをダウンロードしました`);
    } catch (error: any) {
      message.destroy();
      message.error(`エクスポートに失敗しました: ${error.response?.data?.detail || error.message}`);
      console.error('Export error:', error);
    }
  };

  // エクスポートメニュー
  const exportMenuItems = [
    {
      key: 'csv',
      label: 'CSV形式',
      icon: <FileTextOutlined />,
      onClick: () => handleExport('csv'),
    },
    {
      key: 'excel',
      label: 'Excel形式',
      icon: <FileExcelOutlined />,
      onClick: () => handleExport('excel'),
    },
    {
      key: 'pdf',
      label: 'PDF形式',
      icon: <FilePdfOutlined />,
      onClick: () => handleExport('pdf'),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>レポート・分析</h2>
        <Space>
          <Select
            placeholder="プロジェクト選択"
            style={{ width: 200 }}
            value={selectedProject}
            onChange={setSelectedProject}
          >
            <Option value={undefined}>全プロジェクト</Option>
            {projects?.map(project => (
              <Option key={project.id} value={project.id}>
                {project.name}
              </Option>
            ))}
          </Select>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder={['開始日', '終了日']}
          />
          <Dropdown
            menu={{ items: exportMenuItems }}
            trigger={['click']}
          >
            <Button type="primary" icon={<FileExcelOutlined />}>
              エクスポート <DownOutlined />
            </Button>
          </Dropdown>
        </Space>
      </div>

      {/* 統計カード */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card loading={isStatsLoading}>
            <Statistic
              title="総プロジェクト数"
              value={statsData.totalProjects}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={isStatsLoading}>
            <Statistic
              title="進行中プロジェクト"
              value={statsData.activeProjects}
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={isStatsLoading}>
            <Statistic
              title="完了プロジェクト"
              value={statsData.completedProjects}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card loading={isStatsLoading}>
            <Statistic
              title="期限超過タスク"
              value={statsData.overdueTasks}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        {/* プロジェクト進捗表 */}
        <Col span={16}>
          <Card title="プロジェクト進捗一覧" style={{ marginBottom: 16 }} loading={isStatsLoading}>
            <Table
              dataSource={projectProgressData}
              columns={projectColumns}
              pagination={{ pageSize: 10 }}
              size="small"
              loading={isStatsLoading}
            />
          </Card>
        </Col>

        {/* タスク統計 */}
        <Col span={8}>
          <Card title="タスク統計" style={{ marginBottom: 16 }} loading={isStatsLoading}>
            <div style={{ padding: '16px 0' }}>
              {taskStatsData.map((item, index) => (
                <div key={index} style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        backgroundColor: item.color,
                        borderRadius: '50%',
                        marginRight: 8,
                      }}
                    />
                    <span>{item.status}</span>
                  </div>
                  <span style={{ fontWeight: 'bold', color: item.color }}>
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
            <Divider />
            <div style={{ textAlign: 'center' }}>
              <Statistic
                title="総タスク数"
                value={taskStatsData.reduce((sum, item) => sum + item.count, 0)}
                valueStyle={{ color: '#1890ff' }}
              />
            </div>
          </Card>

          {/* プロジェクト効率指標 */}
          <Card title="効率指標" loading={isStatsLoading}>
            <div style={{ padding: '16px 0' }}>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>完了率</span>
                  <span style={{ fontWeight: 'bold', color: '#52c41a' }}>
                    {Math.round((statsData.completedTasks / (statsData.totalTasks || 1)) * 100)}%
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 8,
                    backgroundColor: '#f0f0f0',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round((statsData.completedTasks / (statsData.totalTasks || 1)) * 100)}%`,
                      height: '100%',
                      backgroundColor: '#52c41a',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>平均進捗</span>
                  <span style={{ fontWeight: 'bold', color: '#1890ff' }}>
                    {Math.round(projectProgressData.reduce((sum: number, p: ProjectProgressData) => sum + p.progress, 0) / (projectProgressData.length || 1))}%
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: 8,
                    backgroundColor: '#f0f0f0',
                    borderRadius: 4,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.round(projectProgressData.reduce((sum: number, p: ProjectProgressData) => sum + p.progress, 0) / (projectProgressData.length || 1))}%`,
                      height: '100%',
                      backgroundColor: '#1890ff',
                    }}
                  />
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Reports;