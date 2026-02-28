// ---------------------------------------------------------------------------
// ProjectSettings — settings tab inside Project Detail
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import LoadingButton from '@mui/lab/LoadingButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import type { Project, ProjectUpdate } from '@/types/project';

interface ProjectSettingsProps {
    project: Project;
    updating?: boolean;
    regenerating?: boolean;
    deleting?: boolean;
    onSave: (data: ProjectUpdate) => void;
    onRegenerateKey: () => void;
    onDelete: () => void;
}

interface FormValues {
    name: string;
    description: string;
}

export default function ProjectSettings({
    project,
    updating,
    regenerating,
    deleting,
    onSave,
    onRegenerateKey,
    onDelete,
}: ProjectSettingsProps) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [newApiKey, _setNewApiKey] = useState<string | null>(null);

    const {
        control,
        handleSubmit,
        formState: { errors, isDirty },
    } = useForm<FormValues>({
        defaultValues: {
            name: project.name,
            description: project.description ?? '',
        },
    });

    const onFormSubmit = (values: FormValues) => {
        onSave({
            name: values.name,
            ...(values.description ? { description: values.description } : {}),
        });
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* General Settings */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    General
                </Typography>
                <form onSubmit={handleSubmit(onFormSubmit)}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <Controller
                            name="name"
                            control={control}
                            rules={{ required: 'Name is required' }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Project Name"
                                    error={!!errors.name}
                                    helperText={errors.name?.message}
                                    fullWidth
                                />
                            )}
                        />
                        <Controller
                            name="description"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Description"
                                    multiline
                                    rows={2}
                                    inputProps={{ maxLength: 255 }}
                                    fullWidth
                                />
                            )}
                        />
                        <Box>
                            <LoadingButton
                                type="submit"
                                variant="contained"
                                loading={updating}
                                disabled={!isDirty}
                            >
                                Save Changes
                            </LoadingButton>
                        </Box>
                    </Box>
                </form>
            </Paper>

            {/* API Key */}
            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                    API Key
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Key prefix: <strong>{project.api_key_prefix ?? 'Not generated'}</strong>
                </Typography>

                {newApiKey && (
                    <Alert
                        severity="success"
                        sx={{ mb: 2 }}
                        action={
                            <Button
                                size="small"
                                startIcon={<ContentCopyIcon />}
                                onClick={() => navigator.clipboard.writeText(newApiKey)}
                            >
                                Copy
                            </Button>
                        }
                    >
                        New API key: <code>{newApiKey}</code> — save it now, it won't be shown
                        again.
                    </Alert>
                )}

                <LoadingButton
                    variant="outlined"
                    loading={regenerating}
                    onClick={() => {
                        onRegenerateKey();
                    }}
                >
                    Regenerate API Key
                </LoadingButton>
            </Paper>

            {/* Danger Zone */}
            <Paper sx={{ p: 3, borderColor: 'error.main', borderWidth: 1, borderStyle: 'solid' }}>
                <Typography variant="h6" color="error" gutterBottom>
                    Danger Zone
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Deleting this project will permanently remove all experiments, results,
                    and firewall configurations.
                </Typography>
                <Button
                    variant="outlined"
                    color="error"
                    onClick={() => setDeleteOpen(true)}
                >
                    Delete Project
                </Button>
            </Paper>

            <ConfirmDialog
                open={deleteOpen}
                title="Delete Project?"
                message={`Are you sure you want to delete "${project.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                confirmColor="error"
                loading={deleting}
                onConfirm={onDelete}
                onCancel={() => setDeleteOpen(false)}
            />
        </Box>
    );
}
