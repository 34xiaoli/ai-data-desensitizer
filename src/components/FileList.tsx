import React from 'react';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Chip,
  Typography,
  Box,
  Tooltip,
} from '@mui/material';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import TableChartIcon from '@mui/icons-material/TableChart';
import DeleteIcon from '@mui/icons-material/Delete';
import CircularProgress from '@mui/material/CircularProgress';
import ErrorIcon from '@mui/icons-material/Error';
import { useAppStore } from '../store/useAppStore';
import { formatFileSize, formatTimestamp, sensitiveTypeConfigs } from '../utils/helpers';
import { FileType, SensitiveType } from '../types';

const fileTypeIcons: Record<FileType, React.ReactElement> = {
  [FileType.PDF]: <PictureAsPdfIcon sx={{ color: '#e53935' }} />,
  [FileType.WORD]: <DescriptionIcon sx={{ color: '#1e88e5' }} />,
  [FileType.EXCEL]: <TableChartIcon sx={{ color: '#43a047' }} />,
  [FileType.UNKNOWN]: <DescriptionIcon sx={{ color: '#9e9e9e' }} />,
};

const FileList: React.FC = () => {
  const files = useAppStore((s) => s.files);
  const selectedFileId = useAppStore((s) => s.selectedFileId);
  const selectFile = useAppStore((s) => s.selectFile);
  const removeFile = useAppStore((s) => s.removeFile);
  const sensitiveItemsMap = useAppStore((s) => s.sensitiveItemsMap);
  const showSnackbar = useAppStore((s) => s.showSnackbar);

  if (files.length === 0) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          暂无文件，请上传文档
        </Typography>
      </Box>
    );
  }

  return (
    <List dense sx={{ width: '100%' }}>
      {files.map((file) => {
        const items = sensitiveItemsMap[file.id] || [];
        const desensitizedCount = items.filter((i) => i.isDesensitized).length;

        return (
          <ListItem
            key={file.id}
            onClick={() => selectFile(file.id)}
            sx={{
              borderRadius: 1,
              mb: 0.5,
              cursor: 'pointer',
              bgcolor: selectedFileId === file.id ? 'primary.50' : 'transparent',
              border: '1px solid',
              borderColor: selectedFileId === file.id ? 'primary.200' : 'transparent',
              '&:hover': {
                bgcolor: selectedFileId === file.id ? 'primary.50' : 'grey.50',
              },
            }}
            secondaryAction={
              <Tooltip title="删除文件">
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(file.id);
                    showSnackbar(`已删除文件: ${file.name}`);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          >
            <ListItemIcon sx={{ minWidth: 36 }}>
              {file.isParsing ? (
                <CircularProgress size={20} />
              ) : file.parseError ? (
                <ErrorIcon sx={{ color: '#e53935' }} />
              ) : (
                fileTypeIcons[file.type]
              )}
            </ListItemIcon>
            <ListItemText
              primary={
                <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
                  {file.name}
                </Typography>
              }
              secondary={
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)} · {formatTimestamp(file.uploadTime)}
                  </Typography>
                  {items.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      <Chip
                        label={`${items.length} 项敏感`}
                        size="small"
                        color="warning"
                        variant="outlined"
                        sx={{ height: 18, fontSize: '0.65rem' }}
                      />
                      {desensitizedCount > 0 && (
                        <Chip
                          label={`已脱敏 ${desensitizedCount}`}
                          size="small"
                          color="success"
                          variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem' }}
                        />
                      )}
                    </Box>
                  )}
                  {file.parseError && (
                    <Typography variant="caption" color="error">
                      解析失败
                    </Typography>
                  )}
                </Box>
              }
            />
          </ListItem>
        );
      })}
    </List>
  );
};

export default FileList;
