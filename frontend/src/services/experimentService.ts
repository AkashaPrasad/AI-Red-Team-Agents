// ---------------------------------------------------------------------------
// Experiment service — CRUD + status + cancel
// ---------------------------------------------------------------------------

import api from './api';
import type {
    Experiment,
    ExperimentCreate,
    ExperimentList,
    ExperimentStatusResponse,
} from '@/types/experiment';

export interface ExperimentListParams {
    page?: number;
    page_size?: number;
    status?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export const experimentService = {
    async getExperiments(
        projectId: string,
        params?: ExperimentListParams,
    ): Promise<ExperimentList> {
        const res = await api.get<ExperimentList>(
            `/projects/${projectId}/experiments`,
            { params },
        );
        return res.data;
    },

    async getExperiment(projectId: string, experimentId: string): Promise<Experiment> {
        const res = await api.get<Experiment>(
            `/projects/${projectId}/experiments/${experimentId}`,
        );
        return res.data;
    },

    async createExperiment(
        projectId: string,
        data: ExperimentCreate,
    ): Promise<Experiment> {
        const res = await api.post<Experiment>(
            `/projects/${projectId}/experiments`,
            data,
        );
        return res.data;
    },

    async getStatus(
        projectId: string,
        experimentId: string,
    ): Promise<ExperimentStatusResponse> {
        const res = await api.get<ExperimentStatusResponse>(
            `/projects/${projectId}/experiments/${experimentId}/status`,
        );
        return res.data;
    },

    async cancelExperiment(
        projectId: string,
        experimentId: string,
    ): Promise<Experiment> {
        const res = await api.post<Experiment>(
            `/projects/${projectId}/experiments/${experimentId}/cancel`,
        );
        return res.data;
    },

    async deleteExperiment(
        projectId: string,
        experimentId: string,
    ): Promise<void> {
        await api.delete(
            `/projects/${projectId}/experiments/${experimentId}`,
        );
    },
};
