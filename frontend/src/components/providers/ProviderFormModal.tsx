// ---------------------------------------------------------------------------
// ProviderFormModal — create / edit provider dialog
// ---------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import LoadingButton from '@mui/lab/LoadingButton';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import type { Provider, ProviderCreate, ProviderType } from '@/types/provider';

interface ProviderFormModalProps {
    open: boolean;
    provider?: Provider | null;
    loading?: boolean;
    onSubmit: (data: ProviderCreate) => void;
    onClose: () => void;
}

interface FormValues {
    provider_type: ProviderType;
    name: string;
    api_key: string;
    endpoint_url: string;
    model: string;
}

export default function ProviderFormModal({
    open,
    provider,
    loading,
    onSubmit,
    onClose,
}: ProviderFormModalProps) {
    const isEdit = Boolean(provider);
    const [showKey, setShowKey] = useState(false);

    const {
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<FormValues>({
        defaultValues: {
            provider_type: 'openai',
            name: '',
            api_key: '',
            endpoint_url: '',
            model: '',
        },
    });

    const providerType = watch('provider_type');

    useEffect(() => {
        if (open) {
            if (provider) {
                reset({
                    provider_type: provider.provider_type,
                    name: provider.name,
                    api_key: '',
                    endpoint_url: provider.endpoint_url ?? '',
                    model: provider.model ?? '',
                });
            } else {
                reset({
                    provider_type: 'openai',
                    name: '',
                    api_key: '',
                    endpoint_url: '',
                    model: '',
                });
            }
            setShowKey(false);
        }
    }, [open, provider, reset]);

    const onFormSubmit = (values: FormValues) => {
        const data: ProviderCreate = {
            provider_type: values.provider_type,
            name: values.name,
            api_key: values.api_key,
            ...(values.endpoint_url ? { endpoint_url: values.endpoint_url } : {}),
            ...(values.model ? { model: values.model } : {}),
        };
        onSubmit(data);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{isEdit ? 'Edit Provider' : 'Add Model Provider'}</DialogTitle>
            <form onSubmit={handleSubmit(onFormSubmit)}>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                    {/* Provider Type */}
                    <div>
                        <FormLabel>Provider Type</FormLabel>
                        <Controller
                            name="provider_type"
                            control={control}
                            render={({ field }) => (
                                <RadioGroup row {...field}>
                                    <FormControlLabel
                                        value="openai"
                                        control={<Radio />}
                                        label="OpenAI"
                                    />
                                    <FormControlLabel
                                        value="azure_openai"
                                        control={<Radio />}
                                        label="Azure OpenAI"
                                    />
                                    <FormControlLabel
                                        value="groq"
                                        control={<Radio />}
                                        label="Groq"
                                    />
                                </RadioGroup>
                            )}
                        />
                    </div>

                    {/* Name */}
                    <Controller
                        name="name"
                        control={control}
                        rules={{ required: 'Name is required' }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Name"
                                placeholder='e.g. "Production OpenAI"'
                                error={!!errors.name}
                                helperText={errors.name?.message}
                                fullWidth
                            />
                        )}
                    />

                    {/* API Key */}
                    <Controller
                        name="api_key"
                        control={control}
                        rules={{
                            required: isEdit ? false : 'API key is required',
                        }}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="API Key"
                                placeholder={isEdit ? '(unchanged)' : 'sk-...'}
                                type={showKey ? 'text' : 'password'}
                                error={!!errors.api_key}
                                helperText={errors.api_key?.message}
                                fullWidth
                                slotProps={{
                                    input: {
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowKey((p) => !p)}
                                                    edge="end"
                                                    size="small"
                                                >
                                                    {showKey ? (
                                                        <VisibilityOffIcon />
                                                    ) : (
                                                        <VisibilityIcon />
                                                    )}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    },
                                }}
                            />
                        )}
                    />

                    {/* Endpoint URL — Azure / Groq custom */}
                    {(providerType === 'azure_openai' || providerType === 'groq') && (
                        <Controller
                            name="endpoint_url"
                            control={control}
                            rules={{
                                required:
                                    providerType === 'azure_openai'
                                        ? 'Endpoint URL is required for Azure'
                                        : false,
                            }}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label="Endpoint URL"
                                    placeholder={
                                        providerType === 'groq'
                                            ? 'https://api.groq.com/openai/v1 (optional)'
                                            : 'https://myai.openai.azure.com/...'
                                    }
                                    error={!!errors.endpoint_url}
                                    helperText={errors.endpoint_url?.message}
                                    fullWidth
                                />
                            )}
                        />
                    )}

                    {/* Model Override */}
                    <Controller
                        name="model"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Model Override (optional)"
                                placeholder={
                                    providerType === 'groq'
                                        ? 'e.g. "llama-3.3-70b-versatile"'
                                        : 'e.g. "gpt-4o"'
                                }
                                fullWidth
                            />
                        )}
                    />
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={onClose}>Cancel</Button>
                    <LoadingButton type="submit" variant="contained" loading={loading}>
                        Save Provider
                    </LoadingButton>
                </DialogActions>
            </form>
        </Dialog>
    );
}
