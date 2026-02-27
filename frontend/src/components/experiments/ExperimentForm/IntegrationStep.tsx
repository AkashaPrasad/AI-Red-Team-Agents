// ---------------------------------------------------------------------------
// IntegrationStep — Step 3: target endpoint, auth, headers, payload
// Supports "Direct Provider" (auto-fills proxy URL) and "External Endpoint"
// ---------------------------------------------------------------------------

import { Controller, useFormContext } from 'react-hook-form';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Collapse from '@mui/material/Collapse';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ApiIcon from '@mui/icons-material/Api';
import { useState, useEffect } from 'react';

type TargetMode = 'direct' | 'external';

export default function IntegrationStep() {
    const {
        control,
        watch,
        setValue,
        formState: { errors },
    } = useFormContext();

    const turnMode = watch('turn_mode');
    const authType = watch('auth_type');
    const providerId = watch('provider_id');
    const [showAuth, setShowAuth] = useState(false);
    const [targetMode, setTargetMode] = useState<TargetMode>('direct');

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const flatErrors = errors as Record<string, any>;

    // When switching to Direct mode, auto-fill target fields.
    // The special "direct://{provider_id}" URL is recognized by the experiment
    // runner so it calls LLMGateway in-process instead of making HTTP requests.
    useEffect(() => {
        if (targetMode === 'direct' && providerId) {
            setValue('endpoint_url', `direct://${providerId}`);
            setValue('method', 'POST');
            setValue('headers', '{"Content-Type": "application/json"}');
            setValue('payload_template', '{"messages": [{"role": "user", "content": "{{prompt}}"}]}');
            setValue('auth_type', 'none');
            setValue('auth_value', '');
        }
    }, [targetMode, providerId, setValue]);

    const handleModeChange = (_: React.MouseEvent, value: TargetMode | null) => {
        if (value) {
            setTargetMode(value);
            if (value === 'external') {
                // Clear auto-filled values when switching to external
                setValue('endpoint_url', '');
                setValue('auth_type', 'bearer');
                setValue('auth_value', '');
            }
        }
    };

    const isDirect = targetMode === 'direct';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            {/* ── Target Mode Toggle ── */}
            <Paper
                elevation={0}
                sx={{
                    p: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    alignItems: 'center',
                }}
            >
                <Typography variant="subtitle2" color="text.secondary">
                    How should the experiment reach the AI model?
                </Typography>
                <ToggleButtonGroup
                    value={targetMode}
                    exclusive
                    onChange={handleModeChange}
                    sx={{ width: '100%', maxWidth: 500 }}
                >
                    <ToggleButton
                        value="direct"
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                            py: 1.5,
                            textTransform: 'none',
                        }}
                    >
                        <SmartToyIcon />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            Direct Provider
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Test the LLM directly via your provider
                        </Typography>
                    </ToggleButton>
                    <ToggleButton
                        value="external"
                        sx={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 0.5,
                            py: 1.5,
                            textTransform: 'none',
                        }}
                    >
                        <ApiIcon />
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            External Endpoint
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Test your own AI application&apos;s API
                        </Typography>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Paper>

            {/* Direct mode info */}
            {isDirect && (
                <Alert severity="success" icon={<SmartToyIcon />} sx={{ borderRadius: 2 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Direct Provider mode is configured automatically.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                        Prompts will be sent directly to your selected LLM provider through the
                        platform&apos;s built-in proxy. All fields below are pre-filled — you can
                        proceed to the next step.
                    </Typography>
                </Alert>
            )}

            {/* External mode info */}
            {!isDirect && (
                <Alert severity="info" icon={<ApiIcon />} sx={{ borderRadius: 2 }}>
                    <Typography variant="body2">
                        Enter the HTTP endpoint of the AI application you want to red-team. The
                        payload template must include <code>{'{{prompt}}'}</code> where attack
                        prompts will be injected.
                    </Typography>
                </Alert>
            )}

            {/* ── Endpoint URL ── */}
            <Controller
                name="endpoint_url"
                control={control}
                rules={{ required: 'Endpoint URL is required' }}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Endpoint URL"
                        placeholder="https://api.myai.com/v1/chat"
                        error={!!flatErrors.endpoint_url}
                        helperText={flatErrors.endpoint_url?.message as string}
                        fullWidth
                        disabled={isDirect}
                        sx={isDirect ? { opacity: 0.6 } : {}}
                    />
                )}
            />

            {/* ── Method + Timeout ── */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                    <Controller
                        name="method"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth disabled={isDirect}>
                                <InputLabel>HTTP Method</InputLabel>
                                <Select {...field} label="HTTP Method">
                                    <MenuItem value="POST">POST</MenuItem>
                                    <MenuItem value="PUT">PUT</MenuItem>
                                </Select>
                            </FormControl>
                        )}
                    />
                </Grid>
                <Grid size={{ xs: 6 }}>
                    <Controller
                        name="timeout_seconds"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Timeout (seconds)"
                                type="number"
                                fullWidth
                                onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                        )}
                    />
                </Grid>
            </Grid>

            {/* ── Headers ── */}
            <Controller
                name="headers"
                control={control}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Headers (JSON key/value pairs)"
                        placeholder='{"Content-Type": "application/json"}'
                        multiline
                        rows={2}
                        fullWidth
                        disabled={isDirect}
                        sx={{
                            '& textarea': { fontFamily: 'monospace' },
                            ...(isDirect ? { opacity: 0.6 } : {}),
                        }}
                    />
                )}
            />

            {/* ── Payload Template ── */}
            <Controller
                name="payload_template"
                control={control}
                rules={{
                    required: 'Payload template is required',
                    validate: (val: string) =>
                        val.includes('{{prompt}}') || 'Must contain {{prompt}} placeholder',
                }}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Payload Template"
                        placeholder='{"messages": [{"role":"user","content":"{{prompt}}"}]}'
                        multiline
                        rows={4}
                        error={!!flatErrors.payload_template}
                        helperText={
                            (flatErrors.payload_template?.message as string) ??
                            'Must contain {{prompt}} placeholder'
                        }
                        fullWidth
                        disabled={isDirect}
                        sx={{
                            '& textarea': { fontFamily: 'monospace' },
                            ...(isDirect ? { opacity: 0.6 } : {}),
                        }}
                    />
                )}
            />

            {/* ── Auth Type + Auth Value ── */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 4 }}>
                    <Controller
                        name="auth_type"
                        control={control}
                        render={({ field }) => (
                            <FormControl fullWidth disabled={isDirect}>
                                <InputLabel>Auth Type</InputLabel>
                                <Select {...field} label="Auth Type">
                                    <MenuItem value="none">None</MenuItem>
                                    <MenuItem value="bearer">Bearer</MenuItem>
                                    <MenuItem value="api_key">API Key</MenuItem>
                                    <MenuItem value="basic">Basic</MenuItem>
                                </Select>
                            </FormControl>
                        )}
                    />
                </Grid>
                <Grid size={{ xs: 8 }}>
                    {authType && authType !== 'none' && (
                        <Controller
                            name="auth_value"
                            control={control}
                            render={({ field }) => (
                                <TextField
                                    {...field}
                                    label={isDirect ? 'Auth Value (auto-filled)' : 'Auth Value'}
                                    type={showAuth ? 'text' : 'password'}
                                    fullWidth
                                    disabled={isDirect}
                                    sx={isDirect ? { opacity: 0.6 } : {}}
                                    slotProps={{
                                        input: {
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        onClick={() => setShowAuth((p) => !p)}
                                                        edge="end"
                                                        size="small"
                                                    >
                                                        {showAuth ? (
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
                    )}
                </Grid>
            </Grid>

            {/* ── Multi-turn fields ── */}
            <Collapse in={turnMode === 'multi_turn'}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
                    <Typography variant="subtitle2" color="text.secondary">
                        Multi-Turn Configuration
                    </Typography>
                    <Controller
                        name="thread_endpoint_url"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Thread Endpoint URL"
                                placeholder="https://api.myai.com/v1/threads"
                                fullWidth
                            />
                        )}
                    />
                    <Controller
                        name="thread_id_path"
                        control={control}
                        render={({ field }) => (
                            <TextField
                                {...field}
                                label="Thread ID JSON Path"
                                placeholder="$.thread_id"
                                fullWidth
                            />
                        )}
                    />
                </Box>
            </Collapse>
        </Box>
    );
}
