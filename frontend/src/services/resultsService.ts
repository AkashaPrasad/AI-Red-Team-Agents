// ---------------------------------------------------------------------------
// Results service — dashboard + logs + log detail
// ---------------------------------------------------------------------------

import api from './api';
import type { DashboardResponse, LogList, LogDetailResponse } from '@/types/results';

export interface LogListParams {
    cursor?: string;
    page_size?: number;
    result?: string;
    severity?: string;
    risk_category?: string;
    data_strategy?: string;
    is_representative?: boolean;
    search?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export const resultsService = {
    async getDashboard(experimentId: string): Promise<DashboardResponse> {
        const res = await api.get<DashboardResponse>(
            `/experiments/${experimentId}/dashboard`,
        );
        return res.data;
    },

    async getLogs(experimentId: string, params?: LogListParams): Promise<LogList> {
        const res = await api.get<LogList>(
            `/experiments/${experimentId}/logs`,
            { params },
        );
        return res.data;
    },

    async getLogDetail(
        experimentId: string,
        testCaseId: string,
    ): Promise<LogDetailResponse> {
        const res = await api.get<LogDetailResponse>(
            `/experiments/${experimentId}/logs/${testCaseId}`,
        );
        return res.data;
    },
};
