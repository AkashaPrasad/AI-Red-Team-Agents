// ---------------------------------------------------------------------------
// FirewallIntegration — endpoint info + code snippets
// ---------------------------------------------------------------------------

import { useState } from 'react';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Skeleton from '@mui/material/Skeleton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import type { FirewallIntegrationResponse } from '@/types/firewall';

interface FirewallIntegrationProps {
    data?: FirewallIntegrationResponse;
    loading?: boolean;
}

type SnippetLang = 'python' | 'javascript' | 'curl';

export default function FirewallIntegration({ data, loading }: FirewallIntegrationProps) {
    const [snippetTab, setSnippetTab] = useState<SnippetLang>('python');

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (loading || !data) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Skeleton variant="rectangular" height={120} />
                <Skeleton variant="rectangular" height={200} />
            </Box>
        );
    }

    const snippets: Record<SnippetLang, string> = {
        python: data.python_snippet ?? '# No snippet available yet',
        javascript: data.javascript_snippet ?? '// No snippet available yet',
        curl: data.curl_snippet ?? '# No snippet available yet',
    };
    const currentSnippet = snippets[snippetTab] ?? '';

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Endpoint Info */}
            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Typography variant="h6" gutterBottom>
                    Firewall Endpoint
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                        POST {data.endpoint_url ?? 'N/A'}
                    </Typography>
                    {data.endpoint_url && (
                        <Tooltip title="Copy URL">
                            <IconButton
                                size="small"
                                onClick={() => copyToClipboard(data.endpoint_url)}
                            >
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                <Typography variant="body2" color="text.secondary">
                    API Key Prefix: <strong>{data.api_key_prefix ?? 'N/A'}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    Rate Limit: <strong>{data.rate_limit ?? 'N/A'}</strong>
                </Typography>
            </Paper>

            {/* Code Snippets */}
            <Paper elevation={1} sx={{ p: 2.5 }}>
                <Typography variant="h6" gutterBottom>
                    Code Snippets
                </Typography>

                <Tabs
                    value={snippetTab}
                    onChange={(_, val) => setSnippetTab(val)}
                    sx={{ mb: 2 }}
                >
                    <Tab label="Python" value="python" />
                    <Tab label="JavaScript" value="javascript" />
                    <Tab label="cURL" value="curl" />
                </Tabs>

                <Box sx={{ position: 'relative' }}>
                    <Paper
                        variant="outlined"
                        sx={{
                            p: 2,
                            fontFamily: 'monospace',
                            fontSize: 13,
                            whiteSpace: 'pre',
                            overflow: 'auto',
                            maxHeight: 300,
                            bgcolor: 'action.hover',
                        }}
                    >
                        {currentSnippet}
                    </Paper>
                    {currentSnippet && (
                        <Tooltip title="Copy snippet">
                            <IconButton
                                size="small"
                                sx={{ position: 'absolute', top: 8, right: 8 }}
                                onClick={() => copyToClipboard(currentSnippet)}
                            >
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Paper>
        </Box>
    );
}
