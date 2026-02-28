// ---------------------------------------------------------------------------
// App-wide constants
// ---------------------------------------------------------------------------

/** How often to poll running experiments (ms) */
export const EXPERIMENT_POLL_INTERVAL = 3000;

/** Default page size for paginated lists */
export const DEFAULT_PAGE_SIZE = 12;

/** Default page size for cursor-paginated logs */
export const DEFAULT_LOG_PAGE_SIZE = 50;

/** Max comment length for feedback */
export const FEEDBACK_COMMENT_MAX_LENGTH = 150;

/** Sidebar width (px) */
export const SIDEBAR_WIDTH = 260;

/** Sidebar collapsed width (px) */
export const SIDEBAR_COLLAPSED_WIDTH = 72;

/** App title */
export const APP_TITLE = 'AI Red Team Agent';

/** Testing level metadata */
export const TESTING_LEVELS = {
    basic: { label: 'Basic', tests: '~500', duration: '5–15 min' },
    moderate: { label: 'Moderate', tests: '~1,200', duration: '15–30 min' },
    aggressive: { label: 'Aggressive', tests: '~2,000', duration: '30–60 min' },
} as const;

/** Experiment sub-type labels */
export const SUB_TYPE_LABELS: Record<string, string> = {
    owasp_llm_top10: 'OWASP LLM Top 10',
    owasp_agentic: 'OWASP Agentic',
    adaptive: 'Adaptive (Multi-Turn)',
    user_interaction: 'User Interaction',
    functional: 'Functional',
    scope_validation: 'Scope Validation',
};

/** Severity colours */
export const SEVERITY_COLORS = {
    high: '#d32f2f',
    medium: '#ed6c02',
    low: '#2e7d32',
} as const;

/** Verdict result colours */
export const RESULT_COLORS = {
    pass: '#2e7d32',
    fail: '#d32f2f',
    error: '#ed6c02',
} as const;
