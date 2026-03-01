// ---------------------------------------------------------------------------
// MUI component overrides — polished, smooth, professional
// ---------------------------------------------------------------------------

import type { Components, Theme } from '@mui/material/styles';

const TRANSITION = 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)';

export const components: Components<Theme> = {
    // ── Global baseline ───────────────────────────────────────────────────
    MuiCssBaseline: {
        styleOverrides: {
            '*, *::before, *::after': {
                boxSizing: 'border-box',
            },
            html: {
                scrollBehavior: 'smooth',
            },
            body: {
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(148,163,184,0.25) transparent',
                '&::-webkit-scrollbar': {
                    width: 6,
                    height: 6,
                },
                '&::-webkit-scrollbar-track': {
                    background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                    borderRadius: 100,
                    backgroundColor: 'rgba(148,163,184,0.25)',
                    '&:hover': {
                        backgroundColor: 'rgba(148,163,184,0.4)',
                    },
                },
            },
        },
    },

    // ── Buttons ───────────────────────────────────────────────────────────
    MuiButton: {
        defaultProps: {
            disableElevation: true,
        },
        styleOverrides: {
            root: {
                borderRadius: 11,
                fontWeight: 600,
                padding: '8px 22px',
                transition: TRANSITION,
                '&:active': {
                    transform: 'scale(0.97)',
                },
            },
            containedPrimary: ({ theme }) => ({
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                boxShadow: `0 2px 8px ${theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.28)' : 'rgba(99,102,241,0.22)'}`,
                '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                    boxShadow: `0 6px 20px ${theme.palette.mode === 'dark' ? 'rgba(99,102,241,0.36)' : 'rgba(99,102,241,0.30)'}`,
                    transform: 'translateY(-1px)',
                },
            }),
            outlined: ({ theme }) => ({
                borderWidth: 1.5,
                borderColor: theme.palette.divider,
                '&:hover': {
                    borderWidth: 1.5,
                    borderColor: theme.palette.primary.main,
                    backgroundColor: theme.palette.action.hover,
                    transform: 'translateY(-1px)',
                },
            }),
            text: {
                '&:hover': {
                    transform: 'translateY(-0.5px)',
                },
            },
            sizeLarge: {
                padding: '12px 30px',
                fontSize: '0.9375rem',
            },
            sizeSmall: {
                padding: '5px 14px',
                fontSize: '0.8125rem',
                borderRadius: 9,
            },
        },
    },

    // ── Cards ─────────────────────────────────────────────────────────────
    MuiCard: {
        defaultProps: {
            variant: 'outlined',
        },
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 18,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper,
                transition: TRANSITION,
                overflow: 'hidden',
                '&:hover': {
                    borderColor: theme.palette.mode === 'dark'
                        ? 'rgba(129,140,248,0.3)'
                        : 'rgba(99,102,241,0.25)',
                    boxShadow: theme.palette.mode === 'dark'
                        ? '0 8px 28px rgba(0,0,0,0.32)'
                        : '0 8px 28px rgba(99,102,241,0.10)',
                    transform: 'translateY(-2px)',
                },
            }),
        },
    },

    // ── Paper ─────────────────────────────────────────────────────────────
    MuiPaper: {
        defaultProps: {
            elevation: 0,
        },
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 18,
                backgroundImage: 'none',
                ...(theme.palette.mode === 'dark' && {
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                }),
                ...(theme.palette.mode === 'light' && {
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                }),
            }),
            outlined: ({ theme }) => ({
                border: `1px solid ${theme.palette.divider}`,
            }),
        },
    },

    // ── AppBar ────────────────────────────────────────────────────────────
    MuiAppBar: {
        styleOverrides: {
            root: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(12, 18, 34, 0.75)'
                    : 'rgba(255, 255, 255, 0.70)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                borderBottom: `1px solid ${theme.palette.divider}`,
                boxShadow: 'none',
            }),
        },
    },

    // ── Drawer ────────────────────────────────────────────────────────────
    MuiDrawer: {
        styleOverrides: {
            paper: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? '#0c1222'
                    : '#ffffff',
                borderRight: `1px solid ${theme.palette.divider}`,
            }),
        },
    },

    // ── Dialog ────────────────────────────────────────────────────────────
    MuiDialog: {
        styleOverrides: {
            paper: ({ theme }) => ({
                borderRadius: 22,
                boxShadow: theme.palette.mode === 'dark'
                    ? '0 32px 64px rgba(0,0,0,0.5)'
                    : '0 32px 64px rgba(0,0,0,0.10)',
                border: `1px solid ${theme.palette.divider}`,
            }),
            backdrop: {
                backdropFilter: 'blur(6px)',
                backgroundColor: 'rgba(0,0,0,0.35)',
            },
        },
    },

    // ── Chips ─────────────────────────────────────────────────────────────
    MuiChip: {
        styleOverrides: {
            root: {
                fontWeight: 600,
                borderRadius: 9,
                fontSize: '0.75rem',
                transition: TRANSITION,
            },
            colorSuccess: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(52,211,153,0.12)'
                    : 'rgba(16,185,129,0.08)',
                color: theme.palette.success.main,
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(52,211,153,0.24)' : 'rgba(16,185,129,0.18)'}`,
            }),
            colorError: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(248,113,113,0.12)'
                    : 'rgba(239,68,68,0.08)',
                color: theme.palette.error.main,
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(248,113,113,0.24)' : 'rgba(239,68,68,0.18)'}`,
            }),
            colorWarning: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(251,191,36,0.12)'
                    : 'rgba(245,158,11,0.08)',
                color: theme.palette.warning.main,
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(251,191,36,0.24)' : 'rgba(245,158,11,0.18)'}`,
            }),
            colorInfo: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(96,165,250,0.12)'
                    : 'rgba(59,130,246,0.08)',
                color: theme.palette.info.main,
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(96,165,250,0.24)' : 'rgba(59,130,246,0.18)'}`,
            }),
            colorPrimary: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(129,140,248,0.12)'
                    : 'rgba(99,102,241,0.08)',
                color: theme.palette.primary.main,
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(129,140,248,0.24)' : 'rgba(99,102,241,0.18)'}`,
            }),
        },
    },

    // ── Tables ────────────────────────────────────────────────────────────
    MuiTableHead: {
        styleOverrides: {
            root: ({ theme }) => ({
                '& .MuiTableCell-head': {
                    fontWeight: 700,
                    fontSize: '0.6875rem',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase' as const,
                    color: theme.palette.text.secondary,
                    backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(21,29,48,0.7)'
                        : 'rgba(244,246,251,1)',
                    borderBottom: `2px solid ${theme.palette.divider}`,
                },
            }),
        },
    },
    MuiTableCell: {
        styleOverrides: {
            root: ({ theme }) => ({
                fontSize: '0.8125rem',
                borderBottom: `1px solid ${theme.palette.divider}`,
                padding: '14px 16px',
            }),
        },
    },
    MuiTableRow: {
        styleOverrides: {
            root: {
                transition: 'background-color 0.15s ease',
                '&:hover': {
                    backgroundColor: 'rgba(99,102,241,0.03)',
                },
                '&:last-of-type .MuiTableCell-root': {
                    borderBottom: 0,
                },
            },
        },
    },

    // ── Form inputs ───────────────────────────────────────────────────────
    MuiTextField: {
        defaultProps: {
            variant: 'outlined',
            fullWidth: true,
            size: 'small',
        },
    },
    MuiOutlinedInput: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 11,
                transition: TRANSITION,
                '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 2,
                    boxShadow: `0 0 0 3px ${theme.palette.mode === 'dark'
                        ? 'rgba(129,140,248,0.12)'
                        : 'rgba(99,102,241,0.10)'}`,
                },
            }),
            notchedOutline: ({ theme }) => ({
                borderColor: theme.palette.divider,
                transition: TRANSITION,
            }),
        },
    },
    MuiSelect: {
        styleOverrides: {
            root: {
                borderRadius: 11,
            },
        },
    },

    // ── Tooltips ──────────────────────────────────────────────────────────
    MuiTooltip: {
        defaultProps: {
            arrow: true,
            enterDelay: 400,
        },
        styleOverrides: {
            tooltip: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark' ? '#1e293b' : '#111827',
                fontSize: '0.75rem',
                fontWeight: 500,
                borderRadius: 9,
                padding: '7px 14px',
                boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }),
            arrow: ({ theme }) => ({
                color: theme.palette.mode === 'dark' ? '#1e293b' : '#111827',
            }),
        },
    },

    // ── Progress bars ─────────────────────────────────────────────────────
    MuiLinearProgress: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 100,
                height: 6,
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(129,140,248,0.10)'
                    : 'rgba(99,102,241,0.08)',
            }),
            bar: {
                borderRadius: 100,
                background: 'linear-gradient(90deg, #6366f1, #818cf8, #a78bfa)',
            },
        },
    },

    // ── Tabs ──────────────────────────────────────────────────────────────
    MuiTabs: {
        styleOverrides: {
            indicator: {
                height: 3,
                borderRadius: '3px 3px 0 0',
                background: 'linear-gradient(90deg, #6366f1, #818cf8)',
            },
        },
    },
    MuiTab: {
        styleOverrides: {
            root: ({ theme }) => ({
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 48,
                transition: 'color 0.2s ease',
                '&.Mui-selected': {
                    color: theme.palette.primary.main,
                },
            }),
        },
    },

    // ── Avatars ───────────────────────────────────────────────────────────
    MuiAvatar: {
        styleOverrides: {
            root: {
                fontWeight: 600,
            },
            colorDefault: () => ({
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
            }),
        },
    },

    // ── List items ────────────────────────────────────────────────────────
    MuiListItemButton: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 11,
                margin: '2px 8px',
                padding: '9px 16px',
                transition: TRANSITION,
                '&.Mui-selected': {
                    backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(129,140,248,0.12)'
                        : 'rgba(99,102,241,0.07)',
                    color: theme.palette.primary.main,
                    '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.main,
                    },
                    '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(129,140,248,0.18)'
                            : 'rgba(99,102,241,0.11)',
                    },
                },
                '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                },
            }),
        },
    },
    MuiListItemIcon: {
        styleOverrides: {
            root: {
                minWidth: 40,
            },
        },
    },

    // ── Alerts ────────────────────────────────────────────────────────────
    MuiAlert: {
        styleOverrides: {
            root: {
                borderRadius: 13,
                fontWeight: 500,
            },
            standardError: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(248,113,113,0.08)'
                    : 'rgba(239,68,68,0.05)',
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(248,113,113,0.18)' : 'rgba(239,68,68,0.12)'}`,
            }),
            standardSuccess: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(52,211,153,0.08)'
                    : 'rgba(16,185,129,0.05)',
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(52,211,153,0.18)' : 'rgba(16,185,129,0.12)'}`,
            }),
            standardWarning: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(251,191,36,0.08)'
                    : 'rgba(245,158,11,0.05)',
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(251,191,36,0.18)' : 'rgba(245,158,11,0.12)'}`,
            }),
            standardInfo: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(96,165,250,0.08)'
                    : 'rgba(59,130,246,0.05)',
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(96,165,250,0.18)' : 'rgba(59,130,246,0.12)'}`,
            }),
        },
    },

    // ── Skeletons ─────────────────────────────────────────────────────────
    MuiSkeleton: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 12,
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.04)',
            }),
            rectangular: {
                borderRadius: 14,
            },
        },
    },

    // ── Pagination ────────────────────────────────────────────────────────
    MuiPagination: {
        styleOverrides: {
            root: {
                '& .MuiPaginationItem-root': {
                    borderRadius: 9,
                    fontWeight: 600,
                    transition: TRANSITION,
                },
            },
        },
    },

    // ── Breadcrumbs ───────────────────────────────────────────────────────
    MuiBreadcrumbs: {
        styleOverrides: {
            root: {
                fontSize: '0.8125rem',
            },
        },
    },

    // ── Dividers ──────────────────────────────────────────────────────────
    MuiDivider: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderColor: theme.palette.divider,
            }),
        },
    },

    // ── Menu ──────────────────────────────────────────────────────────────
    MuiMenu: {
        styleOverrides: {
            paper: ({ theme }) => ({
                borderRadius: 14,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: theme.palette.mode === 'dark'
                    ? '0 12px 36px rgba(0,0,0,0.40)'
                    : '0 12px 36px rgba(0,0,0,0.08)',
                marginTop: 6,
                backdropFilter: 'blur(20px)',
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(21,29,48,0.92)'
                    : 'rgba(255,255,255,0.95)',
            }),
        },
    },
    MuiMenuItem: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 8,
                margin: '2px 6px',
                padding: '8px 14px',
                fontSize: '0.875rem',
                transition: 'background-color 0.15s ease',
                '&:hover': {
                    backgroundColor: theme.palette.action.hover,
                },
            }),
        },
    },

    // ── Backdrop ──────────────────────────────────────────────────────────
    MuiBackdrop: {
        styleOverrides: {
            root: {
                backdropFilter: 'blur(6px)',
            },
        },
    },

    // ── Switches ──────────────────────────────────────────────────────────
    MuiSwitch: {
        styleOverrides: {
            root: {
                padding: 8,
            },
            track: ({ theme }) => ({
                borderRadius: 22,
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(255,255,255,0.14)'
                    : 'rgba(0,0,0,0.12)',
                opacity: 1,
            }),
        },
    },
};
