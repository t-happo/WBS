import axios from 'axios';

// API base configuration
const API_BASE_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: string;
}

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  name: string;
  description?: string;
  project_id: number;
  parent_task_id?: number;
  task_type: 'phase' | 'task' | 'detail_task';
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimated_hours?: number;
  actual_hours?: number;
  start_date?: string;
  end_date?: string;
  assignee_id?: number;
  created_at: string;
  updated_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Auth API
export const authAPI = {
  login: (data: LoginRequest) => 
    api.post<LoginResponse>('/users/login/simple', data),
  
  getCurrentUser: () => 
    api.get<User>('/users/me'),
};

// Projects API
export const projectsAPI = {
  getAll: () => 
    api.get<Project[]>('/projects/'),
  
  getById: (id: number) => 
    api.get<Project>(`/projects/${id}`),
  
  create: (data: Pick<Project, 'name' | 'description' | 'status'>) => 
    api.post<Project>('/projects/', data),
  
  update: (id: number, data: Partial<Project>) => 
    api.put<Project>(`/projects/${id}`, data),
  
  delete: (id: number) => 
    api.delete(`/projects/${id}`),
  
  getStatistics: () => 
    api.get('/projects/statistics'),
};

export interface TaskDependency {
  id: number;
  predecessor_id: number;
  successor_id: number;
  dependency_type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish';
  lag_days: number;
  predecessor_name?: string;
  successor_name?: string;
}

// Tasks API
export const tasksAPI = {
  getByProject: (projectId: number) => 
    api.get<Task[]>(`/tasks/project/${projectId}`),
  
  getById: (id: number) => 
    api.get<Task>(`/tasks/${id}`),
  
  create: (data: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => 
    api.post<Task>('/tasks/', data),
  
  update: (id: number, data: Partial<Task>) => 
    api.put<Task>(`/tasks/${id}`, data),
  
  delete: (id: number) => 
    api.delete(`/tasks/${id}`),
  
  getGanttData: (projectId: number) => 
    api.get(`/tasks/project/${projectId}/gantt`),
  
  // Dependencies
  getDependencies: (projectId: number) => 
    api.get<TaskDependency[]>(`/tasks/project/${projectId}/dependencies`),
  
  createDependency: (data: Omit<TaskDependency, 'id' | 'predecessor_name' | 'successor_name'>) => 
    api.post<TaskDependency>('/tasks/dependencies', data),
  
  deleteDependency: (id: number) => 
    api.delete(`/tasks/dependencies/${id}`),
};