// ---------------------------------------------------------------------------
// Project service — CRUD + scope analysis + API key
// ---------------------------------------------------------------------------

import api from './api';
import type {
    Project,
    ProjectCreate,
    ProjectUpdate,
    ProjectList,
    ApiKeyResponse,
    ScopeAnalysisResponse,
} from '@/types/project';

export interface ProjectListParams {
    page?: number;
    page_size?: number;
    search?: string;
    is_active?: boolean;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export const projectService = {
    async getProjects(params?: ProjectListParams): Promise<ProjectList> {
        const res = await api.get<ProjectList>('/projects', { params });
        return res.data;
    },

    async getProject(id: string): Promise<Project> {
        const res = await api.get<Project>(`/projects/${id}`);
        return res.data;
    },

    async createProject(data: ProjectCreate): Promise<Project> {
        const res = await api.post<Project>('/projects', data);
        return res.data;
    },

    async updateProject(id: string, data: ProjectUpdate): Promise<Project> {
        const res = await api.put<Project>(`/projects/${id}`, data);
        return res.data;
    },

    async deleteProject(id: string): Promise<void> {
        await api.delete(`/projects/${id}`);
    },

    async analyzeScope(id: string): Promise<ScopeAnalysisResponse> {
        const res = await api.post<ScopeAnalysisResponse>(`/projects/${id}/analyze-scope`);
        return res.data;
    },

    async regenerateApiKey(id: string): Promise<ApiKeyResponse> {
        const res = await api.post<ApiKeyResponse>(`/projects/${id}/regenerate-api-key`);
        return res.data;
    },
};
