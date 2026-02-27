// ---------------------------------------------------------------------------
// FirewallStats — stat cards, latency, block categories, daily trend
// ---------------------------------------------------------------------------

import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import Skeleton from '@mui/material/Skeleton';
import { formatPercent } from '@/utils/formatters';
import type { FirewallStatsResponse } from '@/types/firewall';

interface FirewallStatsProps {
    data?: FirewallStatsResponse;
    loading?: boolean;
    period: string;
    onPeriodChange: (period: string) => void;
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

export default function FirewallStats({ data, loading, period, onPeriodChange }: FirewallStatsProps) {
    if (loading || !data) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Skeleton variant="rectangular" height={40} width={200} />
                <Grid container spacing={2}>
                    {[1, 2, 3, 4].map((i) => (
                        <Grid key={i} size={{ xs: 6, sm: 3 }}>
                            <Skeleton variant="rectangular" height={100} />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        );
    }

    const catEntries = Object.entries(data.category_breakdown);
    const maxCat = Math.max(...catEntries.map(([, v]) => v), 1);

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Period Selector */}
            <ToggleButtonGroup
                value={period}
                exclusive
                onChange={(_, val) => {
                    if (val) onPeriodChange(val);
                }}
                size="small"
            >
                <ToggleButton value="24h">24h</ToggleButton>
                <ToggleButton value="7d">7d</ToggleButton>
                <ToggleButton value="30d">30d</ToggleButton>
            </ToggleButtonGroup>

            {/* Stat Cards */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <StatCard label="Requests" value={data.total_requests.toLocaleString()} />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <StatCard label="Passed" value={data.passed.toLocaleString()} color="#2e7d32" />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <StatCard label="Blocked" value={data.blocked.toLocaleString()} color="#d32f2f" />
                </Grid>
                <Grid size={{ xs: 6, sm: 3 }}>
                    <StatCard label="Pass Rate" value={formatPercent(data.pass_rate)} />
                </Grid>
            </Grid>

            {/* Latency + Block Categories */}
            <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 5 }}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Latency
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2">Avg</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {data.avg_latency_ms}ms
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2">P95</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {data.p95_latency_ms}ms
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Typography variant="body2">P99</Typography>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {data.p99_latency_ms}ms
                                </Typography>
                            </Box>
                        </Box>
                    </Paper>
                </Grid>

                <Grid size={{ xs: 12, md: 7 }}>
                    <Paper elevation={1} sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            Block Categories
                        </Typography>
                        {catEntries.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                No blocked requests in this period.
                            </Typography>
                        )}
                        {catEntries.map(([cat, count]) => (
                            <Box key={cat} sx={{ mb: 1.5 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2">{cat}</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        {count}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={(count / maxCat) * 100}
                                    sx={{ height: 6, borderRadius: 3 }}
                                    color="error"
                                />
                            </Box>
                        ))}
                    </Paper>
                </Grid>
            </Grid>

            {/* Daily Trend (simplified stacked bars using CSS) */}
            {data.daily_breakdown.length > 0 && (
                <Paper elevation={1} sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>
                        Daily Trend
                    </Typography>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'flex-end',
                            gap: 0.5,
                            height: 160,
                            pt: 1,
                        }}
                    >
                        {data.daily_breakdown.map((day) => {
                            const maxDay = Math.max(
                                ...data.daily_breakdown.map((d) => d.total),
                                1,
                            );
                            const totalHeight = (day.total / maxDay) * 140;
                            const blockedHeight = day.total > 0
                                ? (day.blocked / day.total) * totalHeight
                                : 0;
                            const passedHeight = totalHeight - blockedHeight;

                            return (
                                <Box
                                    key={day.date}
                                    sx={{
                                        flex: 1,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                    }}
                                >
                                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%', maxWidth: 30 }}>
                                        <Box
                                            sx={{
                                                height: passedHeight,
                                                bgcolor: 'success.main',
                                                borderRadius: '4px 4px 0 0',
                                            }}
                                        />
                                        <Box
                                            sx={{
                                                height: blockedHeight,
                                                bgcolor: 'error.main',
                                                borderRadius: blockedHeight === totalHeight ? '4px 4px 0 0' : 0,
                                            }}
                                        />
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        sx={{ fontSize: 10, mt: 0.5 }}
                                    >
                                        {new Date(day.date).getDate()}
                                    </Typography>
                                </Box>
                            );
                        })}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mt: 1, justifyContent: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 12, height: 12, bgcolor: 'success.main', borderRadius: 1 }} />
                            <Typography variant="caption">Passed</Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Box sx={{ width: 12, height: 12, bgcolor: 'error.main', borderRadius: 1 }} />
                            <Typography variant="caption">Blocked</Typography>
                        </Box>
                    </Box>
                </Paper>
            )}
        </Box>
    );
}
