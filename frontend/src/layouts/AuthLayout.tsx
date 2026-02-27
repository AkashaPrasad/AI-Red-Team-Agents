// ---------------------------------------------------------------------------
// AuthLayout — modern centered card with gradient accent
// ---------------------------------------------------------------------------

import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import ShieldIcon from '@mui/icons-material/Shield';

export default function AuthLayout() {
    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'background.default',
                p: 3,
                // Subtle radial gradient accent
                background: (theme) =>
                    theme.palette.mode === 'dark'
                        ? 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.15) 0%, transparent 60%), #0f172a'
                        : 'radial-gradient(ellipse at 50% 0%, rgba(99,102,241,0.08) 0%, transparent 60%), #f8fafc',
            }}
        >
            <Paper
                sx={{
                    p: { xs: 3, sm: 5 },
                    maxWidth: 460,
                    width: '100%',
                    border: '1px solid',
                    borderColor: 'divider',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Top accent gradient bar */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                    }}
                />

                {/* Brand */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4, mt: 1 }}>
                    <Box
                        sx={{
                            width: 48,
                            height: 48,
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 2,
                            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                        }}
                    >
                        <ShieldIcon sx={{ color: '#fff', fontSize: 26 }} />
                    </Box>
                    <Typography
                        variant="h5"
                        sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}
                    >
                        AI Red Team Agent
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Secure your AI systems with confidence
                    </Typography>
                </Box>

                <Outlet />
            </Paper>
        </Box>
    );
}
