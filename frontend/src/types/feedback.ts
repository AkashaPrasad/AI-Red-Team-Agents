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

export interface VoteBreakdown {
    up: number;
    down: number;
}

export interface CorrectionBreakdown {
    pass: number;
    low: number;
    medium: number;
    high: number;
}

export interface FeedbackSummaryResponse {
    experiment_id: string;
    total_test_cases: number;
    total_with_feedback: number;
    feedback_coverage_percent: number;
    representative_total: number;
    representative_with_feedback: number;
    representative_coverage_percent: number;
    vote_breakdown: VoteBreakdown;
    correction_breakdown: CorrectionBreakdown;
}
