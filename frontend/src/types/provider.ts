// ---------------------------------------------------------------------------
// Provider types (matches backend schemas/providers.py)
// ---------------------------------------------------------------------------

import type { UserBrief, PaginatedResponse } from './api';

export type ProviderType = 'openai' | 'azure_openai' | 'groq';

export interface ProviderCreate {
    name: string;
    provider_type: ProviderType;
    api_key: string;
    endpoint_url?: string;
    model?: string;
}

export interface ProviderUpdate {
    name?: string;
    api_key?: string;
    endpoint_url?: string;
    model?: string;
}

export interface Provider {
    id: string;
    name: string;
    provider_type: ProviderType;
    endpoint_url: string | null;
    model: string | null;
    api_key_preview: string;
    is_valid: boolean | null;
    created_by: UserBrief;
    created_at: string;
    updated_at: string;
}

export type ProviderList = PaginatedResponse<Provider>;

export interface ProviderValidationResult {
    is_valid: boolean;
    message: string;
    latency_ms: number | null;
}
