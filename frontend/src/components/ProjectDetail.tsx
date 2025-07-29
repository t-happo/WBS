import React, { useState } from 'react';
import { Tabs, Button, Space } from 'antd';
import { TableOutlined, BarChartOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsAPI } from '../services/api';
import TaskList from './TaskList';
import GanttChart from './GanttChart';

const ProjectDetail: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('tasks');

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsAPI.getById(Number(projectId)).then(res => res.data),
    enabled: !!projectId,
  });

  const tabItems = [
    {
      key: 'tasks',
      label: (
        <span>
          <TableOutlined />
          タスク一覧
        </span>
      ),
      children: <TaskList />,
    },
    {
      key: 'gantt',
      label: (
        <span>
          <BarChartOutlined />
          ガントチャート
        </span>
      ),
      children: <GanttChart />,
    },
  ];

  if (isLoading) {
    return <div>読み込み中...</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/projects')}
          >
            プロジェクト一覧に戻る
          </Button>
          <h2 style={{ margin: 0 }}>{project?.name}</h2>
        </Space>
        {project?.description && (
          <p style={{ color: '#666', marginTop: 8 }}>
            {project.description}
          </p>
        )}
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        size="large"
      />
    </div>
  );
};

export default ProjectDetail;