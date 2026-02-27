// ---------------------------------------------------------------------------
// ExperimentProgress — linear progress bar with label
// ---------------------------------------------------------------------------

import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Typography from '@mui/material/Typography';
import type { ExperimentProgress as ProgressData } from '@/types/experiment';
import { formatDurationSeconds } from '@/utils/formatters';

interface ExperimentProgressProps {
    progress: ProgressData | null;
}

export default function ExperimentProgress({ progress }: ExperimentProgressProps) {
    if (!progress) return null;

    const pct = Math.min(progress.percentage, 100);

    return (
        <Box sx={{ mt: 1 }}>
            <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, mb: 0.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                    {progress.completed} / {progress.total} — {pct.toFixed(1)}%
                </Typography>
                {progress.estimated_remaining_seconds != null && (
                    <Typography variant="caption" color="text.secondary">
                        ETA: ~{formatDurationSeconds(progress.estimated_remaining_seconds)}
                    </Typography>
                )}
            </Box>
        </Box>
    );
}
