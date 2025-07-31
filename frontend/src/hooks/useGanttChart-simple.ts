import { useEffect, useRef, useState, useCallback } from 'react';

interface GanttData {
  tasks: any[];
  links: any[];
}

export const useGanttChart = (projectId: string | undefined) => {
  const ganttRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadGanttLibrary = useCallback(async (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if already loaded and properly available
      if (window.gantt && typeof window.gantt.init === 'function') {
        console.log('DHTMLX Gantt library already loaded and ready');
        resolve(true);
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
          console.log('DHTMLX Gantt JS loaded successfully');
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
        resolve(true);
      }
    });
  }, []);

  const initializeGantt = useCallback(async () => {
    if (!ganttRef.current || isInitialized) {
      return false;
    }

    console.log(`Starting simple Gantt initialization for projectId: ${projectId}`);
    setIsLoading(true);

    try {
      // Load library if needed
      const libraryLoaded = await loadGanttLibrary();
      if (!libraryLoaded || !window.gantt) {
        throw new Error('Failed to load Gantt library');
      }

      // Simple container preparation
      ganttRef.current.innerHTML = '';

      const gantt = window.gantt;

      // Basic configuration
      gantt.config.date_format = '%Y-%m-%d %H:%i';
      gantt.config.xml_date = '%Y-%m-%d %H:%i';
      
      gantt.config.columns = [
        { name: 'text', label: 'タスク名', width: 200, tree: true },
        { name: 'start_date', label: '開始日', width: 100 },
        { name: 'duration', label: '期間', width: 60 },
      ];

      gantt.config.scales = [
        { unit: 'month', step: 1, format: '%Y年%m月' },
        { unit: 'day', step: 1, format: '%d' }
      ];

      // Initialize
      console.log('Initializing Gantt with container:', ganttRef.current);
      gantt.init(ganttRef.current);

      // Wait for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify initialization
      if (!ganttRef.current.querySelector('.gantt_container')) {
        throw new Error('Gantt container not properly initialized');
      }

      setIsInitialized(true);
      console.log('Simple Gantt initialization completed successfully');
      return true;

    } catch (error) {
      console.error('Simple Gantt initialization failed:', error);
      setIsInitialized(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, loadGanttLibrary, projectId]);

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
          };
        }) || [],
        links: data.links?.map((link: any) => ({
          id: link.id,
          source: link.source,
          target: link.target,
          type: link.type === 'finish_to_start' ? '0' : 
                link.type === 'start_to_start' ? '1' :
                link.type === 'finish_to_finish' ? '2' : '3',
        })) || []
      };

      // Use parse instead of clearAll + parse
      window.gantt.parse(transformedData);

      // Render
      setTimeout(() => {
        try {
          window.gantt.render();
        } catch (e) {
          console.warn('Error during render:', e);
        }
      }, 100);

      return true;
    } catch (error) {
      console.error('Error loading gantt data:', error);
      return false;
    }
  }, [isInitialized]);

  // Simple initialization effect with DOM ref waiting
  useEffect(() => {
    if (!projectId || isInitialized) return;
    
    let retryCount = 0;
    const maxRetries = 10;
    
    const checkAndInitialize = () => {
      console.log('Simple Gantt checkAndInitialize:', { 
        projectId, 
        hasRef: !!ganttRef.current, 
        isInitialized, 
        isLoading,
        retryCount 
      });
      
      if (isInitialized) {
        console.log('Gantt already initialized, stopping checks');
        return;
      }
      
      if (ganttRef.current && !isLoading) {
        console.log('DOM ref is ready, starting simple Gantt initialization...');
        initializeGantt();
      } else if (!ganttRef.current && retryCount < maxRetries) {
        retryCount++;
        console.log(`DOM ref not ready, retrying in 100ms... (${retryCount}/${maxRetries})`);
        setTimeout(checkAndInitialize, 100);
      } else if (retryCount >= maxRetries) {
        console.log('Max retries reached, stopping initialization attempts');
      } else {
        console.log('Simple Gantt initialization skipped - isLoading:', isLoading);
      }
    };
    
    checkAndInitialize();
  }, [projectId, initializeGantt, isInitialized, isLoading]);

  // No cleanup effect - avoid DHTMLX internal state corruption

  return {
    ganttRef,
    isInitialized,
    isLoading,
    loadData,
  };
};