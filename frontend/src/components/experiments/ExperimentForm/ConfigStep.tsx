// ---------------------------------------------------------------------------
// ConfigStep — Step 2: provider, turn mode, testing level, language
// ---------------------------------------------------------------------------

import { Controller, useFormContext } from 'react-hook-form';
import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useProviders } from '@/hooks/useProviders';
import { TESTING_LEVELS } from '@/utils/constants';
import type { TestingLevel } from '@/types/experiment';

const LANGUAGES = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'ar', label: 'Arabic' },
];

export default function ConfigStep() {
    const {
        control,
        setValue,
        watch,
        formState: { errors },
    } = useFormContext();

    const { list: providersQuery } = useProviders();
    const providers = providersQuery.data?.items ?? [];
    const turnMode = watch('turn_mode');

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Provider */}
            <Controller
                name="provider_id"
                control={control}
                rules={{ required: 'Provider is required' }}
                render={({ field }) => (
                    <FormControl fullWidth error={!!errors.provider_id}>
                        <InputLabel>Model Provider</InputLabel>
                        <Select {...field} label="Model Provider">
                            {providersQuery.isLoading && (
                                <MenuItem disabled>
                                    <CircularProgress size={16} sx={{ mr: 1 }} /> Loading...
                                </MenuItem>
                            )}
                            {providers.map((p) => (
                                <MenuItem key={p.id} value={p.id}>
                                    {p.name} ({p.provider_type === 'azure_openai' ? 'Azure' : 'OpenAI'})
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            />

            {/* Turn Mode */}
            <div>
                <FormLabel sx={{ mb: 1, display: 'block' }}>Turn Mode</FormLabel>
                <ToggleButtonGroup
                    value={turnMode}
                    exclusive
                    onChange={(_, val) => {
                        if (val) setValue('turn_mode', val);
                    }}
                    size="small"
                >
                    <ToggleButton value="single_turn">Single-Turn</ToggleButton>
                    <ToggleButton value="multi_turn">Multi-Turn</ToggleButton>
                </ToggleButtonGroup>
            </div>

            {/* Testing Level */}
            <div>
                <FormLabel>Testing Level</FormLabel>
                <Controller
                    name="testing_level"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup {...field}>
                            {(Object.entries(TESTING_LEVELS) as [TestingLevel, typeof TESTING_LEVELS.basic][]).map(
                                ([key, meta]) => (
                                    <FormControlLabel
                                        key={key}
                                        value={key}
                                        control={<Radio />}
                                        label={
                                            <Box>
                                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                    {meta.label}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {meta.tests} tests, {meta.duration}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                ),
                            )}
                        </RadioGroup>
                    )}
                />
            </div>

            {/* Language */}
            <Controller
                name="language"
                control={control}
                render={({ field }) => (
                    <FormControl fullWidth>
                        <InputLabel>Language</InputLabel>
                        <Select {...field} label="Language">
                            {LANGUAGES.map((l) => (
                                <MenuItem key={l.value} value={l.value}>
                                    {l.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                )}
            />
        </Box>
    );
}
