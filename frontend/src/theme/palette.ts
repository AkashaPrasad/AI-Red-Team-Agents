// ---------------------------------------------------------------------------
// MUI palette — refined modern palette with glass-ready surfaces
// ---------------------------------------------------------------------------

import type { PaletteOptions } from '@mui/material/styles';

export const lightPalette: PaletteOptions = {
    mode: 'light',
    primary: {
        main: '#6366f1',
        light: '#818cf8',
        dark: '#4f46e5',
        contrastText: '#ffffff',
    },
    secondary: {
        main: '#8b5cf6',
        light: '#a78bfa',
        dark: '#7c3aed',
        contrastText: '#ffffff',
    },
    error: {
        main: '#ef4444',
        light: '#fca5a5',
        dark: '#dc2626',
    },
    warning: {
        main: '#f59e0b',
        light: '#fcd34d',
        dark: '#d97706',
    },
    success: {
        main: '#10b981',
        light: '#6ee7b7',
        dark: '#059669',
    },
    info: {
        main: '#3b82f6',
        light: '#93c5fd',
        dark: '#2563eb',
    },
    background: {
        default: '#f4f6fb',
        paper: '#ffffff',
    },
    text: {
        primary: '#111827',
        secondary: '#6b7280',
    },
    divider: 'rgba(0, 0, 0, 0.06)',
    action: {
        hover: 'rgba(99, 102, 241, 0.05)',
        selected: 'rgba(99, 102, 241, 0.09)',
        focus: 'rgba(99, 102, 241, 0.14)',
        disabledBackground: 'rgba(0, 0, 0, 0.04)',
    },
};

export const darkPalette: PaletteOptions = {
    mode: 'dark',
    primary: {
        main: '#818cf8',
        light: '#a5b4fc',
        dark: '#6366f1',
        contrastText: '#0f172a',
    },
    secondary: {
        main: '#a78bfa',
        light: '#c4b5fd',
        dark: '#8b5cf6',
        contrastText: '#0f172a',
    },
    error: {
        main: '#f87171',
        light: '#fca5a5',
        dark: '#ef4444',
    },
    warning: {
        main: '#fbbf24',
        light: '#fde68a',
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
        default: '#0c1222',
        paper: '#151d30',
    },
    text: {
        primary: '#f1f5f9',
        secondary: '#94a3b8',
    },
    divider: 'rgba(255, 255, 255, 0.06)',
    action: {
        hover: 'rgba(129, 140, 248, 0.08)',
        selected: 'rgba(129, 140, 248, 0.14)',
        focus: 'rgba(129, 140, 248, 0.18)',
        disabledBackground: 'rgba(255, 255, 255, 0.06)',
    },
};
