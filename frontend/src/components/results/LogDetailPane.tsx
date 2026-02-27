// ---------------------------------------------------------------------------
// LogDetailPane — expanded log detail with conversation + metadata
// ---------------------------------------------------------------------------

import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import StatusBadge from '@/components/common/StatusBadge';
import FeedbackButtons from './FeedbackButtons';
import { SEVERITY_COLORS } from '@/utils/constants';
import type { LogDetailResponse } from '@/types/results';

interface LogDetailPaneProps {
    detail: LogDetailResponse;
    experimentId: string;
    onClose: () => void;
}

export default function LogDetailPane({ detail, experimentId, onClose }: LogDetailPaneProps) {
    return (
        <Paper elevation={2} sx={{ p: 2.5, mt: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="h6">Test #{detail.sequence_order}</Typography>
                    <StatusBadge status={detail.result} />
                </Box>
                <IconButton size="small" onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </Box>

            {/* Metadata grid */}
            <Grid container spacing={1.5} sx={{ mb: 2 }}>
                <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Risk Category
                    </Typography>
                    <Typography variant="body2">
                        {detail.risk_category ?? '—'}
                        {detail.owasp_mapping && ` (${detail.owasp_mapping})`}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Severity
                    </Typography>
                    {detail.severity ? (
                        <Chip
                            label={detail.severity.toUpperCase()}
                            size="small"
                            sx={{
                                bgcolor: SEVERITY_COLORS[detail.severity],
                                color: '#fff',
                                fontWeight: 600,
                            }}
                        />
                    ) : (
                        <Typography variant="body2">—</Typography>
                    )}
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Confidence
                    </Typography>
                    <Typography variant="body2">
                        {detail.confidence != null ? detail.confidence.toFixed(2) : '—'}
                    </Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Strategy
                    </Typography>
                    <Typography variant="body2">{detail.data_strategy ?? '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Converter
                    </Typography>
                    <Typography variant="body2">{detail.attack_converter ?? '—'}</Typography>
                </Grid>
                <Grid size={{ xs: 6, sm: 4 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                        Latency
                    </Typography>
                    <Typography variant="body2">
                        {detail.latency_ms != null ? `${detail.latency_ms}ms` : '—'}
                    </Typography>
                </Grid>
                {detail.is_representative && (
                    <Grid size={{ xs: 12 }}>
                        <Chip
                            icon={<StarIcon />}
                            label="Representative"
                            size="small"
                            color="warning"
                            variant="outlined"
                        />
                    </Grid>
                )}
            </Grid>

            <Divider sx={{ mb: 2 }} />

            {/* Prompt */}
            <Typography variant="subtitle2" gutterBottom>
                Prompt
            </Typography>
            <Paper
                variant="outlined"
                sx={{ p: 1.5, mb: 2, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}
            >
                {detail.prompt}
            </Paper>

            {/* Response */}
            <Typography variant="subtitle2" gutterBottom>
                Response
            </Typography>
            <Paper
                variant="outlined"
                sx={{ p: 1.5, mb: 2, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 200, overflow: 'auto' }}
            >
                {detail.response}
            </Paper>

            {/* Conversation turns (multi-turn) */}
            {detail.conversation_turns && detail.conversation_turns.length > 0 && (
                <>
                    <Typography variant="subtitle2" gutterBottom>
                        Conversation Turns
                    </Typography>
                    {detail.conversation_turns.map((turn) => (
                        <Paper
                            key={turn.turn_number}
                            variant="outlined"
                            sx={{
                                p: 1.5,
                                mb: 1,
                                fontFamily: 'monospace',
                                fontSize: 13,
                                whiteSpace: 'pre-wrap',
                                borderLeftWidth: 3,
                                borderLeftColor:
                                    turn.role === 'attacker' ? 'error.main' : 'success.main',
                            }}
                        >
                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                Turn {turn.turn_number} — {turn.role}
                            </Typography>
                            <br />
                            {turn.content}
                        </Paper>
                    ))}
                </>
            )}

            {/* Explanation */}
            {detail.explanation && (
                <>
                    <Typography variant="subtitle2" gutterBottom>
                        AI Explanation
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {detail.explanation}
                    </Typography>
                </>
            )}

            <Divider sx={{ mb: 2 }} />

            {/* Feedback */}
            <FeedbackButtons
                experimentId={experimentId}
                testCaseId={detail.test_case_id}
                existing={detail.my_feedback}
            />
        </Paper>
    );
}
