import React, { useState } from 'react';
import {
  Box,
  TextField,
  IconButton,
  ToggleButton,
  ToggleButtonGroup,
  Paper,
  Typography,
} from '@mui/material';
import FormatBoldIcon from '@mui/icons-material/FormatBold';
import FormatItalicIcon from '@mui/icons-material/FormatItalic';
import TitleIcon from '@mui/icons-material/Title';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LinkIcon from '@mui/icons-material/Link';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';

interface RichTextEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  minRows?: number;
}

export const RichTextEditorWrapper: React.FC<RichTextEditorWrapperProps> = ({
  value,
  onChange,
  label = 'Content Editor',
  minRows = 8,
}) => {
  const [isPreview, setIsPreview] = useState(false);

  const handleFormat = (type: string) => {
    let inserted = '';
    switch (type) {
      case 'bold':
        inserted = '**Bold Text**';
        break;
      case 'italic':
        inserted = '*Italic Text*';
        break;
      case 'header':
        inserted = '\n### Heading Title\n';
        break;
      case 'list':
        inserted = '\n- Item 1\n- Item 2\n';
        break;
      case 'link':
        inserted = '[Link Label](https://example.com)';
        break;
    }
    onChange(value ? `${value}\n${inserted}` : inserted);
  };

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
      <Box
        sx={{
          p: 1,
          backgroundColor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Typography variant="subtitle2" fontWeight={600} sx={{ px: 1 }}>
          {label}
        </Typography>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {!isPreview && (
            <>
              <IconButton size="small" onClick={() => handleFormat('bold')} title="Bold">
                <FormatBoldIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleFormat('italic')} title="Italic">
                <FormatItalicIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleFormat('header')} title="Header">
                <TitleIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleFormat('list')} title="List">
                <FormatListBulletedIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => handleFormat('link')} title="Link">
                <LinkIcon fontSize="small" />
              </IconButton>
            </>
          )}
          <ToggleButtonGroup
            size="small"
            value={isPreview ? 'preview' : 'edit'}
            exclusive
            onChange={(_, val) => val && setIsPreview(val === 'preview')}
          >
            <ToggleButton value="edit">
              <EditIcon fontSize="small" sx={{ mr: 0.5 }} /> Edit
            </ToggleButton>
            <ToggleButton value="preview">
              <VisibilityIcon fontSize="small" sx={{ mr: 0.5 }} /> Preview
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {isPreview ? (
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            minHeight: minRows * 24,
            backgroundColor: 'background.paper',
            whiteSpace: 'pre-wrap',
          }}
        >
          {value || <Typography color="text.secondary">Nothing to preview</Typography>}
        </Paper>
      ) : (
        <TextField
          fullWidth
          multiline
          minRows={minRows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          variant="outlined"
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 0,
              '& fieldset': { border: 'none' },
            },
          }}
        />
      )}
    </Box>
  );
};
