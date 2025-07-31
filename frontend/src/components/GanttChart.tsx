import React, { useEffect } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Card, Spin, message } from 'antd';
import { tasksAPI } from '../services/api';
import { useParams } from 'react-router-dom';
import { useGanttChart } from '../hooks/useGanttChart-simple';

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
  const queryClient = useQueryClient();
  const { ganttRef, isInitialized, isLoading: ganttLoading, loadData } = useGanttChart(projectId);
  
  const { data: ganttData, isLoading, error } = useQuery<GanttData, Error>({
    queryKey: ['gantt', projectId],
    queryFn: async () => {
      try {
        console.log('GanttChart query starting for projectId:', projectId);
        const res = await tasksAPI.getGanttData(Number(projectId));
        console.log('GanttChart query executed, got data:', res.data?.tasks?.length, 'tasks,', res.data?.links?.length, 'links');
        console.log('Full gantt data:', res.data);
        return res.data;
      } catch (error) {
        console.error('GanttChart query failed:', error);
        throw error;
      }
    },
    enabled: !!projectId,
    retry: 1,
  });

  // タスク更新のmutation
  const updateTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      tasksAPI.update(id, data),
    onSuccess: (data, variables) => {
      console.log('Task updated successfully from Gantt:', variables.id, data);
      console.log('Invalidating queries for projectId from Gantt:', projectId, typeof projectId);
      
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
      
      console.log('All queries invalidated successfully from Gantt');
      message.success('タスクを更新しました');
    },
    onError: (error: any) => {
      console.error('Task update failed from Gantt:', error);
      message.error(`タスクの更新に失敗しました: ${error.response?.data?.detail || error.message}`);
    },
  });

  // 依存関係作成のmutation
  const createDependencyMutation = useMutation({
    mutationFn: tasksAPI.createDependency,
    onSuccess: () => {
      message.success('依存関係を作成しました');
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['gantt', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
    },
    onError: (error: any) => {
      message.error(`依存関係の作成に失敗しました: ${error.response?.data?.detail || error.message}`);
    },
  });

  // 依存関係削除のmutation
  const deleteDependencyMutation = useMutation({
    mutationFn: tasksAPI.deleteDependency,
    onSuccess: () => {
      message.success('依存関係を削除しました');
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      queryClient.invalidateQueries({ queryKey: ['gantt', projectId] });
      queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] });
    },
    onError: (error: any) => {
      message.error(`依存関係の削除に失敗しました: ${error.response?.data?.detail || error.message}`);
    },
  });


  // ガントチャートのイベントハンドラを設定
  const setupGanttEventHandlers = (gantt: any) => {
    // タスクの日程変更時
    gantt.attachEvent("onAfterTaskDrag", (id: number, mode: string, task: any) => {
      if (mode === "resize" || mode === "move") {
        updateTaskFromGantt(task);
      }
    });

    // タスクの進捗変更時
    gantt.attachEvent("onAfterProgressDrag", (id: number, progress: number, task: any) => {
      updateTaskFromGantt({ ...task, progress });
    });

    // タスクの期間変更時
    gantt.attachEvent("onAfterTaskUpdate", (id: number, task: any) => {
      updateTaskFromGantt(task);
    });

    // 依存関係作成時
    gantt.attachEvent("onAfterLinkAdd", (id: number, link: any) => {
      const dependencyData = {
        predecessor_id: link.source,
        successor_id: link.target,
        dependency_type: mapGanttLinkTypeToAPI(link.type),
        lag_days: 0
      };
      
      console.log('Creating dependency:', dependencyData);
      createDependencyMutation.mutate(dependencyData);
    });

    // 依存関係削除時  
    gantt.attachEvent("onAfterLinkDelete", (id: number, link: any) => {
      console.log('Deleting dependency:', id);
      deleteDependencyMutation.mutate(id);
    });

    // 依存関係削除の確認
    gantt.attachEvent("onBeforeLinkDelete", (id: number, link: any) => {
      return window.confirm('この依存関係を削除しますか？');
    });
  };

  // ガントチャートの依存関係タイプをAPIフォーマットに変換
  const mapGanttLinkTypeToAPI = (ganttType: string): "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish" => {
    const typeMap: { [key: string]: "finish_to_start" | "start_to_start" | "finish_to_finish" | "start_to_finish" } = {
      '0': 'finish_to_start',
      '1': 'start_to_start', 
      '2': 'finish_to_finish',
      '3': 'start_to_finish'
    };
    return typeMap[ganttType] || 'finish_to_start';
  };

  // ガントチャートからタスクを更新
  const updateTaskFromGantt = (ganttTask: any) => {
    try {
      const startDate = ganttTask.start_date;
      const endDate = ganttTask.end_date;
      
      // 日付を適切なフォーマットに変換
      const formatDate = (date: any) => {
        if (typeof date === 'string') {
          return date;
        } else if (date instanceof Date) {
          return date.toISOString().split('T')[0] + ' ' + 
                 date.toTimeString().split(' ')[0].substring(0, 5);
        }
        return null;
      };

      const updateData = {
        name: ganttTask.text,
        start_date: formatDate(startDate),
        end_date: formatDate(endDate),
        estimated_hours: ganttTask.duration ? ganttTask.duration * 8 : null,
        progress_percentage: Math.round((ganttTask.progress || 0) * 100),
      };

      // null値を除去
      const cleanedData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== null)
      );

      console.log('Updating task from Gantt:', ganttTask.id, cleanedData);
      
      updateTaskMutation.mutate({
        id: ganttTask.id,
        data: cleanedData
      });
    } catch (error) {
      console.error('Error updating task from Gantt:', error);
      message.error('ガントチャートからのタスク更新に失敗しました');
    }
  };

  // Setup event handlers when Gantt is initialized
  useEffect(() => {
    if (isInitialized && window.gantt) {
      console.log('Setting up Gantt event handlers...');
      setupGanttEventHandlers(window.gantt);
    }
  }, [isInitialized]);

  // Load data when both gantt is initialized and data is available
  useEffect(() => {
    console.log('GanttChart data effect - ganttData:', ganttData?.tasks?.length, 'isInitialized:', isInitialized);
    if (ganttData && isInitialized) {
      const success = loadData(ganttData);
      if (success) {
        console.log('Gantt data loaded successfully');
      }
    }
  }, [ganttData, isInitialized, loadData]);

  // Note: Project change handling is now managed by the simplified hook

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
    console.log('Gantt data check failed:', {
      hasGanttData: !!ganttData,
      hasTasks: !!ganttData?.tasks,
      tasksLength: ganttData?.tasks?.length,
      isLoading,
      error,
      isInitialized,
      projectId
    });
    return (
      <Card title="ガントチャート">
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <p>表示するタスクがありません</p>
          <p style={{ color: '#666', fontSize: '14px' }}>
            まずはタスクを作成してください
          </p>
          <p style={{ color: '#999', fontSize: '12px' }}>
            Debug: isLoading={String(isLoading)}, hasData={String(!!ganttData)}, 
            tasksCount={ganttData?.tasks?.length || 0}, isInitialized={String(isInitialized)}, 
            projectId={projectId}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card title="ガントチャート" style={{ height: '600px' }}>
      {(isLoading || ganttLoading) ? (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '500px' 
        }}>
          <Spin size="large" />
          <div style={{ marginLeft: '10px' }}>
            {ganttLoading ? 'ガントチャートを初期化中...' : 'データを読み込み中...'}
          </div>
        </div>
      ) : (
        <div 
          ref={ganttRef}
          data-testid="gantt-container"
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