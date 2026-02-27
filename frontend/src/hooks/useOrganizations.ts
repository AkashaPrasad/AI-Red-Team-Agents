// ---------------------------------------------------------------------------
// useOrganizations — organization CRUD queries / mutations
// ---------------------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { organizationService } from '@/services/organizationService';
import type { OrganizationCreate, OrganizationUpdate } from '@/types/organization';

const KEYS = {
    all: ['organizations'] as const,
    list: () => ['organizations', 'list'] as const,
    detail: (id: string) => ['organizations', id] as const,
};

export function useOrganizations() {
    const queryClient = useQueryClient();

    const list = useQuery({
        queryKey: KEYS.list(),
        queryFn: () => organizationService.getOrganizations(),
    });

    const create = useMutation({
        mutationFn: (data: OrganizationCreate) => organizationService.createOrganization(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.all }),
    });

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: OrganizationUpdate }) =>
            organizationService.updateOrganization(id, data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.all }),
    });

    const remove = useMutation({
        mutationFn: (id: string) => organizationService.deleteOrganization(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.all }),
    });

    const switchOrg = useMutation({
        mutationFn: (orgId: string) => organizationService.switchOrganization(orgId),
        onSuccess: () => {
            // Invalidate everything since user's org changed
            queryClient.invalidateQueries();
        },
    });

    return { list, create, update, remove, switchOrg };
}
