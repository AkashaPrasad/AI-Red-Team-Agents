// ---------------------------------------------------------------------------
// AuthLayout — polished centered card with animated gradient
// ---------------------------------------------------------------------------

import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';
import Fade from '@mui/material/Fade';
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
                p: 3,
                background: (t) =>
                    t.palette.mode === 'dark'
                        ? 'radial-gradient(ellipse at 30% 10%, rgba(99,102,241,0.14) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.10) 0%, transparent 50%), #0c1222'
                        : 'radial-gradient(ellipse at 30% 10%, rgba(99,102,241,0.07) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(139,92,246,0.05) 0%, transparent 50%), #f8fafc',
            }}
        >
            <Fade in timeout={500}>
                <Paper
                    sx={{
                        p: { xs: 3, sm: 5 },
                        maxWidth: 460,
                        width: '100%',
                        border: '1px solid',
                        borderColor: 'divider',
                        position: 'relative',
                        overflow: 'hidden',
                        backdropFilter: 'blur(12px)',
                    }}
                >
                    {/* Accent bar */}
                    <Box
                        sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            background: 'linear-gradient(90deg, #6366f1 0%, #818cf8 40%, #a78bfa 100%)',
                        }}
                    />

                    {/* Brand */}
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 4, mt: 1 }}>
                        <Box
                            sx={{
                                width: 52,
                                height: 52,
                                borderRadius: '15px',
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 2,
                                boxShadow: '0 8px 28px rgba(99,102,241,0.30)',
                            }}
                        >
                            <ShieldIcon sx={{ color: '#fff', fontSize: 28 }} />
                        </Box>
                        <Typography
                            variant="h5"
                            sx={{
                                fontWeight: 800,
                                letterSpacing: '-0.02em',
                                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            AI Red Team Agent
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Secure your AI systems with confidence
                        </Typography>
                    </Box>

                    <Outlet />
                </Paper>
            </Fade>
        </Box>
    );
}
