// ---------------------------------------------------------------------------
// MUI palette definitions — modern vibrant theme
// ---------------------------------------------------------------------------

import type { PaletteOptions } from '@mui/material/styles';

export const lightPalette: PaletteOptions = {
    mode: 'light',
    primary: {
        main: '#6366f1',     // Indigo-500 — vibrant, modern
        light: '#818cf8',    // Indigo-400
        dark: '#4f46e5',     // Indigo-600
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#ec4899',     // Pink-500
        light: '#f472b6',    // Pink-400
        dark: '#db2777',     // Pink-600
        contrastText: '#ffffff',
    },
    error: {
        main: '#ef4444',
        light: '#f87171',
        dark: '#dc2626',
    },
    warning: {
        main: '#f59e0b',
        light: '#fbbf24',
        dark: '#d97706',
    },
    success: {
        main: '#10b981',
        light: '#34d399',
        dark: '#059669',
    },
    info: {
        main: '#3b82f6',
        light: '#60a5fa',
        dark: '#2563eb',
    },
    background: {
        default: '#f8fafc',   // Slate-50
        paper: '#ffffff',
    },
    text: {
        primary: '#0f172a',   // Slate-900
        secondary: '#64748b', // Slate-500
    },
    divider: 'rgba(148, 163, 184, 0.16)',
    action: {
        hover: 'rgba(99, 102, 241, 0.04)',
        selected: 'rgba(99, 102, 241, 0.08)',
        focus: 'rgba(99, 102, 241, 0.12)',
    },
};

export const darkPalette: PaletteOptions = {
    mode: 'dark',
    primary: {
        main: '#818cf8',     // Indigo-400
        light: '#a5b4fc',    // Indigo-300
        dark: '#6366f1',     // Indigo-500
        contrastText: '#0f172a',
    },
    secondary: {
        main: '#f472b6',     // Pink-400
        light: '#f9a8d4',    // Pink-300
        dark: '#ec4899',     // Pink-500
        contrastText: '#0f172a',
    },
    error: {
        main: '#f87171',
        light: '#fca5a5',
        dark: '#ef4444',
    },
    warning: {
        main: '#fbbf24',
        light: '#fcd34d',
        dark: '#f59e0b',
    },
    success: {
        main: '#34d399',
        light: '#6ee7b7',
        dark: '#10b981',
    },
    info: {
        main: '#60a5fa',
        light: '#93c5fd',
        dark: '#3b82f6',
    },
    background: {
        default: '#0f172a',   // Slate-900
        paper: '#1e293b',     // Slate-800
    },
    text: {
        primary: '#f1f5f9',   // Slate-100
        secondary: '#94a3b8', // Slate-400
    },
    divider: 'rgba(148, 163, 184, 0.12)',
    action: {
        hover: 'rgba(129, 140, 248, 0.08)',
        selected: 'rgba(129, 140, 248, 0.12)',
        focus: 'rgba(129, 140, 248, 0.16)',
    },
};
