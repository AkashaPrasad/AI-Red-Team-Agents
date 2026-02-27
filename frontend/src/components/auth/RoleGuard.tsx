// ---------------------------------------------------------------------------
// RoleGuard — role-based component visibility
// ---------------------------------------------------------------------------

import type { ReactNode } from 'react';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types/auth';

interface RoleGuardProps {
    /** Minimum role required: admin > member > viewer */
    allowedRoles: UserRole[];
    children: ReactNode;
    fallback?: ReactNode;
}

export default function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
    const role = useAuthStore((s) => s.user?.role);

    if (!role || !allowedRoles.includes(role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
