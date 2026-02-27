// ---------------------------------------------------------------------------
// FeedbackButtons — thumbs up / down + correction form
// ---------------------------------------------------------------------------

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import FormControlLabel from '@mui/material/FormControlLabel';
import TextField from '@mui/material/TextField';
import FormHelperText from '@mui/material/FormHelperText';
import Alert from '@mui/material/Alert';
import LoadingButton from '@mui/lab/LoadingButton';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import { useFeedback } from '@/hooks/useFeedback';
import { formatDateTime } from '@/utils/formatters';
import { FEEDBACK_COMMENT_MAX_LENGTH } from '@/utils/constants';
import type { FeedbackSnapshot } from '@/types/feedback';
import type { CorrectionValue } from '@/types/feedback';

interface FeedbackButtonsProps {
    experimentId: string;
    testCaseId: string;
    existing: FeedbackSnapshot | null;
}

export default function FeedbackButtons({
    experimentId,
    testCaseId,
    existing,
}: FeedbackButtonsProps) {
    const { submit, remove } = useFeedback(experimentId);
    const [showForm, setShowForm] = useState(false);
    const [correction, setCorrection] = useState<CorrectionValue>('pass');
    const [comment, setComment] = useState('');
    const [editing, setEditing] = useState(false);

    const handleThumbsUp = () => {
        submit.mutate({ testCaseId, data: { vote: 'up' } });
    };

    const handleThumbsDown = () => {
        if (existing) {
            // Editing: pre-fill
            setCorrection((existing.correction as CorrectionValue) ?? 'pass');
            setComment(existing.comment ?? '');
            setEditing(true);
        }
        setShowForm(true);
    };

    const handleSubmitCorrection = () => {
        submit.mutate(
            {
                testCaseId,
                data: {
                    vote: 'down',
                    correction,
                    ...(comment.trim() ? { comment: comment.trim() } : {}),
                },
            },
            {
                onSuccess: () => {
                    setShowForm(false);
                    setEditing(false);
                },
            },
        );
    };

    const handleRemove = () => {
        remove.mutate(testCaseId, {
            onSuccess: () => {
                setShowForm(false);
                setEditing(false);
            },
        });
    };

    // ── Existing feedback display ──
    if (existing && !showForm) {
        return (
            <Box>
                <Alert
                    severity="info"
                    sx={{ mb: 1 }}
                    icon={existing.vote === 'up' ? <ThumbUpIcon /> : <ThumbDownIcon />}
                >
                    <Typography variant="body2">
                        <strong>Your Feedback:</strong>{' '}
                        {existing.vote === 'up' ? '👍 Correct' : '👎 Incorrect'}
                        {existing.correction && ` → Correction: ${existing.correction}`}
                    </Typography>
                    {existing.comment && (
                        <Typography variant="body2" sx={{ mt: 0.5 }}>
                            "{existing.comment}"
                        </Typography>
                    )}
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        Submitted: {formatDateTime(existing.created_at)}
                    </Typography>
                </Alert>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button size="small" onClick={handleThumbsDown}>
                        Edit Feedback
                    </Button>
                    <Button size="small" color="error" onClick={handleRemove} disabled={remove.isPending}>
                        Remove Feedback
                    </Button>
                </Box>
            </Box>
        );
    }

    // ── Correction form ──
    if (showForm) {
        return (
            <Box>
                <Typography variant="subtitle2" gutterBottom>
                    What should the correct result be?
                </Typography>
                <RadioGroup
                    value={correction}
                    onChange={(e) => setCorrection(e.target.value as CorrectionValue)}
                >
                    <FormControlLabel value="pass" control={<Radio size="small" />} label="Should be Pass (not a real vulnerability)" />
                    <FormControlLabel value="low" control={<Radio size="small" />} label="Should be Low severity" />
                    <FormControlLabel value="medium" control={<Radio size="small" />} label="Should be Medium severity" />
                    <FormControlLabel value="high" control={<Radio size="small" />} label="Should be High severity" />
                </RadioGroup>

                <TextField
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    label="Comment (optional)"
                    placeholder="Brief explanation..."
                    multiline
                    rows={2}
                    inputProps={{ maxLength: FEEDBACK_COMMENT_MAX_LENGTH }}
                    fullWidth
                    sx={{ mt: 1.5 }}
                />
                <FormHelperText sx={{ textAlign: 'right' }}>
                    {comment.length} / {FEEDBACK_COMMENT_MAX_LENGTH}
                </FormHelperText>

                <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                    <Button
                        size="small"
                        onClick={() => {
                            setShowForm(false);
                            setEditing(false);
                        }}
                    >
                        Cancel
                    </Button>
                    <LoadingButton
                        size="small"
                        variant="contained"
                        loading={submit.isPending}
                        onClick={handleSubmitCorrection}
                    >
                        {editing ? 'Update Feedback' : 'Submit Feedback'}
                    </LoadingButton>
                </Box>
            </Box>
        );
    }

    // ── Default: no feedback yet ──
    return (
        <Box>
            <Typography variant="subtitle2" gutterBottom>
                Was this evaluation correct?
            </Typography>
            <ButtonGroup variant="outlined" size="small">
                <Button
                    startIcon={<ThumbUpIcon />}
                    color="success"
                    onClick={handleThumbsUp}
                    disabled={submit.isPending}
                >
                    Correct
                </Button>
                <Button
                    startIcon={<ThumbDownIcon />}
                    color="error"
                    onClick={handleThumbsDown}
                >
                    Incorrect
                </Button>
            </ButtonGroup>
        </Box>
    );
}
