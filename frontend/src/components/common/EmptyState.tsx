// ---------------------------------------------------------------------------
// EmptyState — placeholder with icon + CTA
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
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
                        mb: 2.5,
                        width: 72,
                        height: 72,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: (theme) =>
                            `linear-gradient(135deg, ${theme.palette.primary.main}14, ${theme.palette.secondary.main}14)`,
                        color: 'primary.main',
                        '& > svg': { fontSize: 32 },
                    }}
                >
                    {icon}
                </Box>
            )}
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {title}
            </Typography>
            {description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 400 }}>
                    {description}
                </Typography>
            )}
            {actionLabel && onAction && (
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={onAction}
                    sx={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                        px: 3,
                    }}
                >
                    {actionLabel}
                </Button>
            )}
        </Box>
    );
}
