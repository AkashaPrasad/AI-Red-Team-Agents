// ---------------------------------------------------------------------------
// ExperimentResultsPage — dashboard overview + logs with detail pane
// ---------------------------------------------------------------------------

import { useState, type SyntheticEvent } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Button from '@mui/material/Button';
import Skeleton from '@mui/material/Skeleton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import PageHeader from '@/components/common/PageHeader';
import LoadingScreen from '@/components/common/LoadingScreen';
import EmptyState from '@/components/common/EmptyState';
import ExperimentStatusChip from '@/components/experiments/ExperimentStatusChip';
import OverviewDashboard from '@/components/results/OverviewDashboard';
import CategoryBreakdown from '@/components/results/CategoryBreakdown';
import InsightsPanel from '@/components/results/InsightsPanel';
import LogsTable from '@/components/results/LogsTable';
import LogDetailPane from '@/components/results/LogDetailPane';
import { useExperiment } from '@/hooks/useExperiments';
import { useDashboard, useLogs, useLogDetail } from '@/hooks/useResults';
import { useFeedback } from '@/hooks/useFeedback';
import { useProject } from '@/hooks/useProjects';
import { formatDuration, formatPercent } from '@/utils/formatters';
import { SUB_TYPE_LABELS } from '@/utils/constants';

// ── Tab Panel helper ──

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
    if (value !== index) return null;
    return <Box sx={{ py: 3 }}>{children}</Box>;
}

// ── Main Page ──

export default function ExperimentResultsPage() {
    const { id: projectId = '', eid: experimentId = '' } = useParams<{
        id: string;
        eid: string;
    }>();

    const project = useProject(projectId);
    const experiment = useExperiment(projectId, experimentId);
    const dashboard = useDashboard(experimentId, experiment.data?.status);

    const [tab, setTab] = useState(0);
    const handleTabChange = (_: SyntheticEvent, newValue: number) => setTab(newValue);

    if (experiment.isLoading) return <LoadingScreen />;
    if (!experiment.data) return <EmptyState title="Experiment not found" />;

    const exp = experiment.data;

    return (
        <Box>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link component={RouterLink} to="/" underline="hover" color="inherit">
                    Projects
                </Link>
                <Link
                    component={RouterLink}
                    to={`/projects/${projectId}`}
                    underline="hover"
                    color="inherit"
                >
                    {project.data?.name ?? 'Project'}
                </Link>
                <Typography color="text.primary">{exp.name}</Typography>
            </Breadcrumbs>

            {/* Header */}
            <PageHeader
                title={exp.name}
                subtitle={`${exp.experiment_type} · ${SUB_TYPE_LABELS[exp.sub_type] ?? exp.sub_type} · ${exp.testing_level}`}
            >
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mt: 1 }}>
                    <ExperimentStatusChip status={exp.status} />
                    {exp.started_at && exp.completed_at && (
                        <Typography variant="body2" color="text.secondary">
                            Duration:{' '}
                            {formatDuration(
                                new Date(exp.completed_at).getTime() - new Date(exp.started_at).getTime(),
                            )}
                        </Typography>
                    )}
                </Box>
            </PageHeader>

            <Tabs value={tab} onChange={handleTabChange}>
                <Tab label="Overview" />
                <Tab label="Logs" />
            </Tabs>

            {/* Overview Tab */}
            <TabPanel value={tab} index={0}>
                {/* Error banner for failed experiments */}
                {exp.status === 'failed' && exp.error_message && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                            Experiment Failed
                        </Typography>
                        <Typography variant="body2">{exp.error_message}</Typography>
                    </Alert>
                )}

                {/* Cancelled banner */}
                {exp.status === 'cancelled' && (
                    <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
                        <Typography variant="subtitle2">Experiment Cancelled</Typography>
                    </Alert>
                )}

                {(exp.status === 'pending' || exp.status === 'running') && (
                    <Paper sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                            Results Not Available Yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            The experiment is currently <strong>{exp.status}</strong>.
                            Results will appear here once the experiment completes.
                        </Typography>
                        {exp.status === 'running' && exp.progress && (
                            <Box sx={{ mt: 2, maxWidth: 400, mx: 'auto' }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={exp.progress.percentage ?? 0}
                                    sx={{ height: 8, borderRadius: 4 }}
                                />
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                    {exp.progress.completed} / {exp.progress.total} tests
                                </Typography>
                            </Box>
                        )}
                    </Paper>
                )}

                {(exp.status === 'completed' || exp.status === 'failed' || exp.status === 'cancelled') &&
                    dashboard.isLoading && (
                        <Grid container spacing={2}>
                            {[1, 2, 3, 4, 5].map((i) => (
                                <Grid key={i} size={{ xs: 6, sm: 4, md: 2.4 }}>
                                    <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 2 }} />
                                </Grid>
                            ))}
                        </Grid>
                    )}

                {/* Show partial results info for failed/cancelled */}
                {(exp.status === 'failed' || exp.status === 'cancelled') &&
                    !dashboard.isLoading &&
                    !dashboard.data && (
                        <Paper sx={{ p: 3, textAlign: 'center', mt: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                No test results were recorded before the experiment {exp.status}.
                                Check the Logs tab for any available data.
                            </Typography>
                        </Paper>
                    )}

                {dashboard.data && (
                    <>
                        <OverviewDashboard data={dashboard.data} />
                        <Box sx={{ mt: 3 }}>
                            <CategoryBreakdown items={dashboard.data.category_breakdown} />
                        </Box>
                        {dashboard.data.insights && (
                            <Box sx={{ mt: 3 }}>
                                <InsightsPanel insights={dashboard.data.insights} />
                            </Box>
                        )}
                    </>
                )}
            </TabPanel>

            {/* Logs Tab */}
            <TabPanel value={tab} index={1}>
                <LogsTab experimentId={experimentId} />
            </TabPanel>
        </Box>
    );
}

