import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Chip } from '@mui/material';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import UploadFileIcon from '@mui/icons-material/UploadFile';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMb?: number;
  label?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  accept = '*/*',
  maxSizeMb = 10,
  label = 'Upload File',
}) => {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMb * 1024 * 1024) {
      alert(`File size exceeds maximum allowed size of ${maxSizeMb}MB`);
      return;
    }

    setIsUploading(true);
    setSelectedFileName(file.name);
    setTimeout(() => {
      setIsUploading(false);
      onFileSelect(file);
    }, 400);
  };

  return (
    <Box>
      <Typography variant="caption" fontWeight={600} color="text.secondary" gutterBottom display="block">
        {label}
      </Typography>
      <Box
        component="label"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2,
          backgroundColor: 'background.paper',
          cursor: 'pointer',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <InsertDriveFileIcon color="primary" />
          {selectedFileName ? (
            <Chip label={selectedFileName} color="primary" size="small" variant="outlined" />
          ) : (
            <Typography variant="body2" color="text.secondary">
              Select a file to attach (Max {maxSizeMb}MB)
            </Typography>
          )}
        </Box>
        <Button size="small" variant="outlined" component="span" startIcon={isUploading ? <CircularProgress size={16} /> : <UploadFileIcon />}>
          Browse
        </Button>
        <input type="file" accept={accept} hidden onChange={handleFileChange} />
      </Box>
    </Box>
  );
};
