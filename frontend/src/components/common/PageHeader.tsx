// ---------------------------------------------------------------------------
// PageHeader — page title + action buttons
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    actions?: ReactNode;
    children?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions, children }: PageHeaderProps) {
    return (
        <Fade in timeout={300}>
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    mb: 4,
                    flexWrap: 'wrap',
                    gap: 2,
                }}
            >
                <Box>
                    <Typography
                        variant="h4"
                        component="h1"
                        sx={{
                            fontWeight: 800,
                            letterSpacing: '-0.025em',
                            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 50%, #a78bfa 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        {title}
                    </Typography>
                    {subtitle && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.6 }}>
                            {subtitle}
                        </Typography>
                    )}
                    {children}
                </Box>
                {actions && (
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>{actions}</Box>
                )}
            </Box>
        </Fade>
    );
}
