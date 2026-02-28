// ---------------------------------------------------------------------------
// TypeStep — Step 1: name, description, type + sub-type selection
// ---------------------------------------------------------------------------

import { Controller, useFormContext } from 'react-hook-form';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import ShieldIcon from '@mui/icons-material/Shield';
import ScienceIcon from '@mui/icons-material/Science';
import { SUB_TYPE_LABELS } from '@/utils/constants';
import type { ExperimentType, ExperimentSubType } from '@/types/experiment';

const ADVERSARIAL_SUBTYPES: ExperimentSubType[] = [
    'owasp_llm_top10',
    'owasp_agentic',
    'adaptive',
];

const BEHAVIOURAL_SUBTYPES: ExperimentSubType[] = [
    'user_interaction',
    'functional',
    'scope_validation',
];

export default function TypeStep() {
    const {
        control,
        watch,
        setValue,
        formState: { errors },
    } = useFormContext();

    const experimentType = watch('experiment_type') as ExperimentType;

    const subtypes =
        experimentType === 'adversarial' ? ADVERSARIAL_SUBTYPES : BEHAVIOURAL_SUBTYPES;

    const handleTypeChange = (type: ExperimentType) => {
        setValue('experiment_type', type);
        // Reset sub_type to the first option when type changes
        const firstSub = type === 'adversarial' ? 'owasp_llm_top10' : 'user_interaction';
        setValue('sub_type', firstSub);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Name */}
            <Controller
                name="name"
                control={control}
                rules={{ required: 'Experiment name is required' }}
                render={({ field }) => (
                    <TextField
                        {...field}
                        label="Name"
                        placeholder='e.g. "OWASP Top 10 Security Audit"'
                        error={!!errors.name}
                        helperText={errors.name?.message as string}
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
                        placeholder="Optional description..."
                        multiline
                        rows={2}
                        fullWidth
                    />
                )}
            />

            {/* Experiment Type — selectable cards */}
            <div>
                <FormLabel sx={{ mb: 1.5, display: 'block' }}>Experiment Type</FormLabel>
                <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Card
                            variant="outlined"
                            onClick={() => handleTypeChange('adversarial')}
                            sx={{
                                cursor: 'pointer',
                                borderWidth: experimentType === 'adversarial' ? 2 : 1,
                                borderColor:
                                    experimentType === 'adversarial'
                                        ? 'primary.main'
                                        : 'divider',
                            }}
                        >
                            <CardContent sx={{ textAlign: 'center' }}>
                                <ShieldIcon
                                    color={
                                        experimentType === 'adversarial' ? 'primary' : 'disabled'
                                    }
                                    sx={{ fontSize: 40, mb: 1 }}
                                />
                                <Typography variant="h6">Adversarial Testing</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Security-focused OWASP attacks
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                        <Card
                            variant="outlined"
                            onClick={() => handleTypeChange('behavioural')}
                            sx={{
                                cursor: 'pointer',
                                borderWidth: experimentType === 'behavioural' ? 2 : 1,
                                borderColor:
                                    experimentType === 'behavioural'
                                        ? 'primary.main'
                                        : 'divider',
                            }}
                        >
                            <CardContent sx={{ textAlign: 'center' }}>
                                <ScienceIcon
                                    color={
                                        experimentType === 'behavioural' ? 'primary' : 'disabled'
                                    }
                                    sx={{ fontSize: 40, mb: 1 }}
                                />
                                <Typography variant="h6">Behavioural QA</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Quality assurance &amp; user interaction
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </div>

            {/* Sub-Type */}
            <div>
                <FormLabel>Sub-Type</FormLabel>
                <Controller
                    name="sub_type"
                    control={control}
                    render={({ field }) => (
                        <RadioGroup {...field}>
                            {subtypes.map((st) => (
                                <FormControlLabel
                                    key={st}
                                    value={st}
                                    control={<Radio />}
                                    label={SUB_TYPE_LABELS[st] ?? st}
                                />
                            ))}
                        </RadioGroup>
                    )}
                />
            </div>
        </Box>
    );
}
