// ---------------------------------------------------------------------------
// CreateProjectModal — dialog for creating a new project
// ---------------------------------------------------------------------------

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import LoadingButton from '@mui/lab/LoadingButton';
import ScopeEditor from './ScopeEditor';
import type { ProjectCreate } from '@/types/project';

interface CreateProjectModalProps {
    open: boolean;
    loading?: boolean;
    onSubmit: (data: ProjectCreate) => void;
    onClose: () => void;
}

interface FormValues {
    name: string;
    description: string;
    business_scope: string;
    allowed_intents: string[];
    restricted_intents: string[];
}

export default function CreateProjectModal({
    open,
    loading,
    onSubmit,
    onClose,
}: CreateProjectModalProps) {
    const {
        control,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            name: '',
            description: '',
            business_scope: '',
            allowed_intents: [],
            restricted_intents: [],
        },
    });

    const allowedIntents = watch('allowed_intents');
    const restrictedIntents = watch('restricted_intents');

    useEffect(() => {
        if (open) {
            reset({
                name: '',
                description: '',
                business_scope: '',
                allowed_intents: [],
                restricted_intents: [],
            });
        }
    }, [open, reset]);

    const onFormSubmit = (values: FormValues) => {
        const data: ProjectCreate = {
            name: values.name,
            business_scope: values.business_scope,
            ...(values.description ? { description: values.description } : {}),
            ...(values.allowed_intents.length
                ? { allowed_intents: values.allowed_intents }
                : {}),
            ...(values.restricted_intents.length
                ? { restricted_intents: values.restricted_intents }
                : {}),
        };
        onSubmit(data);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>Create New Project</DialogTitle>
            <form onSubmit={handleSubmit(onFormSubmit)}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Name */}
                    <Controller
                        name="name"
                        control={control}
                        rules={{ required: 'Project name is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Project Name"
                                placeholder='e.g. "Customer Support Bot"'
                                error={!!errors.name}
                                helperText={errors.name?.message}
                                fullWidth
                            />
                        )}
                    />

                    {/* Description */}
                    <Controller
                        name="description"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Description"
                                placeholder="Brief overview (max 255 chars)"
                                multiline
                                rows={2}
                                inputProps={{ maxLength: 255 }}
                                fullWidth
                            />
                        )}
                    />

                    {/* Business Scope */}
                    <Controller
                        name="business_scope"
                        control={control}
                        rules={{ required: 'Business scope is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Business Scope"
                                placeholder="Describe what this AI does, who uses it, and its operating context..."
                                multiline
                                rows={4}
                                error={!!errors.business_scope}
                                helperText={errors.business_scope?.message}
                                fullWidth
                            />
                        )}
                    />

                    {/* Allowed Intents */}
                    <ScopeEditor
                        label="Allowed Intents"
                        items={allowedIntents}
                        onChange={(v) => setValue('allowed_intents', v)}
                    />

                    {/* Restricted Intents */}
                    <ScopeEditor
                        label="Restricted Intents"
                        items={restrictedIntents}
                        onChange={(v) => setValue('restricted_intents', v)}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <LoadingButton type="submit" variant="contained" loading={loading}>
                        Create Project
                    </LoadingButton>
                </DialogActions>
            </form>
        </Dialog>
    );
}
