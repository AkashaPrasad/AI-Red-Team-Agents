// ---------------------------------------------------------------------------
// MUI component style overrides — modern, polished
// ---------------------------------------------------------------------------

import type { Components, Theme } from '@mui/material/styles';

export const components: Components<Theme> = {
    MuiCssBaseline: {
        styleOverrides: {
            body: {
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': {
                    width: 6,
                    height: 6,
                },
                '&::-webkit-scrollbar-thumb': {
                    borderRadius: 3,
                    backgroundColor: 'rgba(148, 163, 184, 0.3)',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                    backgroundColor: 'rgba(148, 163, 184, 0.5)',
                },
            },
        },
    },
    MuiButton: {
        defaultProps: {
            disableElevation: true,
        },
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 10,
                fontWeight: 600,
                padding: '8px 20px',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    transform: 'translateY(-1px)',
                    boxShadow: `0 4px 12px ${theme.palette.mode === 'dark'
                        ? 'rgba(0,0,0,0.4)'
                        : 'rgba(99, 102, 241, 0.25)'}`,
                },
            }),
            containedPrimary: ({ theme }) => ({
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                '&:hover': {
                    background: `linear-gradient(135deg, ${theme.palette.primary.light} 0%, ${theme.palette.primary.main} 100%)`,
                },
            }),
            outlined: {
                borderWidth: 1.5,
                '&:hover': {
                    borderWidth: 1.5,
                },
            },
            sizeLarge: {
                padding: '12px 28px',
                fontSize: '0.9375rem',
            },
            sizeSmall: {
                padding: '4px 12px',
                fontSize: '0.8125rem',
                borderRadius: 8,
            },
        },
    },
    MuiCard: {
        defaultProps: {
            variant: 'outlined',
        },
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 16,
                border: `1px solid ${theme.palette.divider}`,
                backgroundColor: theme.palette.background.paper,
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                    borderColor: theme.palette.primary.main,
                    boxShadow: theme.palette.mode === 'dark'
                        ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                        : '0 8px 32px rgba(99, 102, 241, 0.1)',
                },
            }),
        },
    },
    MuiPaper: {
        defaultProps: {
            elevation: 0,
        },
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 16,
                backgroundImage: 'none',
                ...(theme.palette.mode === 'dark' && {
                    backgroundColor: theme.palette.background.paper,
                    border: `1px solid ${theme.palette.divider}`,
                }),
            }),
            outlined: ({ theme }) => ({
                border: `1px solid ${theme.palette.divider}`,
            }),
        },
    },
    MuiAppBar: {
        styleOverrides: {
            root: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(15, 23, 42, 0.8)'
                    : 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(12px)',
                borderBottom: `1px solid ${theme.palette.divider}`,
                boxShadow: 'none',
            }),
        },
    },
    MuiDrawer: {
        styleOverrides: {
            paper: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? '#0f172a'
                    : '#ffffff',
                borderRight: `1px solid ${theme.palette.divider}`,
            }),
        },
    },
    MuiDialog: {
        styleOverrides: {
            paper: ({ theme }) => ({
                borderRadius: 20,
                boxShadow: theme.palette.mode === 'dark'
                    ? '0 24px 48px rgba(0, 0, 0, 0.5)'
                    : '0 24px 48px rgba(0, 0, 0, 0.12)',
            }),
        },
    },
    MuiChip: {
        styleOverrides: {
            root: {
                fontWeight: 600,
                borderRadius: 8,
                fontSize: '0.75rem',
            },
            colorSuccess: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(52, 211, 153, 0.15)'
                    : 'rgba(16, 185, 129, 0.1)',
                color: theme.palette.success.main,
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(52, 211, 153, 0.3)'
                    : 'rgba(16, 185, 129, 0.2)'}`,
            }),
            colorError: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(248, 113, 113, 0.15)'
                    : 'rgba(239, 68, 68, 0.1)',
                color: theme.palette.error.main,
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(248, 113, 113, 0.3)'
                    : 'rgba(239, 68, 68, 0.2)'}`,
            }),
            colorWarning: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(251, 191, 36, 0.15)'
                    : 'rgba(245, 158, 11, 0.1)',
                color: theme.palette.warning.main,
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(251, 191, 36, 0.3)'
                    : 'rgba(245, 158, 11, 0.2)'}`,
            }),
            colorInfo: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(96, 165, 250, 0.15)'
                    : 'rgba(59, 130, 246, 0.1)',
                color: theme.palette.info.main,
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(96, 165, 250, 0.3)'
                    : 'rgba(59, 130, 246, 0.2)'}`,
            }),
            colorPrimary: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(129, 140, 248, 0.15)'
                    : 'rgba(99, 102, 241, 0.1)',
                color: theme.palette.primary.main,
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(129, 140, 248, 0.3)'
                    : 'rgba(99, 102, 241, 0.2)'}`,
            }),
        },
    },
    MuiTableHead: {
        styleOverrides: {
            root: ({ theme }) => ({
                '& .MuiTableCell-head': {
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase' as const,
                    color: theme.palette.text.secondary,
                    backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(30, 41, 59, 0.5)'
                        : 'rgba(248, 250, 252, 1)',
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
                padding: '12px 16px',
            }),
        },
    },
    MuiTableRow: {
        styleOverrides: {
            root: {
                transition: 'background-color 0.15s ease',
                '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.04)',
                },
            },
        },
    },
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
                borderRadius: 10,
                transition: 'all 0.2s ease',
                '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: theme.palette.primary.main,
                },
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderWidth: 2,
                },
            }),
            notchedOutline: ({ theme }) => ({
                borderColor: theme.palette.divider,
            }),
        },
    },
    MuiSelect: {
        styleOverrides: {
            root: {
                borderRadius: 10,
            },
        },
    },
    MuiTooltip: {
        defaultProps: {
            arrow: true,
        },
        styleOverrides: {
            tooltip: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? '#334155'
                    : '#1e293b',
                fontSize: '0.75rem',
                fontWeight: 500,
                borderRadius: 8,
                padding: '6px 12px',
            }),
            arrow: ({ theme }) => ({
                color: theme.palette.mode === 'dark' ? '#334155' : '#1e293b',
            }),
        },
    },
    MuiLinearProgress: {
        styleOverrides: {
            root: {
                borderRadius: 6,
                height: 8,
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
            },
            bar: {
                borderRadius: 6,
                background: 'linear-gradient(90deg, #6366f1, #818cf8)',
            },
        },
    },
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
            root: {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.875rem',
                minHeight: 48,
            },
        },
    },
    MuiAvatar: {
        styleOverrides: {
            root: {
                fontWeight: 600,
            },
            colorDefault: ({ theme }) => ({
                background: theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: '#ffffff',
            }),
        },
    },
    MuiListItemButton: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderRadius: 10,
                margin: '2px 8px',
                padding: '8px 16px',
                transition: 'all 0.15s ease',
                '&.Mui-selected': {
                    backgroundColor: theme.palette.mode === 'dark'
                        ? 'rgba(129, 140, 248, 0.15)'
                        : 'rgba(99, 102, 241, 0.08)',
                    color: theme.palette.primary.main,
                    '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.main,
                    },
                    '&:hover': {
                        backgroundColor: theme.palette.mode === 'dark'
                            ? 'rgba(129, 140, 248, 0.2)'
                            : 'rgba(99, 102, 241, 0.12)',
                    },
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
    MuiAlert: {
        styleOverrides: {
            root: {
                borderRadius: 12,
                fontWeight: 500,
            },
            standardError: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(248, 113, 113, 0.1)'
                    : 'rgba(239, 68, 68, 0.05)',
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(248, 113, 113, 0.2)'
                    : 'rgba(239, 68, 68, 0.15)'}`,
            }),
            standardSuccess: ({ theme }) => ({
                backgroundColor: theme.palette.mode === 'dark'
                    ? 'rgba(52, 211, 153, 0.1)'
                    : 'rgba(16, 185, 129, 0.05)',
                border: `1px solid ${theme.palette.mode === 'dark'
                    ? 'rgba(52, 211, 153, 0.2)'
                    : 'rgba(16, 185, 129, 0.15)'}`,
            }),
        },
    },
    MuiSkeleton: {
        styleOverrides: {
            root: {
                borderRadius: 10,
            },
            rectangular: {
                borderRadius: 12,
            },
        },
    },
    MuiPagination: {
        styleOverrides: {
            root: {
                '& .MuiPaginationItem-root': {
                    borderRadius: 8,
                    fontWeight: 600,
                },
            },
        },
    },
    MuiBreadcrumbs: {
        styleOverrides: {
            root: {
                fontSize: '0.8125rem',
            },
        },
    },
    MuiDivider: {
        styleOverrides: {
            root: ({ theme }) => ({
                borderColor: theme.palette.divider,
            }),
        },
    },
};
