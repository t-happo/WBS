import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import TaskList from '../TaskList';
import GanttChart from '../GanttChart';

// Mock the tasks API
const mockTasksAPI = {
  getByProject: jest.fn(),
  getDependencies: jest.fn(),
  getGanttData: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createDependency: jest.fn(),
  deleteDependency: jest.fn(),
};

jest.mock('../../services/api', () => ({
  tasksAPI: mockTasksAPI,
}));

// Mock react-router-dom useParams
const mockUseParams = jest.fn(() => ({
  projectId: '1',
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: mockUseParams,
}));

// Mock antd message
const mockMessage = {
  success: jest.fn(),
  error: jest.fn(),
};

jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: mockMessage,
}));

// Mock console.log to capture our debug messages
const originalConsoleLog = console.log;
const mockConsoleLog = jest.fn();
console.log = mockConsoleLog;

// Mock DHTMLX Gantt
const mockGantt = {
  init: jest.fn(),
  clearAll: jest.fn(),
  parse: jest.fn(),
  attachEvent: jest.fn(),
  config: {},
  autofit: jest.fn(),
};

Object.defineProperty(window, 'gantt', {
  value: mockGantt,
  writable: true,
});

const createMockTask = (id: number, name: string, status = 'not_started', progress = 0) => ({
  id,
  name,
  description: `Description for ${name}`,
  task_type: 'task',
  status,
  priority: 'medium',
  estimated_hours: 8,
  actual_hours: status === 'completed' ? 8 : 0,
  start_date: '2024-01-01',
  end_date: '2024-01-02',
  progress_percentage: progress,
  project_id: 1,
  created_at: '2024-01-01T00:00:00Z',
});

const initialTasks = [
  createMockTask(1, 'Initial Task 1'),
  createMockTask(2, 'Initial Task 2'),
];

const initialGanttData = {
  tasks: initialTasks,
  links: [],
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

const TestApp: React.FC = () => {
  const [showGantt, setShowGantt] = React.useState(false);

  return (
    <div>
      <button onClick={() => setShowGantt(!showGantt)}>
        {showGantt ? 'Show TaskList' : 'Show GanttChart'}
      </button>
      <div data-testid="current-view">
        {showGantt ? <GanttChart /> : <TaskList />}
      </div>
    </div>
  );
};

const renderTestApp = () => {
  const queryClient = createTestQueryClient();
  
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <TestApp />
        </BrowserRouter>
      </QueryClientProvider>
    ),
  };
};

