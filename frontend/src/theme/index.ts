// ---------------------------------------------------------------------------
// MUI theme factory — CSS variables, responsive fonts, smooth transitions
// ---------------------------------------------------------------------------

import { createTheme, responsiveFontSizes, type Theme } from '@mui/material/styles';
import { lightPalette, darkPalette } from './palette';
import { typography } from './typography';
import { components } from './components';

export type ThemeMode = 'light' | 'dark';

export function buildTheme(mode: ThemeMode): Theme {
    const isDark = mode === 'dark';
    let theme = createTheme({
        cssVariables: true,
        palette: isDark ? darkPalette : lightPalette,
        typography,
        components,
        shape: {
            borderRadius: 14,
        },
        transitions: {
            easing: {
                easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
                easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',
                easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
                sharp: 'cubic-bezier(0.4, 0, 0.6, 1)',
            },
            duration: {
                shortest: 120,
                shorter: 180,
                short: 220,
                standard: 260,
                complex: 340,
                enteringScreen: 200,
                leavingScreen: 160,
            },
        },
        shadows: [
            'none',
            isDark ? '0 1px 3px rgba(0,0,0,0.24)' : '0 1px 3px rgba(0,0,0,0.05)',
            isDark ? '0 2px 6px rgba(0,0,0,0.28)' : '0 2px 6px rgba(0,0,0,0.06)',
            isDark ? '0 4px 12px rgba(0,0,0,0.32)' : '0 4px 12px rgba(0,0,0,0.07)',
            isDark ? '0 6px 16px rgba(0,0,0,0.36)' : '0 6px 16px rgba(99,102,241,0.06)',
            isDark ? '0 8px 20px rgba(0,0,0,0.38)' : '0 8px 20px rgba(99,102,241,0.08)',
            isDark ? '0 12px 28px rgba(0,0,0,0.42)' : '0 12px 28px rgba(99,102,241,0.10)',
            isDark ? '0 16px 36px rgba(0,0,0,0.44)' : '0 16px 36px rgba(99,102,241,0.12)',
            isDark ? '0 20px 44px rgba(0,0,0,0.46)' : '0 20px 44px rgba(99,102,241,0.14)',
            isDark ? '0 24px 52px rgba(0,0,0,0.48)' : '0 24px 52px rgba(99,102,241,0.16)',
            // 10-24 fallback
            ...Array(15).fill(
                isDark ? '0 2px 8px rgba(0,0,0,0.30)' : '0 2px 8px rgba(0,0,0,0.06)',
            ),
        ] as Theme['shadows'],
    });
    theme = responsiveFontSizes(theme, { factor: 3 });
    return theme;
}
