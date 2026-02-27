// ---------------------------------------------------------------------------
// useExperiments — experiment queries with polling, create / cancel
// ---------------------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    experimentService,
    type ExperimentListParams,
} from '@/services/experimentService';
import type { ExperimentCreate } from '@/types/experiment';
import { EXPERIMENT_POLL_INTERVAL } from '@/utils/constants';

const KEYS = {
    all: (projectId: string) => ['experiments', projectId] as const,
    list: (projectId: string, params?: ExperimentListParams) =>
        ['experiments', projectId, 'list', params] as const,
    detail: (projectId: string, eid: string) =>
        ['experiments', projectId, eid] as const,
    status: (projectId: string, eid: string) =>
        ['experiments', projectId, eid, 'status'] as const,
};

export function useExperiments(projectId: string, params?: ExperimentListParams) {
    const queryClient = useQueryClient();

    const list = useQuery({
        queryKey: KEYS.list(projectId, params),
        queryFn: () => experimentService.getExperiments(projectId, params),
        enabled: !!projectId,
        refetchInterval: (query) => {
            // Poll if any experiment is in a non-terminal state
            const data = query.state.data;
            const hasRunning = data?.items.some(
                (e) => e.status === 'running' || e.status === 'pending',
            );
            return hasRunning ? EXPERIMENT_POLL_INTERVAL : false;
        },
    });

    const create = useMutation({
        mutationFn: (data: ExperimentCreate) =>
            experimentService.createExperiment(projectId, data),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: KEYS.all(projectId) }),
    });

    const cancel = useMutation({
        mutationFn: (eid: string) =>
            experimentService.cancelExperiment(projectId, eid),
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: KEYS.all(projectId) }),
    });

    return { list, create, cancel };
}

export function useExperiment(projectId: string, experimentId: string) {
    return useQuery({
        queryKey: KEYS.detail(projectId, experimentId),
        queryFn: () => experimentService.getExperiment(projectId, experimentId),
        enabled: !!projectId && !!experimentId,
    });
}

export function useExperimentStatus(projectId: string, experimentId: string, enabled: boolean) {
    return useQuery({
        queryKey: KEYS.status(projectId, experimentId),
        queryFn: () => experimentService.getStatus(projectId, experimentId),
        enabled: enabled && !!projectId && !!experimentId,
        refetchInterval: enabled ? EXPERIMENT_POLL_INTERVAL : false,
    });
}
