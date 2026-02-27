// ---------------------------------------------------------------------------
// MUI theme factory — modern with CSS variables & responsive fonts
// ---------------------------------------------------------------------------

import { createTheme, responsiveFontSizes, type Theme } from '@mui/material/styles';
import { lightPalette, darkPalette } from './palette';
import { typography } from './typography';
import { components } from './components';

export type ThemeMode = 'light' | 'dark';

export function buildTheme(mode: ThemeMode): Theme {
    let theme = createTheme({
        cssVariables: true,
        palette: mode === 'light' ? lightPalette : darkPalette,
        typography,
        components,
        shape: {
            borderRadius: 12,
        },
        shadows: [
            'none',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 2px 4px rgba(0,0,0,0.06)',
            '0 4px 8px rgba(0,0,0,0.06)',
            '0 6px 12px rgba(0,0,0,0.06)',
            '0 8px 16px rgba(0,0,0,0.06)',
            '0 12px 24px rgba(0,0,0,0.08)',
            '0 16px 32px rgba(0,0,0,0.08)',
            '0 20px 40px rgba(0,0,0,0.1)',
            '0 24px 48px rgba(0,0,0,0.1)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
            '0 1px 2px rgba(0,0,0,0.04)',
        ],
    });
    theme = responsiveFontSizes(theme, { factor: 3 });
    return theme;
}
