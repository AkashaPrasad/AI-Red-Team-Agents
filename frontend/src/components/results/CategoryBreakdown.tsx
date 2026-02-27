// ---------------------------------------------------------------------------
// CategoryBreakdown — table showing per-category results
// ---------------------------------------------------------------------------

import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import type { CategoryBreakdownItem } from '@/types/results';

interface CategoryBreakdownProps {
    items: CategoryBreakdownItem[];
}

export default function CategoryBreakdown({ items }: CategoryBreakdownProps) {
    if (!items.length) return null;

    return (
        <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                Category Breakdown
            </Typography>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Category</TableCell>
                            <TableCell align="right">Total</TableCell>
                            <TableCell align="right">Pass</TableCell>
                            <TableCell align="right">Fail</TableCell>
                            <TableCell align="right">High</TableCell>
                            <TableCell>OWASP</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {items.map((row) => (
                            <TableRow key={row.risk_category}>
                                <TableCell>{row.risk_category}</TableCell>
                                <TableCell align="right">{row.total}</TableCell>
                                <TableCell align="right">{row.passed}</TableCell>
                                <TableCell align="right" sx={{ color: row.failed > 0 ? 'error.main' : undefined }}>
                                    {row.failed}
                                </TableCell>
                                <TableCell
                                    align="right"
                                    sx={{ color: row.high_severity > 0 ? 'error.main' : undefined, fontWeight: row.high_severity > 0 ? 700 : 400 }}
                                >
                                    {row.high_severity}
                                </TableCell>
                                <TableCell>{row.owasp_mapping ?? '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}
