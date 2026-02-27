// ---------------------------------------------------------------------------
// OverviewDashboard — stat cards, severity breakdown, fail impact
// ---------------------------------------------------------------------------

import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { formatPercent } from '@/utils/formatters';
import { SEVERITY_COLORS } from '@/utils/constants';
import type { DashboardResponse } from '@/types/results';

interface OverviewDashboardProps {
    data: DashboardResponse;
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
    return (
        <Paper elevation={1} sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary" display="block" gutterBottom>
                {label}
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, color }}>
                {value}
            </Typography>
        </Paper>
    );
}

export default function OverviewDashboard({ data }: OverviewDashboardProps) {
    const { severity_breakdown: sev, fail_impact: fi } = data;
    const maxSev = Math.max(sev.high, sev.medium, sev.low, 1);

    const impactColor =
        fi?.level === 'critical' || fi?.level === 'high'
            ? 'error'
            : fi?.level === 'medium'
                ? 'warning'
                : 'success';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Stat cards */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                    <StatCard label="Total Tests" value={data.total_tests} />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                    <StatCard label="Passed" value={data.passed} color="#2e7d32" />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                    <StatCard label="Failed" value={data.failed} color="#d32f2f" />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                    <StatCard label="Errors" value={data.errors} color="#ed6c02" />
                </Grid>
                <Grid size={{ xs: 6, sm: 2.4 }}>
                    <StatCard label="Pass Rate" value={formatPercent(data.pass_rate * 100)} />
                </Grid>
            </Grid>

            {/* Severity + Fail Impact */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Severity Breakdown
                        </Typography>
                        {(['high', 'medium', 'low'] as const).map((level) => (
                            <Box key={level} sx={{ mb: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                                        {level}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {sev[level]}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={(sev[level] / maxSev) * 100}
                                    sx={{
                                        height: 8,
                                        borderRadius: 4,
                                        backgroundColor: 'action.hover',
                                        '& .MuiLinearProgress-bar': {
                                            backgroundColor: SEVERITY_COLORS[level],
                                        },
                                    }}
                                />
                            </Box>
                        ))}
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Fail Impact
                        </Typography>
                        {fi ? (
                            <>
                                <Chip
                                    label={fi.level.toUpperCase()}
                                    color={impactColor}
                                    sx={{ mb: 1.5, fontWeight: 700 }}
                                />
                                <Typography variant="body2" color="text.secondary">
                                    {fi.summary}
                                </Typography>
                            </>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No failures detected
                            </Typography>
                        )}
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
}
