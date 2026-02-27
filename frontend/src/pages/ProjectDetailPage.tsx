// ---------------------------------------------------------------------------
// ProjectDetailPage — project detail with Overview / Experiments / Firewall / Settings tabs
// ---------------------------------------------------------------------------

import { useState, type SyntheticEvent } from 'react';
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Pagination from '@mui/material/Pagination';
import Skeleton from '@mui/material/Skeleton';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ScienceIcon from '@mui/icons-material/Science';
import LoadingButton from '@mui/lab/LoadingButton';
import PageHeader from '@/components/common/PageHeader';
import LoadingScreen from '@/components/common/LoadingScreen';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ExperimentCard from '@/components/experiments/ExperimentCard';
import ProjectSettings from '@/components/projects/ProjectSettings';
import FirewallIntegration from '@/components/firewall/FirewallIntegration';
import FirewallLogTable from '@/components/firewall/FirewallLogTable';
import FirewallStats from '@/components/firewall/FirewallStats';
import { useProject, useProjects } from '@/hooks/useProjects';
import { useExperiments } from '@/hooks/useExperiments';
import { useFirewall, useFirewallLogs, useFirewallStats } from '@/hooks/useFirewall';
import type { FirewallRule, FirewallRuleCreate } from '@/types/firewall';

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