// =============================================
// Logs Tab (with filters, table, detail pane)
// =============================================

function LogsTab({ experimentId }: { experimentId: string }) {
    const feedback = useFeedback(experimentId);

    // Filter state
    const [result, setResult] = useState<string>('');
    const [severity, setSeverity] = useState<string>('');
    const [category, setCategory] = useState<string>('');
    const [strategy, setStrategy] = useState<string>('');
    const [isRepresentative, setIsRepresentative] = useState(false);
    const [search, setSearch] = useState('');
    const [selectedLogId, setSelectedLogId] = useState<string | undefined>(undefined);

    const logParams = {
        result: result || undefined,
        severity: severity || undefined,
        risk_category: category || undefined,
        data_strategy: strategy || undefined,
        is_representative: isRepresentative || undefined,
        search: search || undefined,
    };

    const logs = useLogs(experimentId, logParams);
    const allLogs = logs.data?.pages.flatMap((p) => p.items) ?? [];
    const logDetail = useLogDetail(experimentId, selectedLogId ?? '');

    // Feedback coverage banner
    const fbSummary = feedback.summary.data;

    return (
        <Box>
            {/* Feedback Coverage Banner */}
            {fbSummary && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Feedback Coverage
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 4, mb: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2">
                            Total: {fbSummary.total_with_feedback}/{fbSummary.total_test_cases} (
                            {formatPercent(
                                fbSummary.total_test_cases > 0
                                    ? (fbSummary.total_with_feedback / fbSummary.total_test_cases) * 100
                                    : 0,
                            )}
                            )
                        </Typography>
                        <Typography variant="body2">
                            Representatives: {fbSummary.representative_with_feedback}/{fbSummary.representative_total} (
                            {formatPercent(
                                fbSummary.representative_total > 0
                                    ? (fbSummary.representative_with_feedback / fbSummary.representative_total) * 100
                                    : 0,
                            )}
                            )
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={
                            fbSummary.representative_total > 0
                                ? (fbSummary.representative_with_feedback / fbSummary.representative_total) * 100
                                : 0
                        }
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                        <Typography variant="caption">
                            👍 {fbSummary.vote_breakdown.thumbs_up}
                        </Typography>
                        <Typography variant="caption">
                            👎 {fbSummary.vote_breakdown.thumbs_down}
                        </Typography>
                    </Box>
                </Paper>
            )}

            {/* Filters */}
            <Box
                sx={{
                    display: 'flex',
                    gap: 2,
                    mb: 2,
                    flexWrap: 'wrap',
                    alignItems: 'center',
                }}
            >
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Result</InputLabel>
                    <Select label="Result" value={result} onChange={(e) => setResult(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="pass">Pass</MenuItem>
                        <MenuItem value="fail">Fail</MenuItem>
                        <MenuItem value="error">Error</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Severity</InputLabel>
                    <Select label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="high">High</MenuItem>
                        <MenuItem value="medium">Medium</MenuItem>
                        <MenuItem value="low">Low</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Category</InputLabel>
                    <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Strategy</InputLabel>
                    <Select label="Strategy" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                    </Select>
                </FormControl>

                <FormControlLabel
                    control={
                        <Switch
                            checked={isRepresentative}
                            onChange={(e) => setIsRepresentative(e.target.checked)}
                            size="small"
                        />
                    }
                    label="Representatives Only"
                />

                <TextField
                    size="small"
                    placeholder="Search prompts…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={{ minWidth: 200 }}
                />
            </Box>

            {/* Logs Table */}
            <LogsTable
                logs={allLogs}
                loading={logs.isLoading}
                selectedId={selectedLogId}
                onSelect={(id) => setSelectedLogId(id === selectedLogId ? undefined : id)}
            />

            {/* Load More */}
            {logs.hasNextPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={() => logs.fetchNextPage()}
                        disabled={logs.isFetchingNextPage}
                    >
                        {logs.isFetchingNextPage ? 'Loading…' : 'Load More'}
                    </Button>
                </Box>
            )}

            {/* Log Detail Pane */}
            {selectedLogId && logDetail.data && (
                <Box sx={{ mt: 3 }}>
                    <LogDetailPane
                        detail={logDetail.data}
                        experimentId={experimentId}
                        onClose={() => setSelectedLogId(undefined)}
                    />
                </Box>
            )}
        </Box>
    );
}
