// ---------------------------------------------------------------------------
// App root — theme + query client + router + Google OAuth
// ---------------------------------------------------------------------------

import { useMemo } from 'react';
import { RouterProvider } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { buildTheme } from '@/theme';
import { useUiStore } from '@/store/uiStore';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { router } from '@/routes';

const GOOGLE_CLIENT_ID = '524704483090-hm6hjicmrhh5flr9c28kr1tdelba7tbf.apps.googleusercontent.com';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 30_000,
        },
    },
});

export default function App() {
    const themeMode = useUiStore((s) => s.themeMode);
    const theme = useMemo(() => buildTheme(themeMode), [themeMode]);

    return (
        <ErrorBoundary>
            <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
                <QueryClientProvider client={queryClient}>
                    <ThemeProvider theme={theme}>
                        <CssBaseline />
                        <RouterProvider router={router} />
                    </ThemeProvider>
                </QueryClientProvider>
            </GoogleOAuthProvider>
        </ErrorBoundary>
    );
}
