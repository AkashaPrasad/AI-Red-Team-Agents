// ---------------------------------------------------------------------------
// Organization service — CRUD + switch
// ---------------------------------------------------------------------------

import api from './api';
import type {
    Organization,
    OrganizationCreate,
    OrganizationUpdate,
    OrganizationList,
} from '@/types/organization';

export const organizationService = {
    async getOrganizations(): Promise<OrganizationList> {
        const res = await api.get<OrganizationList>('/organizations');
        return res.data;
    },

    async getOrganization(id: string): Promise<Organization> {
        const res = await api.get<Organization>(`/organizations/${id}`);
        return res.data;
    },

    async createOrganization(data: OrganizationCreate): Promise<Organization> {
        const res = await api.post<Organization>('/organizations', data);
        return res.data;
    },

    async updateOrganization(id: string, data: OrganizationUpdate): Promise<Organization> {
        const res = await api.put<Organization>(`/organizations/${id}`, data);
        return res.data;
    },

    async deleteOrganization(id: string): Promise<void> {
        await api.delete(`/organizations/${id}`);
    },

    async switchOrganization(organizationId: string): Promise<Organization> {
        const res = await api.post<Organization>('/organizations/switch', {
            organization_id: organizationId,
        });
        return res.data;
    },
};
