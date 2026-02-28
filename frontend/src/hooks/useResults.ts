// ---------------------------------------------------------------------------
// useResults — dashboard query, paginated logs, log detail
// ---------------------------------------------------------------------------

import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { resultsService, type LogListParams } from '@/services/resultsService';
import { DEFAULT_LOG_PAGE_SIZE } from '@/utils/constants';

const KEYS = {
    dashboard: (eid: string) => ['results', eid, 'dashboard'] as const,
    logs: (eid: string, params?: Omit<LogListParams, 'cursor'>) =>
        ['results', eid, 'logs', params] as const,
    logDetail: (eid: string, tcId: string) =>
        ['results', eid, 'logs', tcId] as const,
};

export function useDashboard(experimentId: string, experimentStatus?: string) {
    return useQuery({
        queryKey: KEYS.dashboard(experimentId),
        queryFn: () => resultsService.getDashboard(experimentId),
        enabled:
            !!experimentId &&
            (experimentStatus === 'completed' ||
                experimentStatus === 'failed' ||
                experimentStatus === 'cancelled'),
        retry: false,
    });
}

export function useLogs(
    experimentId: string,
    params?: Omit<LogListParams, 'cursor'>,
) {
    return useInfiniteQuery({
        queryKey: KEYS.logs(experimentId, params),
        queryFn: ({ pageParam }) =>
            resultsService.getLogs(experimentId, {
                ...params,
                cursor: pageParam as string | undefined,
                page_size: params?.page_size ?? DEFAULT_LOG_PAGE_SIZE,
            }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) =>
            lastPage.has_more ? lastPage.next_cursor : undefined,
        enabled: !!experimentId,
    });
}

export function useLogDetail(experimentId: string, testCaseId: string) {
    return useQuery({
        queryKey: KEYS.logDetail(experimentId, testCaseId),
        queryFn: () => resultsService.getLogDetail(experimentId, testCaseId),
        enabled: !!experimentId && !!testCaseId,
    });
}

export function useResults() {
    return { useDashboard, useLogs, useLogDetail };
}
