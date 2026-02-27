// ---------------------------------------------------------------------------
// Organization types
// ---------------------------------------------------------------------------

export interface Organization {
    id: string;
    name: string;
    slug: string;
    is_active: boolean;
    member_count: number;
    project_count: number;
    created_at: string;
    updated_at: string;
}

export interface OrganizationList {
    items: Organization[];
    total: number;
}

export interface OrganizationCreate {
    name: string;
    slug: string;
}

export interface OrganizationUpdate {
    name?: string;
    is_active?: boolean;
}
