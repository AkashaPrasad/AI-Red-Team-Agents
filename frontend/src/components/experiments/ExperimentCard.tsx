// ---------------------------------------------------------------------------
// ExperimentCard — displays an experiment summary with actions
// ---------------------------------------------------------------------------

import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Avatar from '@mui/material/Avatar';
import ScienceIcon from '@mui/icons-material/Science';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CancelIcon from '@mui/icons-material/Cancel';
import DeleteIcon from '@mui/icons-material/Delete';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TimerIcon from '@mui/icons-material/Timer';
import Alert from '@mui/material/Alert';
import ExperimentStatusChip from './ExperimentStatusChip';
import ExperimentProgress from './ExperimentProgress';
import { SUB_TYPE_LABELS } from '@/utils/constants';
import { formatDateTime, formatDuration, formatPercent } from '@/utils/formatters';
import type { ExperimentSummary } from '@/types/experiment';

interface ExperimentCardProps {
    projectId: string;
    experiment: ExperimentSummary;
    cancelling?: boolean;
    deleting?: boolean;
    onCancel: (eid: string) => void;
    onDelete: (eid: string) => void;
}

export default function ExperimentCard({
    projectId,
    experiment,
    cancelling,
    deleting,
    onCancel,
    onDelete,
}: ExperimentCardProps) {
    const navigate = useNavigate();
    const isRunning = experiment.status === 'running' || experiment.status === 'pending';
    const isCompleted = experiment.status === 'completed';
    const isFailed = experiment.status === 'failed';
    const isCancelled = experiment.status === 'cancelled';
    const hasResults = isCompleted || isFailed || isCancelled;

    const duration =
        experiment.started_at && experiment.completed_at
            ? formatDuration(new Date(experiment.completed_at).getTime() - new Date(experiment.started_at).getTime())
            : null;

    return (
        <Card
            variant="outlined"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <CardContent sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Avatar
                        sx={{
                            width: 36,
                            height: 36,
                            background: isRunning
                                ? 'linear-gradient(135deg, #3b82f6, #06b6d4)'
                                : isCompleted
                                    ? 'linear-gradient(135deg, #10b981, #34d399)'
                                    : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            fontSize: 16,
                        }}
                    >
                        <ScienceIcon sx={{ fontSize: 18 }} />
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                            variant="subtitle1"
                            sx={{
                                fontWeight: 700,
                                lineHeight: 1.3,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {experiment.name}
                        </Typography>
                    </Box>
                    <ExperimentStatusChip status={experiment.status} />
                </Box>

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 2 }}>
                    <Chip label={experiment.experiment_type} size="small" variant="outlined" />
                    <Chip
                        label={SUB_TYPE_LABELS[experiment.sub_type] ?? experiment.sub_type}
                        size="small"
                        variant="outlined"
                    />
                    <Chip label={experiment.turn_mode.replace('_', '-')} size="small" variant="outlined" />
                    <Chip label={experiment.testing_level} size="small" variant="outlined" />
                </Box>

                {hasResults && experiment.pass_rate != null && (
                    <Box
                        sx={{
                            mb: 2,
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: (theme) =>
                                isFailed
                                    ? theme.palette.mode === 'dark' ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.06)'
                                    : theme.palette.mode === 'dark' ? 'rgba(16,185,129,0.08)' : 'rgba(16,185,129,0.06)',
                            border: '1px solid',
                            borderColor: (theme) =>
                                isFailed
                                    ? theme.palette.mode === 'dark' ? 'rgba(239,68,68,0.2)' : 'rgba(239,68,68,0.15)'
                                    : theme.palette.mode === 'dark' ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.15)',
                        }}
                    >
                        <Typography variant="body2" sx={{ fontWeight: 600, color: isFailed ? 'error.main' : 'success.main' }}>
                            Pass Rate: {formatPercent(experiment.pass_rate != null ? experiment.pass_rate * 100 : null)}
                            {isFailed && ' (partial)'}
                        </Typography>
                    </Box>
                )}

                {isFailed && experiment.error_message && (
                    <Alert
                        severity={experiment.error_message.toLowerCase().includes('rate limit') ? 'warning' : 'error'}
                        sx={{ mb: 2, borderRadius: 2, '& .MuiAlert-message': { fontSize: '0.75rem' } }}
                    >
                        {experiment.error_message.toLowerCase().includes('rate limit')
                            ? 'API Key Rate Limit Exceeded — ' + experiment.error_message.replace(/Rate limit exceeded:\s*/i, '')
                            : experiment.error_message
                        }
                    </Alert>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">
                            {formatDateTime(experiment.started_at)}
                        </Typography>
                    </Box>
                    {duration && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <TimerIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                            <Typography variant="caption" color="text.secondary">
                                {duration}
                            </Typography>
                        </Box>
                    )}
                </Box>

                {isRunning && <Box sx={{ mt: 2 }}><ExperimentProgress progress={experiment.progress} /></Box>}
            </CardContent>

            <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2, pt: 0 }}>
                {hasResults && (
                    <Button
                        size="small"
                        variant="contained"
                        startIcon={<VisibilityIcon />}
                        onClick={() =>
                            navigate(
                                `/projects/${projectId}/experiments/${experiment.id}`,
                            )
                        }
                        color={isFailed ? 'error' : 'primary'}
                    >
                        {isFailed ? 'View Partial Results' : 'View Results'}
                    </Button>
                )}
                {isRunning && (
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CancelIcon />}
                        disabled={cancelling}
                        onClick={() => onCancel(experiment.id)}
                    >
                        Cancel
                    </Button>
                )}
                {!isRunning && (
                    <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<DeleteIcon />}
                        disabled={deleting}
                        onClick={() => onDelete(experiment.id)}
                    >
                        Delete
                    </Button>
                )}
            </CardActions>
        </Card>
    );
}
