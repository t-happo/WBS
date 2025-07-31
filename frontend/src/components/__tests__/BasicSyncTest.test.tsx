import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Simple test to verify test environment setup
describe('Basic Sync Test Setup', () => {
  test('should render test environment correctly', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <div data-testid="test-component">Test Component</div>
      </QueryClientProvider>
    );

    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  test('should create QueryClient with proper configuration', () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
          staleTime: 0,
        },
      },
    });

    // Test that QueryClient was created
    expect(queryClient).toBeDefined();
    expect(queryClient.getQueryCache()).toBeDefined();
  });

  test('should verify console.log mocking capability', () => {
    const originalConsoleLog = console.log;
    const mockConsoleLog = jest.fn();
    console.log = mockConsoleLog;

    console.log('Test message:', 'value');

    expect(mockConsoleLog).toHaveBeenCalledWith('Test message:', 'value');
    expect(mockConsoleLog).toHaveBeenCalledTimes(1);

    // Restore original console.log
    console.log = originalConsoleLog;
  });

  test('should verify query invalidation flow simulation', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    // Create a mock query
    const queryKey = ['test', '1'];
    
    // Set initial data
    queryClient.setQueryData(queryKey, { data: 'initial' });
    
    // Verify data was set
    const initialData = queryClient.getQueryData(queryKey);
    expect(initialData).toEqual({ data: 'initial' });

    // Simulate invalidation
    queryClient.invalidateQueries({ queryKey, exact: false });

    // Verify query cache state
    const queryCache = queryClient.getQueryCache();
    const queries = queryCache.getAll();
    const testQuery = queries.find(q => q.queryKey[0] === 'test');
    
    expect(testQuery).toBeDefined();
    expect(testQuery?.queryKey).toEqual(queryKey);
  });

  test('should demonstrate projectId consistency check', () => {
    const projectId = '1';
    
    // Simulate different query keys that should use the same projectId
    const taskQuery = ['tasks', projectId];
    const ganttQuery = ['gantt', projectId];
    const dependencyQuery = ['dependencies', projectId];

    // Verify all queries use the same projectId
    expect(taskQuery[1]).toBe(projectId);
    expect(ganttQuery[1]).toBe(projectId);
    expect(dependencyQuery[1]).toBe(projectId);

    // Verify projectId type
    expect(typeof projectId).toBe('string');
  });
});