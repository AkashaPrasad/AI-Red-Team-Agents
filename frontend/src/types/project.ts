// ---------------------------------------------------------------------------
// Project types (matches backend schemas/projects.py)
// ---------------------------------------------------------------------------

import type { UserBrief, PaginatedResponse } from './api';

export interface ProjectCreate {
    name: string;
    description?: string;
    business_scope: string;
    allowed_intents?: string[];
    restricted_intents?: string[];
}

export interface ProjectUpdate {
    name?: string;
    description?: string;
    business_scope?: string;
    allowed_intents?: string[];
    restricted_intents?: string[];
    is_active?: boolean;
}

export interface Project {
    id: string;
    name: string;
    description: string | null;
    business_scope: string;
    allowed_intents: string[];
    restricted_intents: string[];
    analyzed_scope: Record<string, unknown> | null;
    api_key_prefix: string | null;
    is_active: boolean;
    created_by: UserBrief | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectSummary {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    experiment_count: number;
    created_at: string;
    updated_at: string;
}

export type ProjectList = PaginatedResponse<ProjectSummary>;

export interface ApiKeyResponse {
    api_key: string;
    api_key_prefix: string;
    message: string;
}

export interface ScopeAnalysisResponse {
    analyzed_scope: Record<string, unknown>;
    message: string;
}
