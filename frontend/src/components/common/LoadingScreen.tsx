// ---------------------------------------------------------------------------
// LoadingScreen — full-page loading with branded spinner
// ---------------------------------------------------------------------------

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Fade from '@mui/material/Fade';
import Typography from '@mui/material/Typography';
import ShieldIcon from '@mui/icons-material/Shield';

export default function LoadingScreen() {
    return (
        <Fade in timeout={400}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: '60vh',
                    gap: 3,
                }}
            >
                <Box
                    sx={{
                        position: 'relative',
                        display: 'inline-flex',
                        animation: 'float 2.5s ease-in-out infinite',
                        '@keyframes float': {
                            '0%, 100%': { transform: 'translateY(0)' },
                            '50%': { transform: 'translateY(-6px)' },
                        },
                    }}
                >
                    <CircularProgress
                        size={58}
                        thickness={2.8}
                        sx={{
                            color: 'primary.main',
                            '& .MuiCircularProgress-circle': {
                                strokeLinecap: 'round',
                            },
                        }}
                    />
                    <Box
                        sx={{
                            top: 0,
                            left: 0,
                            bottom: 0,
                            right: 0,
                            position: 'absolute',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ShieldIcon
                            sx={{
                                fontSize: 22,
                                background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        />
                    </Box>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: '0.01em' }}>
                    Loading…
                </Typography>
            </Box>
        </Fade>
    );
}
