// ---------------------------------------------------------------------------
// FirewallPage — standalone firewall view for /projects/:id/firewall
// Renders the same firewall content that lives in ProjectDetailPage's Firewall tab.
// ---------------------------------------------------------------------------

import { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Switch from '@mui/material/Switch';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PageHeader from '@/components/common/PageHeader';
import LoadingScreen from '@/components/common/LoadingScreen';
import EmptyState from '@/components/common/EmptyState';
import FirewallIntegration from '@/components/firewall/FirewallIntegration';
import FirewallLogTable from '@/components/firewall/FirewallLogTable';
import FirewallStats from '@/components/firewall/FirewallStats';
import { useProject } from '@/hooks/useProjects';
import { useFirewall, useFirewallLogs, useFirewallStats } from '@/hooks/useFirewall';

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

export default function FirewallPage() {
    const { id: projectId = '' } = useParams<{ id: string }>();
    const project = useProject(projectId);
    const { integration, rules, createRule: _createRule, updateRule, deleteRule: _deleteRule } = useFirewall(projectId);

    const [subTab, setSubTab] = useState(0);
    const [logParams, setLogParams] = useState<{ verdict_status?: string }>({});
    const logsQuery = useFirewallLogs(projectId, logParams);
    const [statsPeriod, setStatsPeriod] = useState('7d');
    const statsQuery = useFirewallStats(projectId, statsPeriod);
    const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

    if (project.isLoading) return <LoadingScreen />;

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
                <Typography color="text.primary">Firewall</Typography>
            </Breadcrumbs>

            <PageHeader title="AI Firewall" />

            <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} variant="scrollable" scrollButtons="auto">
                <Tab label="Integration" />
                <Tab label="Rules" />
                <Tab label="Logs" />
                <Tab label="Stats" />
            </Tabs>

            {/* Integration */}
            <TabPanel value={subTab} index={0}>
                {integration.isLoading && <Skeleton variant="rectangular" height={200} />}
                {integration.data && <FirewallIntegration data={integration.data} />}
            </TabPanel>

            {/* Rules */}
            <TabPanel value={subTab} index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Firewall Rules</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={() => { }}>
                        Add Rule
                    </Button>
                </Box>

                {rules.isLoading && <Skeleton variant="rectangular" height={200} />}

                {!rules.isLoading && (rules.data?.items.length ?? 0) === 0 && (
                    <EmptyState title="No firewall rules." description="Add a rule to start filtering." />
                )}

                {!rules.isLoading && (rules.data?.items.length ?? 0) > 0 && (
                    <TableContainer component={Paper}>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Priority</TableCell>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Active</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {rules.data?.items.map((rule) => (
                                    <TableRow key={rule.id}>
                                        <TableCell>{rule.priority}</TableCell>
                                        <TableCell>{rule.name}</TableCell>
                                        <TableCell>
                                            <Chip label={rule.rule_type} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={rule.is_active}
                                                size="small"
                                                onChange={() =>
                                                    updateRule.mutate({
                                                        ruleId: rule.id,
                                                        data: { is_active: !rule.is_active },
                                                    })
                                                }
                                            />
                                        </TableCell>
                                        <TableCell align="right">
                                            <IconButton size="small">
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small">
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </TabPanel>

            {/* Logs */}
            <TabPanel value={subTab} index={2}>
                <Box sx={{ mb: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 140, mr: 2 }}>
                        <InputLabel>Verdict</InputLabel>
                        <Select
                            label="Verdict"
                            value={logParams.verdict_status ?? ''}
                            onChange={(e) =>
                                setLogParams((prev) => ({
                                    ...prev,
                                    verdict_status: e.target.value || undefined,
                                }))
                            }
                        >
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="passed">Passed</MenuItem>
                            <MenuItem value="blocked">Blocked</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                <FirewallLogTable
                    logs={logsQuery.data?.pages.flatMap((p) => p.items) ?? []}
                    loading={logsQuery.isLoading}
                    hasMore={logsQuery.hasNextPage ?? false}
                    onLoadMore={() => logsQuery.fetchNextPage()}
                />
            </TabPanel>

            {/* Stats */}
            <TabPanel value={subTab} index={3}>
                <FirewallStats
                    data={statsQuery.data ?? undefined}
                    loading={statsQuery.isLoading}
                    period={statsPeriod}
                    onPeriodChange={setStatsPeriod}
                />
            </TabPanel>

            {/* Snackbar */}
            <Snackbar
                open={!!snack}
                autoHideDuration={4000}
                onClose={() => setSnack(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={snack?.severity} onClose={() => setSnack(null)} variant="filled">
                    {snack?.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
