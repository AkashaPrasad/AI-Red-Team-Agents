// ---------------------------------------------------------------------------
// Form validation helpers
// ---------------------------------------------------------------------------

export function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export function isValidJson(text: string): boolean {
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}

export function isNonEmpty(value: string | undefined | null): boolean {
    return !!value && value.trim().length > 0;
}

export function hasMinLength(value: string, min: number): boolean {
    return value.trim().length >= min;
}

export function hasMaxLength(value: string, max: number): boolean {
    return value.length <= max;
}

/**
 * Validates that a payload template contains the {{prompt}} placeholder.
 */
export function hasPromptPlaceholder(template: string): boolean {
    return template.includes('{{prompt}}');
}
