// ---------------------------------------------------------------------------
// ExperimentStatusChip — coloured chip for experiment status
// ---------------------------------------------------------------------------

import Chip from '@mui/material/Chip';
import type { ExperimentStatus } from '@/types/experiment';

const STATUS_CONFIG: Record<ExperimentStatus, { label: string; color: 'success' | 'info' | 'warning' | 'error' | 'default' }> = {
    completed: { label: 'Completed', color: 'success' },
    running: { label: 'Running', color: 'info' },
    pending: { label: 'Pending', color: 'warning' },
    failed: { label: 'Failed', color: 'error' },
    cancelled: { label: 'Cancelled', color: 'default' },
};

interface ExperimentStatusChipProps {
    status: ExperimentStatus;
    size?: 'small' | 'medium';
}

export default function ExperimentStatusChip({ status, size = 'small' }: ExperimentStatusChipProps) {
    const config = STATUS_CONFIG[status] ?? { label: status, color: 'default' as const };

    return (
        <Chip
            label={config.label}
            color={config.color}
            size={size}
            variant="filled"
        />
    );
}
