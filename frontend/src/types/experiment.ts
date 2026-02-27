// ---------------------------------------------------------------------------
// Experiment types (matches backend schemas/experiments.py)
// ---------------------------------------------------------------------------

import type { ProviderBrief, PaginatedResponse } from './api';

export type ExperimentType = 'adversarial' | 'behavioural';

export type ExperimentSubType =
    | 'owasp_llm_top10'
    | 'owasp_agentic'
    | 'adaptive'
    | 'happy_path'
    | 'edge_cases'
    | 'scope_validation';

export type TurnMode = 'single_turn' | 'multi_turn';
export type TestingLevel = 'basic' | 'moderate' | 'aggressive';
export type ExperimentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TargetConfig {
    endpoint_url: string;
    method: 'POST' | 'PUT';
    headers?: Record<string, string>;
    payload_template: string;
    auth_type?: 'bearer' | 'api_key' | 'basic' | 'none';
    auth_value?: string;
    timeout_seconds?: number;
    thread_endpoint_url?: string;
    thread_id_path?: string;
}

export interface ExperimentCreate {
    name: string;
    description?: string;
    provider_id: string;
    experiment_type: ExperimentType;
    sub_type: ExperimentSubType;
    turn_mode: TurnMode;
    testing_level: TestingLevel;
    language?: string;
    target_config: TargetConfig;
}

export interface ExperimentProgress {
    completed: number;
    total: number;
    percentage: number;
    estimated_remaining_seconds: number | null;
}

export interface ExperimentAnalytics {
    total_tests: number;
    passed: number;
    failed: number;
    errors: number;
    pass_rate: number;
    error_rate: number;
}

export interface Experiment {
    id: string;
    name: string;
    description: string | null;
    experiment_type: ExperimentType;
    sub_type: ExperimentSubType;
    turn_mode: TurnMode;
    testing_level: TestingLevel;
    language: string;
    target_config: TargetConfig;
    status: ExperimentStatus;
    progress: ExperimentProgress | null;
    analytics: ExperimentAnalytics | null;
    provider: ProviderBrief;
    error_message: string | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
}

export interface ExperimentSummary {
    id: string;
    name: string;
    experiment_type: ExperimentType;
    sub_type: ExperimentSubType;
    turn_mode: TurnMode;
    testing_level: TestingLevel;
    status: ExperimentStatus;
    progress: ExperimentProgress | null;
    pass_rate: number | null;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
}

export type ExperimentList = PaginatedResponse<ExperimentSummary>;

export interface ExperimentStatusResponse {
    status: ExperimentStatus;
    progress: ExperimentProgress | null;
    analytics: ExperimentAnalytics | null;
    error_message: string | null;
}
