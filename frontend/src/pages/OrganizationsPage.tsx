// ---------------------------------------------------------------------------
// OrganizationsPage — manage organizations with create, edit, delete, switch
// ---------------------------------------------------------------------------

import { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import FolderIcon from '@mui/icons-material/Folder';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { useOrganizations } from '@/hooks/useOrganizations';
import { useAuth } from '@/hooks/useAuth';
import type { Organization, OrganizationCreate } from '@/types/organization';

interface SnackState {
    message: string;
    severity: 'success' | 'error';
}

export default function OrganizationsPage() {
    const { user } = useAuth();
    const { list, create, update, remove, switchOrg } = useOrganizations();
    const data = list.data;

    const [modalOpen, setModalOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Organization | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);
    const [formName, setFormName] = useState('');
    const [formSlug, setFormSlug] = useState('');
    const [snack, setSnack] = useState<SnackState | null>(null);

    const isAdmin = user?.role === 'admin';

    const openCreate = () => {
        setFormName('');
        setFormSlug('');
        setEditTarget(null);
        setModalOpen(true);
    };

    const openEdit = (org: Organization) => {
        setFormName(org.name);
        setFormSlug(org.slug);
        setEditTarget(org);
        setModalOpen(true);
    };

    const handleSubmit = () => {
        if (editTarget) {
            update.mutate(
                { id: editTarget.id, data: { name: formName } },
                {
                    onSuccess: () => {
                        setModalOpen(false);
                        setSnack({ message: 'Organization updated.', severity: 'success' });
                    },
                    onError: () => setSnack({ message: 'Failed to update.', severity: 'error' }),
                },
            );
        } else {
            const payload: OrganizationCreate = { name: formName, slug: formSlug };
            create.mutate(payload, {
                onSuccess: () => {
                    setModalOpen(false);
                    setSnack({ message: 'Organization created.', severity: 'success' });
                },
                onError: (err: any) => {
                    const detail = err?.response?.data?.detail ?? 'Failed to create.';
                    setSnack({ message: detail, severity: 'error' });
                },
            });
        }
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        remove.mutate(deleteTarget.id, {
            onSuccess: () => {
                setDeleteTarget(null);
                setSnack({ message: 'Organization deleted.', severity: 'success' });
            },
            onError: (err: any) => {
                setDeleteTarget(null);
                const detail = err?.response?.data?.detail ?? 'Failed to delete.';
                setSnack({ message: detail, severity: 'error' });
            },
        });
    };

    const handleSwitch = (org: Organization) => {
        switchOrg.mutate(org.id, {
            onSuccess: () => {
                setSnack({ message: `Switched to ${org.name}.`, severity: 'success' });
                // Refresh user data
                window.location.reload();
            },
            onError: (err: any) => {
                const detail = err?.response?.data?.detail ?? 'Failed to switch.';
                setSnack({ message: detail, severity: 'error' });
            },
        });
    };

    const autoSlug = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');
    };

    return (
        <Box>
            <PageHeader
                title="Organizations"
                subtitle="Manage organizations and switch between workspaces"
                actions={
                    isAdmin ? (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={openCreate}
                            sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                        >
                            New Organization
                        </Button>
                    ) : undefined
                }
            />

            {/* Loading */}
            {list.isLoading && (
                <Grid container spacing={3}>
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                            <Skeleton variant="rounded" height={200} sx={{ borderRadius: 4 }} />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Empty */}
            {!list.isLoading && data?.items.length === 0 && (
                <EmptyState
                    icon={<BusinessIcon />}
                    title="No organizations"
                    description="Create an organization to get started."
                    actionLabel={isAdmin ? 'Create Organization' : undefined}
                    onAction={isAdmin ? openCreate : undefined}
                />
            )}

            {/* Grid */}
            {!list.isLoading && data && data.items.length > 0 && (
                <Grid container spacing={3}>
                    {data.items.map((org) => {
                        const isCurrent = org.id === user?.organization_id;
                        return (
                            <Grid key={org.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card
                                    sx={{
                                        borderRadius: 4,
                                        border: isCurrent ? '2px solid' : '1px solid',
                                        borderColor: isCurrent ? 'primary.main' : 'divider',
                                        position: 'relative',
                                        transition: 'all 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateY(-2px)',
                                            boxShadow: 6,
                                        },
                                    }}
                                >
                                    {isCurrent && (
                                        <Chip
                                            label="Current"
                                            color="primary"
                                            size="small"
                                            sx={{
                                                position: 'absolute',
                                                top: 12,
                                                right: 12,
                                                fontWeight: 700,
                                                fontSize: '0.7rem',
                                            }}
                                        />
                                    )}
                                    <CardContent sx={{ pb: 1 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '12px',
                                                    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                }}
                                            >
                                                <BusinessIcon sx={{ color: '#fff', fontSize: 20 }} />
                                            </Box>
                                            <Box sx={{ minWidth: 0, flex: 1 }}>
                                                <Typography
                                                    variant="subtitle1"
                                                    sx={{ fontWeight: 700, lineHeight: 1.3 }}
                                                    noWrap
                                                >
                                                    {org.name}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                    sx={{ fontFamily: 'monospace' }}
                                                >
                                                    {org.slug}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <Box sx={{ display: 'flex', gap: 3, mt: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    {org.member_count} member{org.member_count !== 1 ? 's' : ''}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <FolderIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                <Typography variant="body2" color="text.secondary">
                                                    {org.project_count} project{org.project_count !== 1 ? 's' : ''}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {!org.is_active && (
                                            <Chip
                                                label="Inactive"
                                                color="warning"
                                                size="small"
                                                sx={{ mt: 1.5 }}
                                            />
                                        )}
                                    </CardContent>

                                    <CardActions sx={{ px: 2, pb: 2, justifyContent: 'flex-end' }}>
                                        {isAdmin && !isCurrent && (
                                            <Tooltip title="Switch to this organization">
                                                <Button
                                                    size="small"
                                                    startIcon={<SwapHorizIcon />}
                                                    onClick={() => handleSwitch(org)}
                                                    disabled={switchOrg.isPending}
                                                    sx={{ textTransform: 'none' }}
                                                >
                                                    Switch
                                                </Button>
                                            </Tooltip>
                                        )}
                                        {isAdmin && (
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => openEdit(org)}>
                                                    <EditIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        {isAdmin && !isCurrent && (
                                            <Tooltip title="Delete">
                                                <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => setDeleteTarget(org)}
                                                >
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                    </CardActions>
                                </Card>
                            </Grid>
                        );
                    })}
                </Grid>
            )}

            {/* Create / Edit dialog */}
            <Dialog
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>
                    {editTarget ? 'Edit Organization' : 'Create Organization'}
                </DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                    <TextField
                        label="Name"
                        value={formName}
                        onChange={(e) => {
                            setFormName(e.target.value);
                            if (!editTarget) setFormSlug(autoSlug(e.target.value));
                        }}
                        fullWidth
                        required
                    />
                    {!editTarget && (
                        <TextField
                            label="Slug"
                            value={formSlug}
                            onChange={(e) => setFormSlug(e.target.value)}
                            fullWidth
                            required
                            helperText="URL-friendly identifier (lowercase, hyphens only)"
                            slotProps={{
                                input: { sx: { fontFamily: 'monospace' } },
                            }}
                        />
                    )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setModalOpen(false)} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={!formName.trim() || (!editTarget && !formSlug.trim()) || create.isPending || update.isPending}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        {editTarget ? 'Save' : 'Create'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete confirmation */}
            <Dialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                PaperProps={{ sx: { borderRadius: 3 } }}
            >
                <DialogTitle sx={{ fontWeight: 700 }}>Delete Organization</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
                        This will remove all users, projects, and experiments in this organization.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={() => setDeleteTarget(null)} sx={{ textTransform: 'none' }}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={handleDelete}
                        disabled={remove.isPending}
                        sx={{ textTransform: 'none', fontWeight: 600 }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar */}
            <Snackbar
                open={!!snack}
                autoHideDuration={4000}
                onClose={() => setSnack(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack?.severity} onClose={() => setSnack(null)} variant="filled" sx={{ width: '100%' }}>
                    {snack?.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
