// ---------------------------------------------------------------------------
// useFeedback — submit / delete mutations with optimistic update, summary
// ---------------------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedbackService } from '@/services/feedbackService';
import type { FeedbackSubmit } from '@/types/feedback';

const KEYS = {
    summary: (eid: string) => ['feedback', eid, 'summary'] as const,
};

export function useFeedback(experimentId: string) {
    const queryClient = useQueryClient();

    const summary = useQuery({
        queryKey: KEYS.summary(experimentId),
        queryFn: () => feedbackService.getSummary(experimentId),
        enabled: !!experimentId,
    });

    const submit = useMutation({
        mutationFn: ({
            testCaseId,
            data,
        }: {
            testCaseId: string;
            data: FeedbackSubmit;
        }) => feedbackService.submitFeedback(experimentId, testCaseId, data),
        onSuccess: (_, { testCaseId }) => {
            // Invalidate the log detail to refresh feedback snapshot
            queryClient.invalidateQueries({
                queryKey: ['results', experimentId, 'logs', testCaseId],
            });
            // Refresh summary
            queryClient.invalidateQueries({ queryKey: KEYS.summary(experimentId) });
            // Refresh logs list (has_feedback flag)
            queryClient.invalidateQueries({
                queryKey: ['results', experimentId, 'logs'],
            });
        },
    });

    const remove = useMutation({
        mutationFn: (testCaseId: string) =>
            feedbackService.deleteFeedback(experimentId, testCaseId),
        onSuccess: (_, testCaseId) => {
            queryClient.invalidateQueries({
                queryKey: ['results', experimentId, 'logs', testCaseId],
            });
            queryClient.invalidateQueries({ queryKey: KEYS.summary(experimentId) });
            queryClient.invalidateQueries({
                queryKey: ['results', experimentId, 'logs'],
            });
        },
    });

    return { summary, submit, remove };
}
