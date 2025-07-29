import React, { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, Spin, message } from 'antd';
import { tasksAPI } from '../services/api';
import { useParams } from 'react-router-dom';

// DHTMLX Gantt types
declare global {
  interface Window {
    gantt: any;
  }
}

interface GanttTask {
  id: number;
  name: string;
  description: string;
  task_type: string;
  status: string;
  priority: string;
  estimated_hours: number;
  actual_hours: number;
  start_date: string | null;
  end_date: string | null;
  parent_task_id: number | null;
  created_at: string;
}

interface GanttLink {
  id: number;
  source: number;
  target: number;
  type: string;
  lag: number;
}

interface GanttData {
  tasks: GanttTask[];
  links: GanttLink[];
}

interface GanttChartProps {}

const GanttChart: React.FC<GanttChartProps> = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const ganttRef = useRef<HTMLDivElement>(null);
  
  const { data: ganttData, isLoading, error } = useQuery<GanttData, Error>({
    queryKey: ['gantt', projectId],
    queryFn: () => tasksAPI.getGanttData(Number(projectId)).then(res => res.data),
    enabled: !!projectId,
    retry: 1,
  });


  useEffect(() => {
    // Load DHTMLX Gantt CSS and JS
    const loadGanttAssets = async () => {
      // Load CSS
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = 'https://cdn.dhtmlx.com/gantt/edge/dhtmlxgantt.css';
      document.head.appendChild(css);

      // Load JS
      const script = document.createElement('script');
      script.src = 'https://cdn.dhtmlx.com/gantt/edge/dhtmlxgantt.js';
      script.onload = () => {
        initializeGantt();
      };
      document.head.appendChild(script);
    };

    const initializeGantt = () => {
      if (!window.gantt || !ganttRef.current) return;

      const gantt = window.gantt;

      // Configure Gantt
      gantt.config.date_format = '%Y-%m-%d';
      gantt.config.columns = [
        { name: 'text', label: 'タスク名', width: 200, tree: true },
        { name: 'type', label: 'タイプ', width: 80, template: (task: any) => {
          const typeMap: { [key: string]: string } = {
            phase: 'フェーズ',
            task: 'タスク',
            detail_task: '詳細タスク'
          };
          return typeMap[task.type] || task.type;
        }},
        { name: 'duration', label: '期間', width: 60 },
        { name: 'start_date', label: '開始日', width: 80 },
        { name: 'end_date', label: '終了日', width: 80 }
      ];

      // Set scale
      gantt.config.scales = [
        { unit: 'month', step: 1, format: '%Y年%m月' },
        { unit: 'day', step: 1, format: '%d' }
      ];

      // Configure task types
      gantt.config.types = {
        task: 'task',
        phase: 'project',
        detail_task: 'task'
      };

      // Initialize gantt
      gantt.init(ganttRef.current);

      // Load data if available
      if (ganttData) {
        loadGanttData(ganttData);
      }
    };

    loadGanttAssets();

    return () => {
      // Cleanup
      if (window.gantt && ganttRef.current) {
        window.gantt.clearAll();
      }
    };
  }, []);

  useEffect(() => {
    if (ganttData && window.gantt) {
      loadGanttData(ganttData);
    }
  }, [ganttData]);

  const loadGanttData = (data: GanttData) => {
    if (!window.gantt) return;

    const gantt = window.gantt;
    
    try {
      // Transform task data for Gantt
      const transformedData = {
        data: data.tasks?.map((task: GanttTask) => {
          // Handle null dates by providing defaults
          let startDate = task.start_date;
          let endDate = task.end_date;
          
          if (!startDate) {
            startDate = new Date().toISOString().split('T')[0];
          } else if (startDate.includes(' ')) {
            // Convert datetime to date
            startDate = startDate.split(' ')[0];
          }
          
          if (!endDate) {
            const start = new Date(startDate);
            const end = new Date(start);
            end.setDate(start.getDate() + (task.estimated_hours ? Math.ceil(task.estimated_hours / 8) : 7));
            endDate = end.toISOString().split('T')[0];
          } else if (endDate.includes(' ')) {
            // Convert datetime to date
            endDate = endDate.split(' ')[0];
          }
          
          return {
            id: task.id,
            text: task.name,
            start_date: startDate,
            end_date: endDate,
            duration: task.estimated_hours ? Math.ceil(task.estimated_hours / 8) : 1,
            progress: task.status === 'completed' ? 1 : 
                     task.status === 'in_progress' ? 0.5 : 0,
            type: task.task_type,
            parent: task.parent_task_id || 0,
            priority: task.priority,
            status: task.status,
            description: task.description
          };
        }) || [],
        links: data.links?.map((link: GanttLink) => ({
          id: link.id,
          source: link.source,
          target: link.target,
          type: link.type === 'finish_to_start' ? '0' : 
                link.type === 'start_to_start' ? '1' :
                link.type === 'finish_to_finish' ? '2' : '3',
          lag: link.lag
        })) || []
      };

      gantt.clearAll();
      gantt.parse(transformedData);
    } catch (err) {
      message.error('ガントチャートデータの読み込みに失敗しました');
    }
  };

  if (error) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>ガントチャートの読み込みに失敗しました</p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            エラー: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </Card>
    );
  }

  if (!ganttData || !ganttData.tasks || ganttData.tasks.length === 0) {
    return (
      <Card title="ガントチャート">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>表示するタスクがありません</p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            まずはタスクを作成してください
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="ガントチャート" style={{ height: '600px' }}>
      {isLoading ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '500px' 
        }}>
          <Spin size="large" />
        </div>
      ) : (
        <div 
          ref={ganttRef} 
          style={{ 
            width: '100%', 
            height: '500px',
            border: '1px solid #d9d9d9',
            borderRadius: '6px'
          }} 
        />
      )}
    </Card>
  );
};

export default GanttChart;