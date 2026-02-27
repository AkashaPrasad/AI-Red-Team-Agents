// ---------------------------------------------------------------------------
// ProjectCard — clickable card shown on the dashboard
// ---------------------------------------------------------------------------

import { useNavigate } from 'react-router-dom';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import FolderIcon from '@mui/icons-material/Folder';
import ScienceIcon from '@mui/icons-material/Science';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import StatusBadge from '@/components/common/StatusBadge';
import { formatDate, truncate } from '@/utils/formatters';
import type { ProjectSummary } from '@/types/project';

interface ProjectCardProps {
    project: ProjectSummary;
}

export default function ProjectCard({ project }: ProjectCardProps) {
    const navigate = useNavigate();

    return (
        <Card
            variant="outlined"
            sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) =>
                        `0 12px 24px -4px ${theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(99,102,241,0.15)'}`,
                },
            }}
        >
            <CardActionArea
                onClick={() => navigate(`/projects/${project.id}`)}
                sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}
            >
                {/* Top accent */}
                <Box
                    sx={{
                        height: 4,
                        width: '100%',
                        background: project.is_active
                            ? 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)'
                            : (theme) => theme.palette.action.disabledBackground,
                        borderRadius: '16px 16px 0 0',
                    }}
                />
                <CardContent sx={{ flex: 1, pt: 2.5 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Avatar
                            sx={{
                                width: 40,
                                height: 40,
                                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                                fontSize: 18,
                            }}
                        >
                            <FolderIcon fontSize="small" />
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                                variant="subtitle1"
                                sx={{
                                    fontWeight: 700,
                                    lineHeight: 1.3,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {project.name}
                            </Typography>
                        </Box>
                        <StatusBadge status={project.is_active ? 'active' : 'inactive'} />
                    </Box>

                    {project.description && (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                                mb: 2,
                                lineHeight: 1.6,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                            }}
                        >
                            {truncate(project.description, 120)}
                        </Typography>
                    )}

                    {/* Footer metadata row */}
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mt: 'auto',
                            pt: 1.5,
                            borderTop: 1,
                            borderColor: 'divider',
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip
                                icon={<ScienceIcon sx={{ fontSize: '14px !important' }} />}
                                label={`${project.experiment_count} exp`}
                                size="small"
                                variant="outlined"
                                sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                            />
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <AccessTimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                                <Typography variant="caption" color="text.secondary">
                                    {formatDate(project.created_at)}
                                </Typography>
                            </Box>
                        </Box>
                        <ArrowForwardIcon sx={{ fontSize: 16, color: 'text.secondary', opacity: 0.6 }} />
                    </Box>
                </CardContent>
            </CardActionArea>
        </Card>
    );
}
