// ---------------------------------------------------------------------------
// InsightsPanel — AI-generated insights display
// ---------------------------------------------------------------------------

import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import ReportIcon from '@mui/icons-material/Report';
import Box from '@mui/material/Box';
import type { Insights } from '@/types/results';

interface InsightsPanelProps {
    insights: Insights | null;
}

export default function InsightsPanel({ insights }: InsightsPanelProps) {
    if (!insights) {
        return (
            <Paper elevation={1} sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                    AI-Powered Insights
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Insights are not yet available for this experiment.
                </Typography>
            </Paper>
        );
    }

    const riskColor =
        insights.risk_assessment.toLowerCase().includes('high') ||
        insights.risk_assessment.toLowerCase().includes('critical')
            ? 'error'
            : insights.risk_assessment.toLowerCase().includes('medium')
                ? 'warning'
                : 'success';

    return (
        <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
                AI-Powered Insights
            </Typography>

            {/* Summary */}
            <Typography variant="body1" sx={{ mb: 2 }}>
                {insights.summary}
            </Typography>

            {/* Key Findings */}
            {insights.key_findings.length > 0 && (
                <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        Key Findings
                    </Typography>
                    <List dense>
                        {insights.key_findings.map((finding, i) => (
                            <ListItem key={i} disablePadding sx={{ pl: 0 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <ReportIcon fontSize="small" color="error" />
                                </ListItemIcon>
                                <ListItemText primary={finding} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}

            {/* Risk Assessment */}
            <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Risk Assessment
                </Typography>
                <Chip
                    label={insights.risk_assessment}
                    color={riskColor}
                    sx={{ fontWeight: 700 }}
                />
            </Box>

            {/* Recommendations */}
            {insights.recommendations.length > 0 && (
                <Box>
                    <Typography variant="subtitle2" gutterBottom>
                        Recommendations
                    </Typography>
                    <List dense>
                        {insights.recommendations.map((rec, i) => (
                            <ListItem key={i} disablePadding sx={{ pl: 0 }}>
                                <ListItemIcon sx={{ minWidth: 32 }}>
                                    <LightbulbIcon fontSize="small" color="primary" />
                                </ListItemIcon>
                                <ListItemText primary={`${i + 1}. ${rec}`} />
                            </ListItem>
                        ))}
                    </List>
                </Box>
            )}
        </Paper>
    );
}
