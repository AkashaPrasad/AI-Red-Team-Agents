// ---------------------------------------------------------------------------
// MinimalLayout — no chrome, used for standalone / embed views
// ---------------------------------------------------------------------------

import { Outlet } from 'react-router-dom';
import Box from '@mui/material/Box';

export default function MinimalLayout() {
    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
            <Outlet />
        </Box>
    );
}
