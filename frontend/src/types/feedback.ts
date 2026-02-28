// ---------------------------------------------------------------------------
// Feedback types (matches backend schemas/feedback.py)
// ---------------------------------------------------------------------------

export type FeedbackVote = 'up' | 'down';
export type CorrectionValue = 'pass' | 'low' | 'medium' | 'high';

export interface FeedbackSubmit {
    vote: FeedbackVote;
    correction?: CorrectionValue;
    comment?: string;
}

export interface FeedbackResponse {
    id: string;
    test_case_id: string;
    vote: FeedbackVote;
    correction: CorrectionValue | null;
    comment: string | null;
    created_at: string;
    updated_at: string;
}

/** Snapshot of user's own feedback embedded in LogDetailResponse */
export interface FeedbackSnapshot {
    vote: FeedbackVote;
    correction: CorrectionValue | null;
    comment: string | null;
    created_at: string;
}

export interface CorrectionBreakdown {
    to_pass: number;
    to_low: number;
    to_medium: number;
    to_high: number;
}

export interface VoteBreakdown {
    thumbs_up: number;
    thumbs_down: number;
    corrections: CorrectionBreakdown;
}

export interface FeedbackSummaryResponse {
    experiment_id: string;
    total_test_cases: number;
    total_with_feedback: number;
    coverage_percentage: number;
    representative_total: number;
    representative_with_feedback: number;
    representative_coverage: number;
    vote_breakdown: VoteBreakdown;
    my_feedback_count: number;
}
