// ---------------------------------------------------------------------------
// DashboardLayout — polished sidebar + glass topbar + smooth content area
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Fade from '@mui/material/Fade';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import ShieldIcon from '@mui/icons-material/Shield';
import ChatIcon from '@mui/icons-material/Chat';
import { useAuth } from '@/hooks/useAuth';
import { useUiStore } from '@/store/uiStore';
import { SIDEBAR_WIDTH } from '@/utils/constants';

const EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';

const NAV_ITEMS = [
    { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
    { label: 'Playground', path: '/playground', icon: <ChatIcon /> },
    { label: 'Providers', path: '/settings/providers', icon: <SettingsIcon /> },
];

export default function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout } = useAuth();
    const { sidebarOpen, toggleSidebar, themeMode, toggleTheme } = useUiStore();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

    // ── Sidebar content ──────────────────────────────────────────────────
    const drawer = (
        <Box
            sx={{
                width: SIDEBAR_WIDTH,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                background: (t) =>
                    t.palette.mode === 'dark'
                        ? 'linear-gradient(180deg, rgba(12,18,34,1) 0%, rgba(15,23,42,1) 100%)'
                        : undefined,
            }}
        >
            {/* Brand */}
            <Box sx={{ px: 2.5, py: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box
                    sx={{
                        width: 38,
                        height: 38,
                        borderRadius: '11px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #a78bfa 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        boxShadow: '0 4px 14px rgba(99,102,241,0.30)',
                    }}
                >
                    <ShieldIcon sx={{ color: '#fff', fontSize: 20 }} />
                </Box>
                <Box>
                    <Typography
                        variant="subtitle2"
                        sx={{
                            fontWeight: 800,
                            fontSize: '0.9375rem',
                            letterSpacing: '-0.02em',
                            lineHeight: 1.2,
                            background: 'linear-gradient(135deg, #6366f1, #a78bfa)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        ART Agent
                    </Typography>
                    <Typography
                        variant="caption"
                        sx={{ color: 'text.secondary', fontSize: '0.65rem', letterSpacing: '0.02em' }}
                    >
                        AI Red Team Platform
                    </Typography>
                </Box>
            </Box>

            <Divider sx={{ mx: 2, opacity: 0.6 }} />

            {/* Navigation */}
            <List sx={{ flex: 1, px: 1, py: 2 }}>
                {NAV_ITEMS.map((item) => {
                    const active =
                        location.pathname === item.path ||
                        (item.path !== '/' && location.pathname.startsWith(item.path));
                    return (
                        <ListItemButton
                            key={item.path}
                            selected={active}
                            onClick={() => navigate(item.path)}
                            sx={{ mb: 0.5 }}
                        >
                            <ListItemIcon sx={{ fontSize: 20, opacity: active ? 1 : 0.7 }}>
                                {item.icon}
                            </ListItemIcon>
                            <ListItemText
                                primary={item.label}
                                primaryTypographyProps={{
                                    fontSize: '0.875rem',
                                    fontWeight: active ? 600 : 500,
                                    letterSpacing: '-0.01em',
                                }}
                            />
                            {active && (
                                <Box
                                    sx={{
                                        width: 4,
                                        height: 20,
                                        borderRadius: 2,
                                        background: 'linear-gradient(180deg, #6366f1, #a78bfa)',
                                        ml: 1,
                                    }}
                                />
                            )}
                        </ListItemButton>
                    );
                })}
            </List>

            <Divider sx={{ mx: 2, opacity: 0.6 }} />

            {/* User section */}
            <Box sx={{ p: 2 }}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: 2.5,
                        bgcolor: (t) =>
                            t.palette.mode === 'dark'
                                ? 'rgba(129,140,248,0.06)'
                                : 'rgba(99,102,241,0.04)',
                        border: (t) =>
                            `1px solid ${t.palette.mode === 'dark'
                                ? 'rgba(129,140,248,0.10)'
                                : 'rgba(99,102,241,0.06)'}`,
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            bgcolor: (t) =>
                                t.palette.mode === 'dark'
                                    ? 'rgba(129,140,248,0.10)'
                                    : 'rgba(99,102,241,0.07)',
                        },
                    }}
                >
                    <Avatar
                        sx={{
                            width: 32,
                            height: 32,
                            fontSize: 13,
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        }}
                    >
                        {user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="body2"
                            sx={{
                                fontWeight: 600,
                                fontSize: '0.8125rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                        >
                            {user?.full_name ?? 'User'}
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{
                                color: 'text.secondary',
                                fontSize: '0.6875rem',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'block',
                            }}
                        >
                            {user?.email}
                        </Typography>
                    </Box>
                    <Tooltip title="Logout">
                        <IconButton
                            size="small"
                            onClick={logout}
                            sx={{
                                color: 'text.secondary',
                                '&:hover': { color: 'error.main' },
                            }}
                        >
                            <LogoutIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>
        </Box>
    );

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
            {/* Sidebar */}
            <Drawer
                variant="persistent"
                open={sidebarOpen}
                sx={{
                    width: sidebarOpen ? SIDEBAR_WIDTH : 0,
                    flexShrink: 0,
                    transition: `width 0.28s ${EASE}`,
                    '& .MuiDrawer-paper': {
                        width: SIDEBAR_WIDTH,
                        boxSizing: 'border-box',
                        transition: `transform 0.28s ${EASE}`,
                        borderRight: 'none',
                        boxShadow: (t) =>
                            t.palette.mode === 'dark'
                                ? '1px 0 0 rgba(255,255,255,0.04)'
                                : '1px 0 0 rgba(0,0,0,0.05)',
                    },
                }}
            >
                {drawer}
            </Drawer>

            {/* Main content area */}
            <Box
                sx={{
                    flexGrow: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    transition: `margin 0.28s ${EASE}`,
                    minWidth: 0,
                }}
            >
                {/* Top bar */}
                <AppBar position="sticky" color="default" elevation={0}>
                    <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
                        <IconButton
                            edge="start"
                            onClick={toggleSidebar}
                            sx={{
                                borderRadius: 2.5,
                                transition: 'all 0.2s ease',
                                '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.04)' },
                            }}
                        >
                            <MenuIcon />
                        </IconButton>

                        <Box sx={{ flexGrow: 1 }} />

                        <Tooltip title={`Switch to ${themeMode === 'light' ? 'dark' : 'light'} mode`}>
                            <IconButton
                                onClick={toggleTheme}
                                sx={{
                                    borderRadius: 2.5,
                                    transition: 'all 0.2s ease',
                                    '&:hover': { bgcolor: 'action.hover', transform: 'scale(1.04)' },
                                }}
                            >
                                {themeMode === 'light' ? <Brightness4Icon /> : <Brightness7Icon />}
                            </IconButton>
                        </Tooltip>

                        <Tooltip title={user?.email ?? ''}>
                            <IconButton
                                onClick={(e) => setAnchorEl(e.currentTarget)}
                                sx={{ p: 0.5, transition: 'transform 0.2s ease', '&:hover': { transform: 'scale(1.05)' } }}
                            >
                                <Avatar
                                    sx={{
                                        width: 34,
                                        height: 34,
                                        fontSize: 14,
                                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                        border: '2px solid transparent',
                                        transition: 'box-shadow 0.2s ease',
                                        '&:hover': {
                                            boxShadow: '0 0 0 3px rgba(99,102,241,0.20)',
                                        },
                                    }}
                                >
                                    {user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                                </Avatar>
                            </IconButton>
                        </Tooltip>

                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => setAnchorEl(null)}
                            TransitionComponent={Fade}
                            slotProps={{
                                paper: {
                                    sx: { minWidth: 220, mt: 1 },
                                },
                            }}
                        >
                            <Box sx={{ px: 2, py: 1.5 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {user?.full_name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {user?.email}
                                </Typography>
                            </Box>
                            <Divider sx={{ my: 0.5 }} />
                            <MenuItem
                                onClick={() => {
                                    setAnchorEl(null);
                                    logout();
                                }}
                                sx={{ gap: 1.5, color: 'error.main' }}
                            >
                                <LogoutIcon fontSize="small" />
                                Sign Out
                            </MenuItem>
                        </Menu>
                    </Toolbar>
                </AppBar>

                {/* Page content */}
                <Fade in timeout={350}>
                    <Box
                        component="main"
                        sx={{
                            flexGrow: 1,
                            p: { xs: 2, sm: 3, md: 4 },
                            maxWidth: 1400,
                            mx: 'auto',
                            width: '100%',
                        }}
                    >
                        <Outlet />
                    </Box>
                </Fade>
            </Box>
        </Box>
    );
}
