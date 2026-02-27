// ---------------------------------------------------------------------------
// Firewall service — rules CRUD + logs + stats + integration
// ---------------------------------------------------------------------------

import api from './api';
import type {
    FirewallRule,
    FirewallRuleCreate,
    FirewallRuleUpdate,
    FirewallRuleList,
    FirewallLogList,
    FirewallStatsResponse,
    FirewallIntegrationResponse,
} from '@/types/firewall';

export interface FirewallLogParams {
    cursor?: string;
    page_size?: number;
    verdict_status?: string;
    fail_category?: string;
    date_from?: string;
    date_to?: string;
    sort_by?: string;
    sort_order?: 'asc' | 'desc';
}

export const firewallService = {
    // ── Integration ──
    async getIntegration(projectId: string): Promise<FirewallIntegrationResponse> {
        const res = await api.get<FirewallIntegrationResponse>(
            `/projects/${projectId}/firewall/integration`,
        );
        return res.data;
    },

    // ── Rules ──
    async getRules(projectId: string): Promise<FirewallRuleList> {
        const res = await api.get<FirewallRuleList>(
            `/projects/${projectId}/firewall/rules`,
        );
        return res.data;
    },

    async createRule(projectId: string, data: FirewallRuleCreate): Promise<FirewallRule> {
        const res = await api.post<FirewallRule>(
            `/projects/${projectId}/firewall/rules`,
            data,
        );
        return res.data;
    },

    async updateRule(
        projectId: string,
        ruleId: string,
        data: FirewallRuleUpdate,
    ): Promise<FirewallRule> {
        const res = await api.put<FirewallRule>(
            `/projects/${projectId}/firewall/rules/${ruleId}`,
            data,
        );
        return res.data;
    },

    async deleteRule(projectId: string, ruleId: string): Promise<void> {
        await api.delete(`/projects/${projectId}/firewall/rules/${ruleId}`);
    },

    // ── Logs ──
    async getLogs(
        projectId: string,
        params?: FirewallLogParams,
    ): Promise<FirewallLogList> {
        const res = await api.get<FirewallLogList>(
            `/projects/${projectId}/firewall/logs`,
            { params },
        );
        return res.data;
    },

    // ── Stats ──
    async getStats(
        projectId: string,
        period?: string,
    ): Promise<FirewallStatsResponse> {
        const res = await api.get<FirewallStatsResponse>(
            `/projects/${projectId}/firewall/stats`,
            { params: period ? { period } : undefined },
        );
        return res.data;
    },
};
