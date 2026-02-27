// ---------------------------------------------------------------------------
// ReviewStep — Step 4: summary + launch
// ---------------------------------------------------------------------------

import { useFormContext } from 'react-hook-form';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Alert from '@mui/material/Alert';
import { SUB_TYPE_LABELS, TESTING_LEVELS } from '@/utils/constants';
import { useProviders } from '@/hooks/useProviders';
import type { TestingLevel } from '@/types/experiment';

export default function ReviewStep() {
    const { watch } = useFormContext();
    const values = watch();

    const { list: providersQuery } = useProviders();
    const provider = providersQuery.data?.items.find(
        (p) => p.id === values.provider_id,
    );

    const level = values.testing_level as TestingLevel;
    const meta = TESTING_LEVELS[level];

    const rows = [
        { label: 'Name', value: values.name },
        { label: 'Type', value: `${values.experiment_type} / ${SUB_TYPE_LABELS[values.sub_type] ?? values.sub_type}` },
        { label: 'Mode', value: `${values.turn_mode?.replace('_', '-')} · ${level}` },
        { label: 'Provider', value: provider?.name ?? values.provider_id },
        {
            label: 'Target',
            value: values.endpoint_url?.startsWith('direct://')
                ? 'Direct Provider (via platform proxy)'
                : values.endpoint_url || '—',
        },
        { label: 'Tests', value: meta?.tests ?? '—' },
        { label: 'Est. Duration', value: meta?.duration ?? '—' },
    ];

    return (
        <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
                Summary
            </Typography>

            <Table size="small">
                <TableBody>
                    {rows.map((row) => (
                        <TableRow key={row.label}>
                            <TableCell
                                component="th"
                                scope="row"
                                sx={{ fontWeight: 600, border: 0, pl: 0, width: 160 }}
                            >
                                {row.label}
                            </TableCell>
                            <TableCell sx={{ border: 0 }}>{row.value}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {meta && (
                <Alert severity="info" sx={{ mt: 2 }}>
                    This experiment will run approximately {meta.tests} test cases and take{' '}
                    {meta.duration}.
                </Alert>
            )}
        </Paper>
    );
}
