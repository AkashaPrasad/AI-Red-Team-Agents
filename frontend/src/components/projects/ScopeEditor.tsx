// ---------------------------------------------------------------------------
// ScopeEditor — chip input for allowed / restricted intents
// ---------------------------------------------------------------------------

import { useState } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import AddIcon from '@mui/icons-material/Add';

interface ScopeEditorProps {
    label: string;
    items: string[];
    onChange: (items: string[]) => void;
}

export default function ScopeEditor({ label, items, onChange }: ScopeEditorProps) {
    const [input, setInput] = useState('');

    const handleAdd = () => {
        const trimmed = input.trim();
        if (trimmed && !items.includes(trimmed)) {
            onChange([...items, trimmed]);
            setInput('');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAdd();
        }
    };

    const handleRemove = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2">{label}</Typography>
                <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={handleAdd}
                    disabled={!input.trim()}
                >
                    Add Intent
                </Button>
            </Box>

            <TextField
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type an intent and press Enter"
                fullWidth
                size="small"
                sx={{ mb: 1 }}
            />

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {items.map((item, idx) => (
                    <Chip
                        key={idx}
                        label={item}
                        size="small"
                        onDelete={() => handleRemove(idx)}
                    />
                ))}
            </Box>
        </Box>
    );
}
