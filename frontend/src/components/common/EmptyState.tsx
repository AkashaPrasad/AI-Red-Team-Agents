// ---------------------------------------------------------------------------
// EmptyState — placeholder with icon + CTA
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export default function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
}: EmptyStateProps) {
    return (
        <Fade in timeout={450}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    py: 10,
                    px: 3,
                    textAlign: 'center',
                }}
            >
                {icon && (
                    <Box
                        sx={{
                            mb: 3,
                            width: 76,
                            height: 76,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: (t) =>
                                t.palette.mode === 'dark'
                                    ? 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.12))'
                                    : 'linear-gradient(135deg, rgba(99,102,241,0.07), rgba(139,92,246,0.07))',
                            color: 'primary.main',
                            '& > svg': { fontSize: 34 },
                        }}
                    >
                        {icon}
                    </Box>
                )}
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                    {title}
                </Typography>
                {description && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 3, maxWidth: 400, lineHeight: 1.6 }}
                    >
                        {description}
                    </Typography>
                )}
                {actionLabel && onAction && (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={onAction} sx={{ px: 3 }}>
                        {actionLabel}
                    </Button>
                )}
            </Box>
        </Fade>
    );
}
