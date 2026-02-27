// ---------------------------------------------------------------------------
// useProjects — project CRUD queries / mutations + scope analysis
// ---------------------------------------------------------------------------

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { projectService, type ProjectListParams } from '@/services/projectService';
import type { ProjectCreate, ProjectUpdate } from '@/types/project';

const KEYS = {
    all: ['projects'] as const,
    list: (params?: ProjectListParams) => ['projects', 'list', params] as const,
    detail: (id: string) => ['projects', id] as const,
};

export function useProjects(params?: ProjectListParams) {
    const queryClient = useQueryClient();

    const list = useQuery({
        queryKey: KEYS.list(params),
        queryFn: () => projectService.getProjects(params),
    });

    const create = useMutation({
        mutationFn: (data: ProjectCreate) => projectService.createProject(data),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.all }),
    });

    const update = useMutation({
        mutationFn: ({ id, data }: { id: string; data: ProjectUpdate }) =>
            projectService.updateProject(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: KEYS.all });
            queryClient.invalidateQueries({ queryKey: KEYS.detail(id) });
        },
    });

    const remove = useMutation({
        mutationFn: (id: string) => projectService.deleteProject(id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: KEYS.all }),
    });

    const analyzeScope = useMutation({
        mutationFn: (id: string) => projectService.analyzeScope(id),
    });

    const regenerateKey = useMutation({
        mutationFn: (id: string) => projectService.regenerateApiKey(id),
        onSuccess: (_, id) =>
            queryClient.invalidateQueries({ queryKey: KEYS.detail(id) }),
    });

    return { list, create, update, remove, analyzeScope, regenerateKey };
}

export function useProject(id: string) {
    return useQuery({
        queryKey: KEYS.detail(id),
        queryFn: () => projectService.getProject(id),
        enabled: !!id,
    });
}
