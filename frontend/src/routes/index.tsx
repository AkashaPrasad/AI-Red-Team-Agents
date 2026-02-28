// ---------------------------------------------------------------------------
// Route definitions — React Router v6
// ---------------------------------------------------------------------------

import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AuthGuard from '@/components/auth/AuthGuard';
import AuthLayout from '@/layouts/AuthLayout';
import DashboardLayout from '@/layouts/DashboardLayout';
import LoadingScreen from '@/components/common/LoadingScreen';

// ── Lazy-loaded pages ──
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/RegisterPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const ProvidersPage = lazy(() => import('@/pages/ProvidersPage'));
const ChatPlaygroundPage = lazy(() => import('@/pages/ChatPlaygroundPage'));
const ProjectDetailPage = lazy(() => import('@/pages/ProjectDetailPage'));
const CreateExperimentPage = lazy(() => import('@/pages/CreateExperimentPage'));
const ExperimentResultsPage = lazy(() => import('@/pages/ExperimentResultsPage'));

function Loadable({ children }: { children: React.ReactNode }) {
    return <Suspense fallback={<LoadingScreen />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
    // ── Public (auth) routes ──
    {
        element: <AuthLayout />,
        children: [
            {
                path: '/login',
                element: (
                    <Loadable>
                        <LoginPage />
                    </Loadable>
                ),
            },
            {
                path: '/register',
                element: (
                    <Loadable>
                        <RegisterPage />
                    </Loadable>
                ),
            },
        ],
    },

    // ── Protected (dashboard) routes ──
    {
        element: (
            <AuthGuard>
                <DashboardLayout />
            </AuthGuard>
        ),
        children: [
            {
                path: '/',
                element: (
                    <Loadable>
                        <DashboardPage />
                    </Loadable>
                ),
            },
            {
                path: '/settings/providers',
                element: (
                    <Loadable>
                        <ProvidersPage />
                    </Loadable>
                ),
            },
            {
                path: '/playground',
                element: (
                    <Loadable>
                        <ChatPlaygroundPage />
                    </Loadable>
                ),
            },
            {
                path: '/projects/:id',
                element: (
                    <Loadable>
                        <ProjectDetailPage />
                    </Loadable>
                ),
            },
            {
                path: '/projects/:id/experiments/new',
                element: (
                    <Loadable>
                        <CreateExperimentPage />
                    </Loadable>
                ),
            },
            {
                path: '/projects/:id/experiments/:eid',
                element: (
                    <Loadable>
                        <ExperimentResultsPage />
                    </Loadable>
                ),
            },
        ],
    },

    // ── Catch-all ──
    {
        path: '*',
        element: <Navigate to="/" replace />,
    },
]);
