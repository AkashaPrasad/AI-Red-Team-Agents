// ---------------------------------------------------------------------------
// CreateExperimentPage — multi-step form (Type → Config → Target → Review)
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import LoadingButton from '@mui/lab/LoadingButton';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import PageHeader from '@/components/common/PageHeader';
import TypeStep from '@/components/experiments/ExperimentForm/TypeStep';
import ConfigStep from '@/components/experiments/ExperimentForm/ConfigStep';
import IntegrationStep from '@/components/experiments/ExperimentForm/IntegrationStep';
import ReviewStep from '@/components/experiments/ExperimentForm/ReviewStep';
import { useExperiments } from '@/hooks/useExperiments';
import { useProject } from '@/hooks/useProjects';
import type { ExperimentCreate, TargetConfig } from '@/types/experiment';

const STEPS = ['Type', 'Config', 'Target', 'Review'] as const;

interface FormValues {
    name: string;
    description: string;
    experiment_type: 'adversarial' | 'behavioural';
    sub_type: string;
    provider_id: string;
    turn_mode: 'single_turn' | 'multi_turn';
    testing_level: 'basic' | 'moderate' | 'aggressive';
    language: string;
    endpoint_url: string;
    method: 'POST' | 'PUT';
    timeout_seconds: number;
    headers: string;
    payload_template: string;
    auth_type: 'bearer' | 'api_key' | 'basic' | 'none';
    auth_value: string;
    thread_endpoint_url: string;
    thread_id_path: string;
}

const DEFAULT_VALUES: FormValues = {
    name: '',
    description: '',
    experiment_type: 'adversarial',
    sub_type: 'owasp_llm_top10',
    provider_id: '',
    turn_mode: 'single_turn',
    testing_level: 'basic',
    language: 'en',
    endpoint_url: '',
    method: 'POST',
    timeout_seconds: 30,
    headers: '{"Content-Type": "application/json"}',
    payload_template: '{"messages": [{"role": "user", "content": "{{prompt}}"}]}',
    auth_type: 'bearer',
    auth_value: '',
    thread_endpoint_url: '',
    thread_id_path: '',
};

export default function CreateExperimentPage() {
    const { id: projectId = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const project = useProject(projectId);
    const { create } = useExperiments(projectId);

    const [activeStep, setActiveStep] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const methods = useForm<FormValues>({ defaultValues: DEFAULT_VALUES, mode: 'onChange' });

    // ── Step Validation ──

    const validateCurrentStep = (): boolean => {
        const values = methods.getValues();
        switch (activeStep) {
            case 0:
                if (!values.name.trim()) {
                    methods.setError('name', { message: 'Name is required.' });
                    return false;
                }
                if (!values.sub_type) return false;
                return true;
            case 1:
                if (!values.provider_id) {
                    methods.setError('provider_id', { message: 'Provider is required.' });
                    return false;
                }
                return true;
            case 2:
                if (!values.endpoint_url.trim()) {
                    methods.setError('endpoint_url', { message: 'Endpoint URL is required.' });
                    return false;
                }
                if (!values.payload_template.includes('{{prompt}}')) {
                    methods.setError('payload_template', {
                        message: 'Payload template must contain {{prompt}}.',
                    });
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (!validateCurrentStep()) return;
        setActiveStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    };

    const handleBack = () => setActiveStep((prev) => Math.max(prev - 1, 0));

    const handleLaunch = () => {
        const values = methods.getValues();

        // Parse headers JSON
        let parsedHeaders: Record<string, string> = {};
        try {
            parsedHeaders = values.headers ? JSON.parse(values.headers) : {};
        } catch {
            setError('Invalid JSON in headers field.');
            return;
        }

        const target_config: TargetConfig = {
            endpoint_url: values.endpoint_url,
            method: values.method,
            headers: parsedHeaders,
            payload_template: values.payload_template,
            auth_type: values.auth_type === 'none' ? undefined : values.auth_type,
            auth_value: values.auth_value || undefined,
            timeout_seconds: values.timeout_seconds,
        };

        if (values.turn_mode === 'multi_turn') {
            if (values.thread_endpoint_url) target_config.thread_endpoint_url = values.thread_endpoint_url;
            if (values.thread_id_path) target_config.thread_id_path = values.thread_id_path;
        }

        const payload: ExperimentCreate = {
            name: values.name,
            description: values.description || undefined,
            provider_id: values.provider_id,
            experiment_type: values.experiment_type,
            sub_type: values.sub_type as ExperimentCreate['sub_type'],
            turn_mode: values.turn_mode,
            testing_level: values.testing_level,
            language: values.language,
            target_config,
        };

        setError(null);
        create.mutate(payload, {
            onSuccess: () => navigate(`/projects/${projectId}`, { state: { tab: 1 } }),
            onError: (err) => {
                const msg =
                    (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
                    'Failed to create experiment.';
                setError(msg);
            },
        });
    };

    return (
        <Box>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link component={RouterLink} to="/" underline="hover" color="inherit">
                    Projects
                </Link>
                <Link
                    component={RouterLink}
                    to={`/projects/${projectId}`}
                    underline="hover"
                    color="inherit"
                >
                    {project.data?.name ?? 'Project'}
                </Link>
                <Typography color="text.primary">New Experiment</Typography>
            </Breadcrumbs>

            <PageHeader title="Create Experiment" />

            {/* Stepper */}
            <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                {STEPS.map((label) => (
                    <Step key={label}>
                        <StepLabel>{label}</StepLabel>
                    </Step>
                ))}
            </Stepper>

            {/* Error */}
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {/* Form Steps */}
            <FormProvider {...methods}>
                <Box sx={{ minHeight: 300 }}>
                    {activeStep === 0 && <TypeStep />}
                    {activeStep === 1 && <ConfigStep />}
                    {activeStep === 2 && <IntegrationStep />}
                    {activeStep === 3 && <ReviewStep />}
                </Box>
            </FormProvider>

            {/* Navigation */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mt: 4 }}>
                {activeStep > 0 && (
                    <Button onClick={handleBack} variant="outlined">
                        Back
                    </Button>
                )}

                {activeStep < STEPS.length - 1 && (
                    <Button onClick={handleNext} variant="contained">
                        Next
                    </Button>
                )}

                {activeStep === STEPS.length - 1 && (
                    <LoadingButton
                        variant="contained"
                        loading={create.isPending}
                        startIcon={<RocketLaunchIcon />}
                        onClick={handleLaunch}
                    >
                        Launch Experiment
                    </LoadingButton>
                )}
            </Box>
        </Box>
    );
}
