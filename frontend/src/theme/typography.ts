// ---------------------------------------------------------------------------
// MUI typography — modern, clean with Inter
// ---------------------------------------------------------------------------

import type { ThemeOptions } from '@mui/material/styles';

export const typography: NonNullable<ThemeOptions['typography']> = {
    fontFamily: [
        'Inter',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
    ].join(','),
    h1: {
        fontWeight: 800,
        fontSize: '2.25rem',
        lineHeight: 1.2,
        letterSpacing: '-0.025em',
    },
    h2: {
        fontWeight: 700,
        fontSize: '1.875rem',
        lineHeight: 1.25,
        letterSpacing: '-0.02em',
    },
    h3: {
        fontWeight: 700,
        fontSize: '1.5rem',
        lineHeight: 1.3,
        letterSpacing: '-0.015em',
    },
    h4: {
        fontWeight: 700,
        fontSize: '1.25rem',
        lineHeight: 1.35,
        letterSpacing: '-0.01em',
    },
    h5: {
        fontWeight: 600,
        fontSize: '1.125rem',
        lineHeight: 1.4,
        letterSpacing: '-0.005em',
    },
    h6: {
        fontWeight: 600,
        fontSize: '1rem',
        lineHeight: 1.5,
    },
    subtitle1: {
        fontSize: '1rem',
        fontWeight: 500,
        lineHeight: 1.5,
        letterSpacing: '0.005em',
    },
    subtitle2: {
        fontSize: '0.875rem',
        fontWeight: 600,
        lineHeight: 1.5,
        letterSpacing: '0.01em',
    },
    body1: {
        fontSize: '0.9375rem',
        lineHeight: 1.65,
        letterSpacing: '0.01em',
    },
    body2: {
        fontSize: '0.8125rem',
        lineHeight: 1.6,
        letterSpacing: '0.01em',
    },
    caption: {
        fontSize: '0.75rem',
        lineHeight: 1.5,
        fontWeight: 500,
        letterSpacing: '0.02em',
    },
    overline: {
        fontSize: '0.6875rem',
        fontWeight: 700,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
    },
    button: {
        textTransform: 'none',
        fontWeight: 600,
        letterSpacing: '0.01em',
    },
};