export default function ProjectDetailPage() {
    const { id: projectId = '' } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const project = useProject(projectId);

    const [tab, setTab] = useState(0);
    const handleTabChange = (_: SyntheticEvent, newValue: number) => setTab(newValue);

    if (project.isLoading) return <LoadingScreen />;
    if (!project.data) return <EmptyState title="Project not found" />;

    const p = project.data;

    return (
        <Box>
            {/* Breadcrumbs */}
            <Breadcrumbs sx={{ mb: 2 }}>
                <Link component={RouterLink} to="/" underline="hover" color="inherit">
                    Projects
                </Link>
                <Typography color="text.primary" sx={{ fontWeight: 600 }}>{p.name}</Typography>
            </Breadcrumbs>

            <PageHeader title={p.name} subtitle={p.description || undefined} />

            <Paper variant="outlined" sx={{ borderRadius: 3, mb: 0 }}>
                <Tabs value={tab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" sx={{ px: 2 }}>
                    <Tab label="Overview" />
                    <Tab label="Experiments" />
                    <Tab label="Firewall" />
                    <Tab label="Settings" />
                </Tabs>
            </Paper>

            {/* Overview */}
            <TabPanel value={tab} index={0}>
                <OverviewTab project={p} projectId={projectId} />
            </TabPanel>

            {/* Experiments */}
            <TabPanel value={tab} index={1}>
                <ExperimentsTab projectId={projectId} />
            </TabPanel>

            {/* Firewall */}
            <TabPanel value={tab} index={2}>
                <FirewallTab projectId={projectId} />
            </TabPanel>

            {/* Settings */}
            <TabPanel value={tab} index={3}>
                <SettingsTab project={p} projectId={projectId} onDeleted={() => navigate('/')} />
            </TabPanel>
        </Box>
    );
}

// =============================================
// Overview Tab
// =============================================

interface OverviewTabProps {
    project: import('@/types/project').Project;
    projectId: string;
}

function OverviewTab({ project }: OverviewTabProps) {
    return (
        <Grid container spacing={3}>
            {/* Business Scope */}
            <Grid size={{ xs: 12, md: 8 }}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                        Business Scope
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                        {project.business_scope}
                    </Typography>
                </Paper>
            </Grid>

            {/* Quick Stats */}
            <Grid size={{ xs: 12, md: 4 }}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                        Quick Stats
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                API Key Prefix
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {project.api_key_prefix ?? '—'}
                            </Typography>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Status
                            </Typography>
                            <Box sx={{ mt: 0.5 }}>
                                <Chip
                                    label={project.is_active ? 'Active' : 'Inactive'}
                                    color={project.is_active ? 'success' : 'default'}
                                    size="small"
                                />
                            </Box>
                        </Box>
                        <Box>
                            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                Created
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {new Date(project.created_at).toLocaleDateString()}
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            </Grid>

            {/* Allowed Intents */}
            <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                        Allowed Intents
                    </Typography>
                    {project.allowed_intents.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No allowed intents configured.
                        </Typography>
                    ) : (
                        <List dense>
                            {project.allowed_intents.map((intent) => (
                                <ListItem key={intent}>
                                    <ListItemText primary={intent} />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Paper>
            </Grid>

            {/* Restricted Intents */}
            <Grid size={{ xs: 12, md: 6 }}>
                <Paper variant="outlined" sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>
                        Restricted Intents
                    </Typography>
                    {project.restricted_intents.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                            No restricted intents configured.
                        </Typography>
                    ) : (
                        <List dense>
                            {project.restricted_intents.map((intent) => (
                                <ListItem key={intent}>
                                    <ListItemText primary={intent} />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Paper>
            </Grid>
        </Grid>
    );
}

// =============================================
// Experiments Tab
// =============================================

function ExperimentsTab({ projectId }: { projectId: string }) {
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const { list, cancel } = useExperiments(projectId, { page, page_size: 10 });
    const experiments = list.data?.items ?? [];
    const totalPages = list.data ? Math.ceil(list.data.total / list.data.page_size) : 0;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>Experiments</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate(`/projects/${projectId}/experiments/new`)}
                    sx={{
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
                    }}
                >
                    New Experiment
                </Button>
            </Box>

            {list.isLoading && (
                <Stack spacing={2}>
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} variant="rounded" height={140} sx={{ borderRadius: 3 }} />
                    ))}
                </Stack>
            )}

            {!list.isLoading && experiments.length === 0 && (
                <EmptyState
                    icon={<ScienceIcon />}
                    title="No experiments yet"
                    description="Create your first experiment to start red-teaming."
                    actionLabel="New Experiment"
                    onAction={() => navigate(`/projects/${projectId}/experiments/new`)}
                />
            )}

            {!list.isLoading && experiments.length > 0 && (
                <Stack spacing={2}>
                    {experiments.map((exp) => (
                        <ExperimentCard
                            key={exp.id}
                            projectId={projectId}
                            experiment={exp}
                            onCancel={() => cancel.mutate(exp.id)}
                        />
                    ))}
                </Stack>
            )}

            {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                    <Pagination count={totalPages} page={page} onChange={(_, v) => setPage(v)} />
                </Box>
            )}
        </Box>
    );
}

// =============================================
// Firewall Tab (with sub-tabs)
// =============================================

function FirewallTab({ projectId }: { projectId: string }) {
    const [subTab, setSubTab] = useState(0);
    const { integration, rules, createRule, updateRule, deleteRule } = useFirewall(projectId);
    const [logParams, setLogParams] = useState<{ verdict_status?: string }>({});
    const logsQuery = useFirewallLogs(projectId, logParams);
    const [statsPeriod, setStatsPeriod] = useState('7d');
    const statsQuery = useFirewallStats(projectId, statsPeriod);

    // Rule form state
    const [ruleFormOpen, setRuleFormOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<FirewallRule | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<FirewallRule | null>(null);
    const [snack, setSnack] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

    const handleOpenCreateRule = () => {
        setEditingRule(null);
        setRuleFormOpen(true);
    };

    const handleOpenEditRule = (rule: FirewallRule) => {
        setEditingRule(rule);
        setRuleFormOpen(true);
    };

    const handleSaveRule = (data: FirewallRuleCreate) => {
        if (editingRule) {
            updateRule.mutate(
                { ruleId: editingRule.id, data },
                {
                    onSuccess: () => {
                        setRuleFormOpen(false);
                        setSnack({ message: 'Rule updated.', severity: 'success' });
                    },
                    onError: () => setSnack({ message: 'Failed to update rule.', severity: 'error' }),
                },
            );
        } else {
            createRule.mutate(data, {
                onSuccess: () => {
                    setRuleFormOpen(false);
                    setSnack({ message: 'Rule created.', severity: 'success' });
                },
                onError: () => setSnack({ message: 'Failed to create rule.', severity: 'error' }),
            });
        }
    };

    const handleDeleteRule = () => {
        if (!deleteTarget) return;
        deleteRule.mutate(deleteTarget.id, {
            onSuccess: () => {
                setDeleteTarget(null);
                setSnack({ message: 'Rule deleted.', severity: 'success' });
            },
            onError: () => setSnack({ message: 'Failed to delete rule.', severity: 'error' }),
        });
    };

    return (
        <Box>
            <Tabs value={subTab} onChange={(_, v) => setSubTab(v)} variant="scrollable" scrollButtons="auto">
                <Tab label="Integration" />
                <Tab label="Rules" />
                <Tab label="Logs" />
                <Tab label="Stats" />
            </Tabs>

            {/* Integration Sub-Tab */}
            <TabPanel value={subTab} index={0}>
                {integration.isLoading && <Skeleton variant="rectangular" height={200} />}
                {integration.data && <FirewallIntegration data={integration.data} />}
            </TabPanel>

            {/* Rules Sub-Tab */}
            <TabPanel value={subTab} index={1}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Firewall Rules</Typography>
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateRule}>
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
                                            <IconButton size="small" onClick={() => handleOpenEditRule(rule)}>
                                                <EditIcon fontSize="small" />
                                            </IconButton>
                                            <IconButton size="small" onClick={() => setDeleteTarget(rule)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}

                {/* Rule Form Modal */}
                <FirewallRuleFormModal
                    open={ruleFormOpen}
                    rule={editingRule}
                    loading={createRule.isPending || updateRule.isPending}
                    onSave={handleSaveRule}
                    onClose={() => setRuleFormOpen(false)}
                />

                {/* Delete Confirmation */}
                <ConfirmDialog
                    open={!!deleteTarget}
                    title="Delete Rule?"
                    message={`Delete rule "${deleteTarget?.name}"? This cannot be undone.`}
                    confirmLabel="Delete"
                    confirmColor="error"
                    loading={deleteRule.isPending}
                    onConfirm={handleDeleteRule}
                    onCancel={() => setDeleteTarget(null)}
                />
            </TabPanel>

            {/* Logs Sub-Tab */}
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

            {/* Stats Sub-Tab */}
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

// =============================================
// Firewall Rule Form Modal
// =============================================

interface RuleFormModalProps {
    open: boolean;
    rule: FirewallRule | null;
    loading: boolean;
    onSave: (data: FirewallRuleCreate) => void;
    onClose: () => void;
}

function FirewallRuleFormModal({ open, rule, loading, onSave, onClose }: RuleFormModalProps) {
    const [name, setName] = useState('');
    const [ruleType, setRuleType] = useState<FirewallRuleCreate['rule_type']>('block_pattern');
    const [pattern, setPattern] = useState('');
    const [policy, setPolicy] = useState('');
    const [priority, setPriority] = useState(0);
    const [isActive, setIsActive] = useState(true);

    // Populate on edit
    const handleEnter = () => {
        if (rule) {
            setName(rule.name);
            setRuleType(rule.rule_type);
            setPattern(rule.pattern ?? '');
            setPolicy(rule.policy ?? '');
            setPriority(rule.priority);
            setIsActive(rule.is_active);
        } else {
            setName('');
            setRuleType('block_pattern');
            setPattern('');
            setPolicy('');
            setPriority(0);
            setIsActive(true);
        }
    };

    const handleSubmit = () => {
        onSave({
            name,
            rule_type: ruleType,
            pattern: ruleType !== 'custom_policy' ? pattern : undefined,
            policy: ruleType === 'custom_policy' ? policy : undefined,
            priority,
            is_active: isActive,
        });
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            TransitionProps={{ onEnter: handleEnter }}
        >
            <DialogTitle>{rule ? 'Edit Rule' : 'Add Firewall Rule'}</DialogTitle>
            <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: '16px !important' }}>
                <TextField
                    label="Name"
                    required
                    fullWidth
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <FormControl fullWidth>
                    <InputLabel>Rule Type</InputLabel>
                    <Select
                        label="Rule Type"
                        value={ruleType}
                        onChange={(e) => setRuleType(e.target.value as FirewallRuleCreate['rule_type'])}
                    >
                        <MenuItem value="block_pattern">Block Pattern</MenuItem>
                        <MenuItem value="allow_pattern">Allow Pattern</MenuItem>
                        <MenuItem value="custom_policy">Custom Policy</MenuItem>
                    </Select>
                </FormControl>

                {ruleType !== 'custom_policy' && (
                    <TextField
                        label="Pattern (regex)"
                        required
                        fullWidth
                        value={pattern}
                        onChange={(e) => setPattern(e.target.value)}
                        placeholder="(?i)(drop\s+table|delete\s+from)"
                    />
                )}

                {ruleType === 'custom_policy' && (
                    <TextField
                        label="Policy"
                        required
                        fullWidth
                        multiline
                        rows={3}
                        value={policy}
                        onChange={(e) => setPolicy(e.target.value)}
                        placeholder="Never provide legal or medical advice under any circumstances."
                    />
                )}

                <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}>
                        <TextField
                            label="Priority"
                            type="number"
                            fullWidth
                            value={priority}
                            onChange={(e) => setPriority(Number(e.target.value))}
                        />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                />
                            }
                            label="Active"
                            sx={{ mt: 1 }}
                        />
                    </Grid>
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <LoadingButton
                    variant="contained"
                    loading={loading}
                    disabled={!name || (ruleType !== 'custom_policy' && !pattern) || (ruleType === 'custom_policy' && !policy)}
                    onClick={handleSubmit}
                >
                    Save Rule
                </LoadingButton>
            </DialogActions>
        </Dialog>
    );
}

// =============================================
// Settings Tab (wraps ProjectSettings with mutation hooks)
// =============================================

function SettingsTab({
    project,
    projectId,
    onDeleted,
}: {
    project: import('@/types/project').Project;
    projectId: string;
    onDeleted: () => void;
}) {
    const { update, remove, regenerateKey } = useProjects();

    return (
        <ProjectSettings
            project={project}
            updating={update.isPending}
            regenerating={regenerateKey.isPending}
            deleting={remove.isPending}
            onSave={(data) => update.mutate({ id: projectId, data })}
            onRegenerateKey={() => regenerateKey.mutate(projectId)}
            onDelete={() => remove.mutate(projectId, { onSuccess: onDeleted })}
        />
    );
}