describe('Bi-directional Sync Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    
    // Setup default API responses
    mockTasksAPI.getByProject.mockResolvedValue({ data: initialTasks });
    mockTasksAPI.getDependencies.mockResolvedValue({ data: [] });
    mockTasksAPI.getGanttData.mockResolvedValue({ data: initialGanttData });
  });

  afterAll(() => {
    console.log = originalConsoleLog;
  });

  test('should demonstrate full bi-directional synchronization flow', async () => {
    const { queryClient } = renderTestApp();

    // Step 1: Start with TaskList view
    await waitFor(() => {
      expect(screen.getByText('Initial Task 1')).toBeInTheDocument();
    });

    // Verify initial API calls
    expect(mockTasksAPI.getByProject).toHaveBeenCalledWith(1);
    expect(mockTasksAPI.getDependencies).toHaveBeenCalledWith(1);

    // Step 2: Update a task from TaskList
    const updatedTask = createMockTask(1, 'Updated Task 1', 'in_progress', 50);
    mockTasksAPI.update.mockResolvedValueOnce({ data: updatedTask });

    // Simulate task edit
    const editButton = screen.getAllByText('編集')[0];
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('タスク編集')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Initial Task 1');
    fireEvent.change(nameInput, { target: { value: 'Updated Task 1' } });

    const okButton = screen.getByText('OK');
    fireEvent.click(okButton);

    // Verify update API call
    await waitFor(() => {
      expect(mockTasksAPI.update).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          name: 'Updated Task 1',
        })
      );
    });

    // Step 3: Switch to GanttChart view
    mockTasksAPI.getGanttData.mockResolvedValueOnce({ 
      data: { 
        tasks: [updatedTask, initialTasks[1]], 
        links: [] 
      } 
    });

    const switchButton = screen.getByText('Show GanttChart');
    fireEvent.click(switchButton);

    // Verify gantt data is fetched with updated task
    await waitFor(() => {
      expect(mockTasksAPI.getGanttData).toHaveBeenCalledWith(1);
    });

    // Step 4: Verify console logs show proper query invalidation
    await waitFor(() => {
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Task updated successfully from TaskList:',
        1,
        expect.any(Object)
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Invalidating queries for projectId:',
        '1',
        'string'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'All queries invalidated successfully'
      );
    });

    // Step 5: Switch back to TaskList to verify synchronization
    const switchBackButton = screen.getByText('Show TaskList');
    fireEvent.click(switchBackButton);

    // Verify that TaskList queries are executed again
    await waitFor(() => {
      expect(mockTasksAPI.getByProject).toHaveBeenCalledTimes(2); // Initial + after switch back
    });
  });

  test('should handle query invalidation with exact: false and refetchType: active', async () => {
    const { queryClient } = renderTestApp();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Initial Task 1')).toBeInTheDocument();
    });

    // Mock a successful task update
    const updatedTask = createMockTask(1, 'Updated via Query Test');
    mockTasksAPI.update.mockResolvedValueOnce({ data: updatedTask });

    // Simulate task update
    const editButton = screen.getAllByText('編集')[0];
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByText('タスク編集')).toBeInTheDocument();
    });

    const nameInput = screen.getByDisplayValue('Initial Task 1');
    fireEvent.change(nameInput, { target: { value: 'Updated via Query Test' } });

    const okButton = screen.getByText('OK');
    
    await act(async () => {
      fireEvent.click(okButton);
    });

    // Verify that queries were invalidated with correct parameters
    await waitFor(() => {
      expect(mockTasksAPI.update).toHaveBeenCalled();
    });

    // Check that the QueryClient has the expected queries
    const queryCache = queryClient.getQueryCache();
    const allQueries = queryCache.getAll();

    // Should have queries for tasks, dependencies, and gantt
    const taskQueries = allQueries.filter(q => q.queryKey[0] === 'tasks');
    const ganttQueries = allQueries.filter(q => q.queryKey[0] === 'gantt');
    const depQueries = allQueries.filter(q => q.queryKey[0] === 'dependencies');

    expect(taskQueries.length).toBeGreaterThan(0);
    expect(ganttQueries.length).toBeGreaterThan(0);
    expect(depQueries.length).toBeGreaterThan(0);

    // All queries should use the same projectId
    taskQueries.forEach(q => expect(q.queryKey[1]).toBe('1'));
    ganttQueries.forEach(q => expect(q.queryKey[1]).toBe('1'));
    depQueries.forEach(q => expect(q.queryKey[1]).toBe('1'));
  });

  test('should handle task deletion and verify cross-component sync', async () => {
    renderTestApp();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Initial Task 1')).toBeInTheDocument();
    });

    // Mock successful deletion
    mockTasksAPI.delete.mockResolvedValueOnce({ 
      data: { message: 'Task deleted successfully' } 
    });

    // Mock updated task list after deletion
    const remainingTasks = [initialTasks[1]];
    mockTasksAPI.getByProject.mockResolvedValueOnce({ data: remainingTasks });
    mockTasksAPI.getGanttData.mockResolvedValueOnce({ 
      data: { tasks: remainingTasks, links: [] } 
    });

    // Simulate task deletion
    const deleteButton = screen.getAllByText('削除')[0];
    fireEvent.click(deleteButton);

    // Confirm deletion in popup
    await waitFor(() => {
      expect(screen.getByText('タスクを削除しますか？')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('はい');
    fireEvent.click(confirmButton);

    // Verify delete API call
    await waitFor(() => {
      expect(mockTasksAPI.delete).toHaveBeenCalledWith(1);
    });

    // Verify console logs for deletion
    await waitFor(() => {
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Task deleted successfully from TaskList:',
        1,
        expect.any(Object)
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Queries invalidated after delete for projectId:',
        '1'
      );
    });

    // Switch to GanttChart to verify the deletion is reflected
    const switchButton = screen.getByText('Show GanttChart');
    fireEvent.click(switchButton);

    // Verify gantt data reflects the deletion
    await waitFor(() => {
      expect(mockTasksAPI.getGanttData).toHaveBeenCalled();
    });
  });

  test('should maintain query cache consistency across component switches', async () => {
    const { queryClient } = renderTestApp();

    // Initial load in TaskList
    await waitFor(() => {
      expect(screen.getByText('Initial Task 1')).toBeInTheDocument();
    });

    // Get initial query state
    const initialQueryCache = queryClient.getQueryCache();
    const initialQueries = initialQueryCache.getAll();
    const initialQueryCount = initialQueries.length;

    // Switch to GanttChart
    const switchButton = screen.getByText('Show GanttChart');
    fireEvent.click(switchButton);

    await waitFor(() => {
      expect(mockTasksAPI.getGanttData).toHaveBeenCalled();
    });

    // Switch back to TaskList
    const switchBackButton = screen.getByText('Show TaskList');
    fireEvent.click(switchBackButton);

    await waitFor(() => {
      expect(mockTasksAPI.getByProject).toHaveBeenCalledTimes(2);
    });

    // Verify query cache consistency
    const finalQueryCache = queryClient.getQueryCache();
    const finalQueries = finalQueryCache.getAll();

    // Should have queries for all three types: tasks, gantt, dependencies
    const taskQueries = finalQueries.filter(q => q.queryKey[0] === 'tasks');
    const ganttQueries = finalQueries.filter(q => q.queryKey[0] === 'gantt');
    const depQueries = finalQueries.filter(q => q.queryKey[0] === 'dependencies');

    expect(taskQueries.length).toBe(1);
    expect(ganttQueries.length).toBe(1);
    expect(depQueries.length).toBe(1);

    // All should use the same projectId
    expect(taskQueries[0].queryKey).toEqual(['tasks', '1']);
    expect(ganttQueries[0].queryKey).toEqual(['gantt', '1']);
    expect(depQueries[0].queryKey).toEqual(['dependencies', '1']);
  });

  test('should log proper debug information during sync operations', async () => {
    renderTestApp();

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Initial Task 1')).toBeInTheDocument();
    });

    // Verify initial query logs
    expect(mockConsoleLog).toHaveBeenCalledWith(
      'TaskList query executed, got tasks:',
      2
    );

    // Switch to GanttChart to trigger gantt query
    const switchButton = screen.getByText('Show GanttChart');
    fireEvent.click(switchButton);

    await waitFor(() => {
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'GanttChart query executed, got data:',
        2,
        'tasks,',
        0,
        'links'
      );
    });

    // Verify gantt useEffect logs
    await waitFor(() => {
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'GanttChart useEffect triggered - ganttData:',
        2,
        'window.gantt:',
        true
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Loading gantt data with',
        2,
        'tasks and',
        0,
        'links'
      );
    });
  });
});