// ---------------------------------------------------------------------------
// FirewallLogTable — cursor-paginated firewall evaluation logs
// ---------------------------------------------------------------------------

import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDateTime, truncate } from '@/utils/formatters';
import type { FirewallLogEntry } from '@/types/firewall';

interface FirewallLogTableProps {
    logs: FirewallLogEntry[];
    loading?: boolean;
    hasMore?: boolean;
    onLoadMore: () => void;
}

export default function FirewallLogTable({
    logs,
    loading,
    hasMore,
    onLoadMore,
}: FirewallLogTableProps) {
    return (
        <Box>
            <TableContainer component={Paper} elevation={1}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 160 }}>Time</TableCell>
                            <TableCell>Prompt Preview</TableCell>
                            <TableCell sx={{ width: 90 }}>Verdict</TableCell>
                            <TableCell sx={{ width: 120 }}>Category</TableCell>
                            <TableCell sx={{ width: 120 }}>Matched Rule</TableCell>
                            <TableCell sx={{ width: 80 }} align="right">
                                Latency
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logs.map((log) => (
                            <TableRow key={log.id} hover>
                                <TableCell>
                                    <Typography variant="caption">
                                        {formatDateTime(log.created_at)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2" noWrap sx={{ maxWidth: 300 }}>
                                        {truncate(log.prompt_preview, 50)}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <StatusBadge status={log.verdict_status} />
                                </TableCell>
                                <TableCell>
                                    {log.fail_category ? (
                                        <Chip label={log.fail_category} size="small" />
                                    ) : (
                                        '—'
                                    )}
                                </TableCell>
                                <TableCell>
                                    <Typography variant="caption">
                                        {log.matched_rule_name ?? 'LLM'}
                                    </Typography>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="caption">{log.latency_ms}ms</Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                        {loading &&
                            Array.from({ length: 3 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`}>
                                    {Array.from({ length: 6 }).map((__, j) => (
                                        <TableCell key={j}>
                                            <Skeleton />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </TableContainer>

            {hasMore && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button variant="outlined" onClick={onLoadMore} disabled={loading}>
                        Load More
                    </Button>
                </Box>
            )}
        </Box>
    );
}
