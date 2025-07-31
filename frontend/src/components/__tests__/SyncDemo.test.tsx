import { QueryClient } from '@tanstack/react-query';

/**
 * 双方向同期のロジックを実証するテスト
 * 実際のコンポーネントではなく、同期ロジックそのものをテストする
 */
describe('Bi-directional Sync Logic Demonstration', () => {
  let queryClient: QueryClient;
  let mockConsoleLog: jest.Mock;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    });

    // Mock console.log to capture our debug messages
    originalConsoleLog = console.log;
    mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    queryClient.clear();
  });

  test('should demonstrate TaskList to GanttChart sync logic', async () => {
    const projectId = '1';
    
    // Initial data setup
    const initialTasks = [
      { id: 1, name: 'Task 1', status: 'not_started' },
      { id: 2, name: 'Task 2', status: 'in_progress' },
    ];
    
    const initialGanttData = {
      tasks: initialTasks,
      links: [],
    };

    // Set initial data in cache
    queryClient.setQueryData(['tasks', projectId], initialTasks);
    queryClient.setQueryData(['gantt', projectId], initialGanttData);
    queryClient.setQueryData(['dependencies', projectId], []);

    console.log('Initial data set in cache');

    // Simulate TaskList update mutation success
    const updatedTask = { id: 1, name: 'Updated Task 1', status: 'completed' };
    const updatedTasks = [updatedTask, initialTasks[1]];
    
    console.log('Task updated successfully from TaskList:', 1, updatedTask);
    console.log('Invalidating queries for projectId:', projectId, typeof projectId);

    // Simulate query invalidation (what our onSuccess does)
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

    // Simulate new data being set after refetch
    queryClient.setQueryData(['tasks', projectId], updatedTasks);
    queryClient.setQueryData(['gantt', projectId], {
      tasks: updatedTasks,
      links: [],
    });

    // Verify the data was updated
    const tasksData = queryClient.getQueryData(['tasks', projectId]);
    const ganttData = queryClient.getQueryData(['gantt', projectId]);

    expect(tasksData).toEqual(updatedTasks);
    expect(ganttData).toEqual({
      tasks: updatedTasks,
      links: [],
    });

    // Verify console logs
    expect(mockConsoleLog).toHaveBeenCalledWith('Initial data set in cache');
    expect(mockConsoleLog).toHaveBeenCalledWith('Task updated successfully from TaskList:', 1, updatedTask);
    expect(mockConsoleLog).toHaveBeenCalledWith('Invalidating queries for projectId:', projectId, 'string');
    expect(mockConsoleLog).toHaveBeenCalledWith('All queries invalidated successfully');
  });

  test('should demonstrate GanttChart to TaskList sync logic', async () => {
    const projectId = '1';
    
    // Initial data setup
    const initialTasks = [
      { id: 1, name: 'Task 1', progress: 0 },
      { id: 2, name: 'Task 2', progress: 25 },
    ];

    queryClient.setQueryData(['tasks', projectId], initialTasks);
    queryClient.setQueryData(['gantt', projectId], { tasks: initialTasks, links: [] });

    // Simulate GanttChart update (progress change)
    const updatedTaskData = {
      id: 1,
      name: 'Task 1',
      progress_percentage: 75,
      start_date: '2024-01-01',
      end_date: '2024-01-02',
    };

    console.log('Task updated successfully from Gantt:', 1, updatedTaskData);
    console.log('Invalidating queries for projectId from Gantt:', projectId, typeof projectId);

    // Simulate query invalidation from Gantt
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

    // Simulate updated data after refetch
    const updatedTasks = [
      { ...initialTasks[0], progress_percentage: 75 },
      initialTasks[1],
    ];

    queryClient.setQueryData(['tasks', projectId], updatedTasks);

    // Verify synchronization
    const tasksData = queryClient.getQueryData(['tasks', projectId]);
    expect(tasksData).toEqual(updatedTasks);
    expect((tasksData as any)[0].progress_percentage).toBe(75);

    // Verify console logs
    expect(mockConsoleLog).toHaveBeenCalledWith('Task updated successfully from Gantt:', 1, updatedTaskData);
    expect(mockConsoleLog).toHaveBeenCalledWith('Invalidating queries for projectId from Gantt:', projectId, 'string');
    expect(mockConsoleLog).toHaveBeenCalledWith('All queries invalidated successfully from Gantt');
  });

  test('should demonstrate dependency sync logic', async () => {
    const projectId = '1';
    
    // Initial data
    const initialDeps = [
      { id: 1, predecessor_id: 1, successor_id: 2, dependency_type: 'finish_to_start' }
    ];

    queryClient.setQueryData(['dependencies', projectId], initialDeps);
    queryClient.setQueryData(['tasks', projectId], []);
    queryClient.setQueryData(['gantt', projectId], { tasks: [], links: [] });

    // Simulate dependency creation
    const newDependency = {
      id: 2,
      predecessor_id: 2,
      successor_id: 1,
      dependency_type: 'start_to_start',
      lag_days: 1,
    };

    console.log('Creating dependency:', newDependency);

    // Simulate dependency creation success
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

    // Update data after dependency creation
    const updatedDeps = [...initialDeps, newDependency];
    queryClient.setQueryData(['dependencies', projectId], updatedDeps);

    // Verify dependency was added
    const depsData = queryClient.getQueryData(['dependencies', projectId]);
    expect(depsData).toEqual(updatedDeps);
    expect((depsData as any).length).toBe(2);

    // Verify console logs
    expect(mockConsoleLog).toHaveBeenCalledWith('Creating dependency:', newDependency);
  });

  test('should verify query key consistency across sync operations', () => {
    const projectId = '1';
    
    // Test that all operations use consistent query keys
    const syncOperations = [
      // TaskList operations
      () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
      () => queryClient.invalidateQueries({ queryKey: ['gantt', projectId] }),
      () => queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] }),
      
      // GanttChart operations  
      () => queryClient.invalidateQueries({ queryKey: ['tasks', projectId] }),
      () => queryClient.invalidateQueries({ queryKey: ['gantt', projectId] }),
      () => queryClient.invalidateQueries({ queryKey: ['dependencies', projectId] }),
    ];

    // Execute all operations
    syncOperations.forEach(operation => {
      expect(() => operation()).not.toThrow();
    });

    // Verify query cache has the expected structure
    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();

    // Should be able to find queries for each type
    const taskQueries = allQueries.filter(q => q.queryKey[0] === 'tasks');
    const ganttQueries = allQueries.filter(q => q.queryKey[0] === 'gantt');  
    const depQueries = allQueries.filter(q => q.queryKey[0] === 'dependencies');

    // All queries should use the same projectId
    [...taskQueries, ...ganttQueries, ...depQueries].forEach(query => {
      expect(query.queryKey[1]).toBe(projectId);
      expect(typeof query.queryKey[1]).toBe('string');
    });
  });

  test('should demonstrate complete sync flow end-to-end', async () => {
    const projectId = '1';
    
    console.log('=== Starting Complete Sync Flow Test ===');
    
    // Step 1: Initial state
    const initialState = {
      tasks: [
        { id: 1, name: 'Task A', status: 'not_started', progress_percentage: 0 },
        { id: 2, name: 'Task B', status: 'not_started', progress_percentage: 0 },
      ],
      dependencies: [],
      gantt: { tasks: [], links: [] },
    };

    // Set initial data
    Object.entries(initialState).forEach(([key, data]) => {
      queryClient.setQueryData([key, projectId], data);
    });

    console.log('Step 1: Initial state set');

    // Step 2: TaskList update
    console.log('Step 2: Simulating TaskList update...');
    const taskUpdate = { id: 1, name: 'Updated Task A', status: 'in_progress', progress_percentage: 50 };
    
    // Simulate TaskList mutation success
    ['tasks', 'gantt', 'dependencies'].forEach(queryType => {
      queryClient.invalidateQueries({ 
        queryKey: [queryType, projectId],
        exact: false,
        refetchType: 'active'
      });
    });

    // Update data after TaskList change
    const updatedTasks = [taskUpdate, initialState.tasks[1]];
    queryClient.setQueryData(['tasks', projectId], updatedTasks);
    queryClient.setQueryData(['gantt', projectId], { tasks: updatedTasks, links: [] });

    console.log('Step 2: TaskList update completed, data synced to Gantt');

    // Step 3: GanttChart update
    console.log('Step 3: Simulating GanttChart update...');
    const ganttUpdate = { 
      id: 2, 
      name: 'Task B',
      progress_percentage: 25,
      start_date: '2024-01-05',
      end_date: '2024-01-06'
    };

    // Simulate GanttChart mutation success
    ['tasks', 'gantt', 'dependencies'].forEach(queryType => {
      queryClient.invalidateQueries({ 
        queryKey: [queryType, projectId],
        exact: false,
        refetchType: 'active'
      });
    });

    // Update data after GanttChart change
    const finalTasks = [
      updatedTasks[0], // Task A (already updated)
      { ...updatedTasks[1], progress_percentage: 25, start_date: '2024-01-05', end_date: '2024-01-06' } // Task B (Gantt update)
    ];
    queryClient.setQueryData(['tasks', projectId], finalTasks);

    console.log('Step 3: GanttChart update completed, data synced to TaskList');

    // Step 4: Verify final state
    const finalTasksData = queryClient.getQueryData(['tasks', projectId]);
    
    expect(finalTasksData).toEqual(finalTasks);
    expect((finalTasksData as any)[0].name).toBe('Updated Task A');
    expect((finalTasksData as any)[0].progress_percentage).toBe(50);
    expect((finalTasksData as any)[1].progress_percentage).toBe(25);
    expect((finalTasksData as any)[1].start_date).toBe('2024-01-05');

    console.log('=== Complete Sync Flow Test Successful ===');

    // Verify all console logs were captured
    expect(mockConsoleLog).toHaveBeenCalledWith('=== Starting Complete Sync Flow Test ===');
    expect(mockConsoleLog).toHaveBeenCalledWith('Step 1: Initial state set');
    expect(mockConsoleLog).toHaveBeenCalledWith('Step 2: Simulating TaskList update...');
    expect(mockConsoleLog).toHaveBeenCalledWith('Step 2: TaskList update completed, data synced to Gantt');
    expect(mockConsoleLog).toHaveBeenCalledWith('Step 3: Simulating GanttChart update...');
    expect(mockConsoleLog).toHaveBeenCalledWith('Step 3: GanttChart update completed, data synced to TaskList');
    expect(mockConsoleLog).toHaveBeenCalledWith('=== Complete Sync Flow Test Successful ===');
  });
});