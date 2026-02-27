// ---------------------------------------------------------------------------
// LoadingScreen — full-page loading with branded spinner
// ---------------------------------------------------------------------------

import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import ShieldIcon from '@mui/icons-material/Shield';

export default function LoadingScreen() {
    return (
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
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                    size={56}
                    thickness={3}
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
                    <ShieldIcon sx={{ fontSize: 22, color: 'primary.main' }} />
                </Box>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                Loading…
            </Typography>
        </Box>
    );
}
