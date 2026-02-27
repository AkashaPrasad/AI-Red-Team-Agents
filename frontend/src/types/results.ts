// ---------------------------------------------------------------------------
// Results types (matches backend schemas/results.py)
// ---------------------------------------------------------------------------

import type { CursorPaginatedResponse } from './api';
import type { FeedbackSnapshot } from './feedback';

export type VerdictResult = 'pass' | 'fail' | 'error';
export type Severity = 'high' | 'medium' | 'low';

/** Severity breakdown within the dashboard */
export interface SeverityBreakdown {
    high: number;
    medium: number;
    low: number;
}

/** Per-category breakdown row */
export interface CategoryBreakdownItem {
    risk_category: string;
    total: number;
    passed: number;
    failed: number;
    high_severity: number;
    owasp_mapping: string | null;
}

/** Fail impact assessment */
export interface FailImpact {
    level: 'critical' | 'high' | 'medium' | 'low' | 'none';
    high_count: number;
    medium_count: number;
    low_count: number;
    summary: string;
}

/** AI-generated insights */
export interface Insights {
    summary: string;
    key_findings: string[];
    risk_assessment: string;
    recommendations: string[];
}

/** Full dashboard response */
export interface DashboardResponse {
    experiment_id: string;
    experiment_name: string;
    experiment_type: string;
    sub_type: string;
    status: string;
    total_tests: number;
    passed: number;
    failed: number;
    errors: number;
    pass_rate: number;
    error_rate: number;
    fail_impact: FailImpact | null;
    severity_breakdown: SeverityBreakdown;
    category_breakdown: CategoryBreakdownItem[];
    insights: Insights | null;
}

/** Conversation turn in multi-turn experiments */
export interface ConversationTurn {
    turn_number: number;
    role: 'attacker' | 'target';
    content: string;
    timestamp: string;
}

/** Single log entry in the list */
export interface LogEntry {
    test_case_id: string;
    sequence_order: number;
    prompt_preview: string;
    result: VerdictResult;
    severity: Severity | null;
    risk_category: string | null;
    data_strategy: string | null;
    is_representative: boolean;
    has_feedback: boolean;
    created_at: string;
}

export type LogList = CursorPaginatedResponse<LogEntry>;

/** Full log detail response */
export interface LogDetailResponse {
    test_case_id: string;
    sequence_order: number;
    prompt: string;
    response: string;
    result: VerdictResult;
    severity: Severity | null;
    confidence: number | null;
    risk_category: string | null;
    owasp_mapping: string | null;
    data_strategy: string | null;
    attack_converter: string | null;
    explanation: string | null;
    latency_ms: number | null;
    is_representative: boolean;
    conversation_turns: ConversationTurn[] | null;
    my_feedback: FeedbackSnapshot | null;
    created_at: string;
}
