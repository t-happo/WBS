import { useEffect, useRef, useState, useCallback } from 'react';
import { message } from 'antd';

interface GanttData {
  tasks: any[];
  links: any[];
}

export const useGanttChart = (projectId: string | undefined) => {
  const ganttRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const initializationAttempt = useRef(0);

  const loadGanttLibrary = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      console.log('Loading DHTMLX Gantt library...');
      
      // Check if already loaded and properly available
      if (window.gantt && typeof window.gantt.init === 'function') {
        console.log('DHTMLX Gantt library already loaded and ready');
        resolve(true);
        return;
      }

      // Always wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(() => loadGanttLibrary().then(resolve), 100);
        });
        return;
      }

      // Load CSS if not present
      if (!document.querySelector('link[href*="dhtmlxgantt.css"]')) {
        console.log('Loading DHTMLX Gantt CSS...');
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://cdn.dhtmlx.com/gantt/8.0/dhtmlxgantt.css';
        document.head.appendChild(css);
      }

      // Load JS if not present
      const existingScript = document.querySelector('script[src*="dhtmlxgantt.js"]');
      if (!existingScript) {
        console.log('Loading DHTMLX Gantt JS...');
        const script = document.createElement('script');
        script.src = 'https://cdn.dhtmlx.com/gantt/8.0/dhtmlxgantt.js';
        script.onload = () => {
          console.log('DHTMLX Gantt JS loaded, waiting for initialization...');
          // Wait for the library to be fully available
          let attempts = 0;
          const checkLibrary = () => {
            attempts++;
            if (window.gantt && typeof window.gantt.init === 'function') {
              console.log(`DHTMLX Gantt library ready after ${attempts} attempts`);
              resolve(true);
            } else if (attempts < 20) {
              setTimeout(checkLibrary, 50);
            } else {
              console.error('DHTMLX Gantt library failed to initialize after loading');
              resolve(false);
            }
          };
          checkLibrary();
        };
        script.onerror = () => {
          console.error('Failed to load DHTMLX Gantt JS');
          resolve(false);
        };
        document.head.appendChild(script);
      } else {
        // Script exists but library might not be ready
        console.log('DHTMLX Gantt script exists, checking availability...');
        let attempts = 0;
        const checkLibrary = () => {
          attempts++;
          if (window.gantt && typeof window.gantt.init === 'function') {
            console.log(`DHTMLX Gantt library ready after ${attempts} attempts`);
            resolve(true);
          } else if (attempts < 20) {
            setTimeout(checkLibrary, 50);
          } else {
            console.error('DHTMLX Gantt library not available despite script being present');
            resolve(false);
          }
        };
        checkLibrary();
      }
    });
  }, []);

  const initializeGantt = useCallback(async (force = false) => {
    if (!ganttRef.current) {
      console.warn('Gantt container ref not available');
      return false;
    }

    // Skip if already initialized unless forced
    if (isInitialized && !force) {
      console.log('Gantt already initialized, skipping...');
      return true;
    }

    // Check if gantt is already initialized on this container
    if (window.gantt && window.gantt.$container && !force) {
      console.log('Gantt already has a container, using existing instance...');
      setIsInitialized(true);
      return true;
    }

    if (force || isInitialized) {
      console.log('Force reinitializing Gantt chart...');
      setIsInitialized(false);
      initializationAttempt.current = 0;
      
      // Force cleanup
      if (window.gantt) {
        try {
          window.gantt.clearAll();
          window.gantt.detachAllEvents();
          if (window.gantt.destructor) {
            window.gantt.destructor();
          }
        } catch (e) {
          console.warn('Error during force cleanup:', e);
        }
      }
      
      if (ganttRef.current) {
        ganttRef.current.innerHTML = '';
      }
      
      // Wait a bit before proceeding
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const attempt = ++initializationAttempt.current;
    console.log(`Gantt initialization attempt #${attempt} for projectId: ${projectId}`);
    setIsLoading(true);

    try {
      // Load library if needed
      console.log('Loading Gantt library...');
      const libraryLoaded = await loadGanttLibrary();
      console.log('Library loaded result:', libraryLoaded, 'window.gantt available:', !!window.gantt);
      
      if (!libraryLoaded || !window.gantt) {
        throw new Error('Failed to load Gantt library');
      }

      // Ensure container is ready and visible
      if (!ganttRef.current.offsetParent && ganttRef.current.style.display !== 'none') {
        console.log('Container not visible, waiting...');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Double-check that container is still available
      if (!ganttRef.current) {
        console.warn('Container disappeared during initialization');
        return false;
      }

      // Simple container cleanup - avoid DHtmlx internal cleanup
      ganttRef.current.innerHTML = '';
      console.log('Container cleared');

      const gantt = window.gantt;

      // Configure Gantt with enhanced settings
      gantt.config.date_format = '%Y-%m-%d %H:%i';
      gantt.config.xml_date = '%Y-%m-%d %H:%i';
      gantt.config.api_date = '%Y-%m-%d %H:%i';
      
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
        { name: 'start_date', label: '開始日', width: 100 },
        { name: 'end_date', label: '終了日', width: 100 }
      ];

      gantt.config.scales = [
        { unit: 'month', step: 1, format: '%Y年%m月' },
        { unit: 'day', step: 1, format: '%d' }
      ];

      gantt.config.types = {
        task: 'task',
        phase: 'project',
        detail_task: 'task'
      };

      gantt.config.auto_scheduling = true;
      gantt.config.auto_scheduling_strict = true;
      gantt.config.drag_timeline = {
        useKey: false,
        ignore: ".gantt_task_line, .gantt_task_link",
        render: false
      };
      gantt.config.drag_progress = true;
      gantt.config.drag_resize = true;
      gantt.config.drag_move = true;
      gantt.config.drag_links = true;
      gantt.config.show_links = true;

      // Initialize with error handling
      console.log('About to initialize Gantt with container:', ganttRef.current);
      
      // Create a fresh configuration before initializing
      gantt.config = Object.assign({}, gantt.config);
      gantt.init(ganttRef.current);

      // Wait for initialization to complete and verify
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify initialization was successful
      if (!ganttRef.current.querySelector('.gantt_container')) {
        throw new Error('Gantt container not properly initialized');
      }

      setIsInitialized(true);
      console.log(`Gantt initialized successfully on attempt #${attempt}`);
      return true;

    } catch (error) {
      console.error(`Gantt initialization failed on attempt #${attempt}:`, error);
      setIsInitialized(false);
      if (attempt <= 3) {
        console.log(`Retrying initialization in ${1000 * attempt}ms...`);
        setTimeout(() => initializeGantt(false), 1000 * attempt);
      } else {
        console.error('All initialization attempts failed');
        message.error('ガントチャートの初期化に失敗しました');
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, loadGanttLibrary, projectId]);

  const forceReinitialize = useCallback(async () => {
    console.log('Force reinitializing Gantt chart...');
    return await initializeGantt(true);
  }, [initializeGantt]);

  const loadData = useCallback((data: GanttData) => {
    if (!window.gantt || !isInitialized) {
      console.warn('Cannot load data: Gantt not initialized');
      return false;
    }

    try {
      console.log('Loading gantt data with', data.tasks?.length || 0, 'tasks');
      
      const transformedData = {
        data: data.tasks?.map((task: any) => {
          let startDate = task.start_date;
          let endDate = task.end_date;

          if (!startDate) {
            const today = new Date();
            startDate = today.toISOString().split('T')[0] + ' 09:00';
          } else if (!startDate.includes(' ')) {
            startDate = startDate + ' 09:00';
          }

          if (!endDate) {
            const start = new Date(startDate);
            const end = new Date(start);
            const durationDays = task.estimated_hours ? Math.ceil(task.estimated_hours / 8) : 1;
            end.setDate(start.getDate() + durationDays);
            endDate = end.toISOString().split('T')[0] + ' 18:00';
          } else if (!endDate.includes(' ')) {
            endDate = endDate + ' 18:00';
          }

          return {
            id: task.id,
            text: task.name,
            start_date: startDate,
            end_date: endDate,
            duration: task.estimated_hours ? Math.ceil(task.estimated_hours / 8) : 1,
            progress: task.status === 'completed' ? 1 : 
                     task.status === 'in_progress' ? 0.5 : 0,
            type: task.task_type === 'phase' ? 'project' : 'task',
            parent: task.parent_task_id || 0,
            priority: task.priority,
            status: task.status,
            description: task.description,
            color: task.status === 'completed' ? '#52c41a' :
                   task.status === 'in_progress' ? '#1890ff' :
                   task.status === 'on_hold' ? '#faad14' : '#d9d9d9'
          };
        }) || [],
        links: data.links?.map((link: any) => ({
          id: link.id,
          source: link.source,
          target: link.target,
          type: link.type === 'finish_to_start' ? '0' : 
                link.type === 'start_to_start' ? '1' :
                link.type === 'finish_to_finish' ? '2' : '3',
          lag: link.lag || 0
        })) || []
      };

      window.gantt.clearAll();
      window.gantt.parse(transformedData);

      setTimeout(() => {
        try {
          window.gantt.render();
          if (window.gantt.autofit) {
            window.gantt.autofit();
          }
        } catch (e) {
          console.warn('Error during auto-fit:', e);
        }
      }, 100);

      return true;
    } catch (error) {
      console.error('Error loading gantt data:', error);
      return false;
    }
  }, [isInitialized]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up gantt...');
    // Minimal cleanup to avoid internal state corruption
    if (ganttRef.current) {
      ganttRef.current.innerHTML = '';
    }
    setIsInitialized(false);
    initializationAttempt.current = 0;
  }, []);

  // Handle page visibility changes (for refresh scenarios)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && projectId && !isInitialized) {
        console.log('Page became visible, reinitializing Gantt...');
        setTimeout(() => initializeGantt(false), 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [projectId, isInitialized, initializeGantt]);

  // Handle focus events (for login/logout scenarios)
  useEffect(() => {
    const handleFocus = () => {
      if (projectId && ganttRef.current && !isInitialized) {
        console.log('Window focused, checking Gantt initialization...');
        setTimeout(() => initializeGantt(false), 200);
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [projectId, isInitialized, initializeGantt]);

  // Wait for DOM to be ready
  useEffect(() => {
    if (!projectId) return;
    
    const checkAndInitialize = () => {
      console.log('useGanttChart effect triggered:', { projectId, hasRef: !!ganttRef.current, isInitialized });
      
      if (ganttRef.current) {
        console.log('DOM ref is ready, starting initialization...');
        initializeGantt(false);
      } else {
        console.log('DOM ref not ready, retrying in 100ms...');
        setTimeout(checkAndInitialize, 100);
      }
    };
    
    // Start checking
    checkAndInitialize();
    
    return cleanup;
  }, [projectId, initializeGantt, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('useGanttChart unmounting, cleaning up...');
      cleanup();
    };
  }, [cleanup]);

  return {
    ganttRef,
    isInitialized,
    isLoading,
    loadData,
    cleanup,
    reinitialize: initializeGantt,
    forceReinitialize
  };
};