// ---------------------------------------------------------------------------
// DashboardPage — project list with search, filters, pagination
// ---------------------------------------------------------------------------

import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import FolderOffIcon from '@mui/icons-material/FolderOff';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ProjectCard from '@/components/projects/ProjectCard';
import CreateProjectModal from '@/components/projects/CreateProjectModal';
import { useProjects } from '@/hooks/useProjects';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import type { ProjectCreate } from '@/types/project';

export default function DashboardPage() {
    const [search, setSearch] = useState('');
    const [isActive, setIsActive] = useState<string>('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [page, setPage] = useState(1);
    const [modalOpen, setModalOpen] = useState(false);

    const params = {
        page,
        page_size: DEFAULT_PAGE_SIZE,
        ...(search ? { search } : {}),
        ...(isActive ? { is_active: isActive === 'active' } : {}),
        sort_by: sortBy,
        sort_order: sortOrder,
    };

    const { list, create } = useProjects(params);
    const data = list.data;

    const handleCreate = (formData: ProjectCreate) => {
        create.mutate(formData, {
            onSuccess: () => setModalOpen(false),
        });
    };

    return (
        <Box>
            <PageHeader
                title="Projects"
                subtitle="Manage your AI red teaming projects and experiments"
                actions={
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setModalOpen(true)}
                        sx={{ px: 3 }}
                    >
                        Create Project
                    </Button>
                }
            />

            {/* Filters */}
            <Paper
                variant="outlined"
                sx={{
                    display: 'flex',
                    gap: 2,
                    mb: 3,
                    flexWrap: 'wrap',
                    p: 2.5,
                    alignItems: 'center',
                    borderRadius: 4,
                    transition: 'border-color 0.2s ease',
                    '&:hover': { borderColor: 'primary.main' },
                }}
            >
                <TextField
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                    }}
                    placeholder="Search projects..."
                    size="small"
                    sx={{ minWidth: 240, flex: 1 }}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" color="action" />
                                </InputAdornment>
                            ),
                        },
                    }}
                />
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={isActive}
                        label="Status"
                        onChange={(e) => {
                            setIsActive(e.target.value);
                            setPage(1);
                        }}
                    >
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Sort By</InputLabel>
                    <Select
                        value={sortBy}
                        label="Sort By"
                        onChange={(e) => setSortBy(e.target.value)}
                    >
                        <MenuItem value="created_at">Created</MenuItem>
                        <MenuItem value="updated_at">Updated</MenuItem>
                        <MenuItem value="name">Name</MenuItem>
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 100 }}>
                    <InputLabel>Order</InputLabel>
                    <Select
                        value={sortOrder}
                        label="Order"
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                    >
                        <MenuItem value="desc">Newest</MenuItem>
                        <MenuItem value="asc">Oldest</MenuItem>
                    </Select>
                </FormControl>
            </Paper>

            {/* Loading skeleton */}
            {list.isLoading && (
                <Grid container spacing={3}>
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Skeleton
                                variant="rounded"
                                height={220}
                                sx={{ borderRadius: 4.5 }}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Empty state */}
            {!list.isLoading && data?.items.length === 0 && (
                <EmptyState
                    icon={<FolderOffIcon />}
                    title="No projects found"
                    description="Create a new project to get started with red team experiments."
                    actionLabel="Create Project"
                    onAction={() => setModalOpen(true)}
                />
            )}

            {/* Project grid */}
            {!list.isLoading && data && data.items.length > 0 && (
                <>
                    <Grid container spacing={3}>
                        {data.items.map((project) => (
                            <Grid key={project.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <ProjectCard project={project} />
                            </Grid>
                        ))}
                    </Grid>

                    {data.pages > 1 && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
                            <Pagination
                                count={data.pages}
                                page={page}
                                onChange={(_, val) => setPage(val)}
                                color="primary"
                                shape="rounded"
                            />
                        </Box>
                    )}

                    <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: 'block', textAlign: 'center', mt: 1.5 }}
                    >
                        {data.total} project{data.total !== 1 ? 's' : ''} total
                    </Typography>
                </>
            )}

            <CreateProjectModal
                open={modalOpen}
                loading={create.isPending}
                onSubmit={handleCreate}
                onClose={() => setModalOpen(false)}
            />
        </Box>
    );
}
