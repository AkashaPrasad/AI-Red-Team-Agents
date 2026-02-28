// ---------------------------------------------------------------------------
// Firewall types (matches backend schemas/firewall.py)
// ---------------------------------------------------------------------------

import type { CursorPaginatedResponse } from './api';

export type FirewallRuleType = 'block_pattern' | 'allow_pattern' | 'custom_policy';
export type FirewallVerdictStatus = 'passed' | 'blocked';

export interface FirewallEvalRequest {
    prompt: string;
    agent_prompt?: string;
}

export interface FirewallRuleCreate {
    name: string;
    rule_type: FirewallRuleType;
    pattern?: string;
    policy?: string;
    priority?: number;
    is_active?: boolean;
}

export interface FirewallRuleUpdate {
    name?: string;
    pattern?: string;
    policy?: string;
    priority?: number;
    is_active?: boolean;
}

export interface FirewallVerdictResponse {
    status: FirewallVerdictStatus;
    fail_category: string | null;
    explanation: string | null;
    confidence: number | null;
    matched_rule: string | null;
}

export interface FirewallRule {
    id: string;
    name: string;
    rule_type: FirewallRuleType;
    pattern: string | null;
    policy: string | null;
    priority: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface FirewallRuleList {
    items: FirewallRule[];
    total: number;
}

export interface FirewallLogEntry {
    id: string;
    prompt_preview: string;
    verdict_status: FirewallVerdictStatus;
    fail_category: string | null;
    confidence: number | null;
    matched_rule_name: string | null;
    latency_ms: number;
    ip_address: string | null;
    created_at: string;
}

export type FirewallLogList = CursorPaginatedResponse<FirewallLogEntry>;

export interface DailyStats {
    date: string;
    total: number;
    passed: number;
    blocked: number;
}

export interface FirewallStatsResponse {
    total_requests: number;
    passed: number;
    blocked: number;
    pass_rate: number;
    category_breakdown: Record<string, number>;
    avg_latency_ms: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    daily_breakdown: DailyStats[];
}

export interface FirewallIntegrationResponse {
    endpoint_url: string;
    api_key_prefix: string;
    rate_limit: string;
    snippets: {
        python: string;
        javascript: string;
        curl: string;
    };
}
