// ---------------------------------------------------------------------------
// Feedback service — submit, delete, summary
// ---------------------------------------------------------------------------

import api from './api';
import type { FeedbackSubmit, FeedbackResponse, FeedbackSummaryResponse } from '@/types/feedback';

export const feedbackService = {
    async submitFeedback(
        experimentId: string,
        testCaseId: string,
        data: FeedbackSubmit,
    ): Promise<FeedbackResponse> {
        const res = await api.post<FeedbackResponse>(
            `/experiments/${experimentId}/logs/${testCaseId}/feedback`,
            data,
        );
        return res.data;
    },

    async deleteFeedback(experimentId: string, testCaseId: string): Promise<void> {
        await api.delete(`/experiments/${experimentId}/logs/${testCaseId}/feedback`);
    },

    async getSummary(experimentId: string): Promise<FeedbackSummaryResponse> {
        const res = await api.get<FeedbackSummaryResponse>(
            `/experiments/${experimentId}/feedback-summary`,
        );
        return res.data;
    },
};
