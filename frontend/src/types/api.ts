// ---------------------------------------------------------------------------
// Generic API response envelope types
// ---------------------------------------------------------------------------

/** Standard paginated list response from backend */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    page_size: number;
    pages: number;
}

/** Cursor-based paginated list response */
export interface CursorPaginatedResponse<T> {
    items: T[];
    next_cursor: string | null;
    has_more: boolean;
}

/** Generic error body returned by the API */
export interface ApiError {
    detail: string;
}

/** Generic message body returned by the API */
export interface MessageResponse {
    message: string;
}

/** Brief user reference embedded in other responses */
export interface UserBrief {
    id: string;
    email: string;
    full_name: string;
}

/** Brief provider reference embedded in other responses */
export interface ProviderBrief {
    id: string;
    name: string;
    provider_type: string;
}
