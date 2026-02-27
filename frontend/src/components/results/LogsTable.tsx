// ---------------------------------------------------------------------------
// LogsTable — paginated test case log list with filters
// ---------------------------------------------------------------------------

import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import StarIcon from '@mui/icons-material/Star';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import StatusBadge from '@/components/common/StatusBadge';
import { truncate } from '@/utils/formatters';
import { SEVERITY_COLORS } from '@/utils/constants';
import type { LogEntry } from '@/types/results';

interface LogsTableProps {
    logs: LogEntry[];
    loading?: boolean;
    selectedId?: string;
    onSelect: (testCaseId: string) => void;
}

export default function LogsTable({ logs, loading, selectedId, onSelect }: LogsTableProps) {
    if (loading) {
        return (
            <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">Loading logs…</Typography>
            </Paper>
        );
    }
    return (
        <TableContainer component={Paper} elevation={1}>
            <Table stickyHeader size="small">
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 50 }}>#</TableCell>
                        <TableCell>Prompt Preview</TableCell>
                        <TableCell sx={{ width: 90 }}>Result</TableCell>
                        <TableCell sx={{ width: 90 }}>Severity</TableCell>
                        <TableCell sx={{ width: 140 }}>Category</TableCell>
                        <TableCell sx={{ width: 40 }} align="center">
                            Rep
                        </TableCell>
                        <TableCell sx={{ width: 40 }} align="center">
                            FB
                        </TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {logs.map((log) => (
                        <TableRow
                            key={log.test_case_id}
                            hover
                            selected={log.test_case_id === selectedId}
                            onClick={() => onSelect(log.test_case_id)}
                            sx={{ cursor: 'pointer' }}
                        >
                            <TableCell>{log.sequence_order}</TableCell>
                            <TableCell>
                                <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                    {truncate(log.prompt_preview, 60)}
                                </Typography>
                            </TableCell>
                            <TableCell>
                                <StatusBadge status={log.result} />
                            </TableCell>
                            <TableCell>
                                {log.severity ? (
                                    <Chip
                                        label={log.severity}
                                        size="small"
                                        sx={{
                                            bgcolor: SEVERITY_COLORS[log.severity],
                                            color: '#fff',
                                            fontWeight: 600,
                                            textTransform: 'capitalize',
                                        }}
                                    />
                                ) : (
                                    '—'
                                )}
                            </TableCell>
                            <TableCell>
                                <Typography variant="caption">
                                    {log.risk_category ?? '—'}
                                </Typography>
                            </TableCell>
                            <TableCell align="center">
                                {log.is_representative && (
                                    <StarIcon fontSize="small" color="warning" />
                                )}
                            </TableCell>
                            <TableCell align="center">
                                {log.has_feedback && (
                                    <ThumbUpIcon fontSize="small" color="info" />
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );
}
