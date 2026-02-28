// ---------------------------------------------------------------------------
// useFirewall — rules CRUD, logs / stats queries, integration
// ---------------------------------------------------------------------------

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { firewallService, type FirewallLogParams } from '@/services/firewallService';
import type { FirewallRuleCreate, FirewallRuleUpdate } from '@/types/firewall';
import { DEFAULT_LOG_PAGE_SIZE } from '@/utils/constants';

const KEYS = {
    integration: (pid: string) => ['firewall', pid, 'integration'] as const,
    rules: (pid: string) => ['firewall', pid, 'rules'] as const,
    logs: (pid: string, params?: Omit<FirewallLogParams, 'cursor'>) =>
        ['firewall', pid, 'logs', params] as const,
    stats: (pid: string, period?: string) =>
        ['firewall', pid, 'stats', period] as const,
};

export function useFirewall(projectId: string) {
    const queryClient = useQueryClient();

    // ── Integration ──
    const integration = useQuery({
        queryKey: KEYS.integration(projectId),
        queryFn: () => firewallService.getIntegration(projectId),
        enabled: !!projectId,
    });

    // ── Rules ──
    const rules = useQuery({
        queryKey: KEYS.rules(projectId),
        queryFn: () => firewallService.getRules(projectId),
        enabled: !!projectId,
    });

    const createRule = useMutation({
        mutationFn: (data: FirewallRuleCreate) =>
            firewallService.createRule(projectId, data),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: KEYS.rules(projectId) }),
    });

    const updateRule = useMutation({
        mutationFn: ({ ruleId, data }: { ruleId: string; data: FirewallRuleUpdate }) =>
            firewallService.updateRule(projectId, ruleId, data),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: KEYS.rules(projectId) }),
    });

    const deleteRule = useMutation({
        mutationFn: (ruleId: string) =>
            firewallService.deleteRule(projectId, ruleId),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: KEYS.rules(projectId) }),
    });

    return { integration, rules, createRule, updateRule, deleteRule };
}

export function useFirewallLogs(
    projectId: string,
    params?: Omit<FirewallLogParams, 'cursor'>,
) {
    return useInfiniteQuery({
        queryKey: KEYS.logs(projectId, params),
        queryFn: ({ pageParam }) =>
            firewallService.getLogs(projectId, {
                ...params,
                cursor: pageParam as string | undefined,
                page_size: params?.page_size ?? DEFAULT_LOG_PAGE_SIZE,
            }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_cursor : undefined,
        enabled: !!projectId,
    });
}

export function useFirewallStats(projectId: string, period?: string) {
    return useQuery({
        queryKey: KEYS.stats(projectId, period),
        queryFn: () => firewallService.getStats(projectId, period),
        enabled: !!projectId,
    });
}
