import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Box,
  Typography,
  Paper,
  Chip,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useAppStore } from '../store/useAppStore';
import { detectFileType, parseDocument } from '../engine/parsers';
import { generateId, formatFileSize } from '../utils/helpers';
import { FileType, UploadedFile } from '../types';

const FileUpload: React.FC = () => {
  const addFile = useAppStore((s) => s.addFile);
  const updateFileContent = useAppStore((s) => s.updateFileContent);
  const setFileParsing = useAppStore((s) => s.setFileParsing);
  const setFileParseError = useAppStore((s) => s.setFileParseError);
  const detectFileSensitive = useAppStore((s) => s.detectFileSensitive);
  const showSnackbar = useAppStore((s) => s.showSnackbar);
  const loading = useAppStore((s) => s.loading);
  const setLoading = useAppStore((s) => s.setLoading);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      for (const file of acceptedFiles) {
        const fileType = detectFileType(file.name);
        if (fileType === FileType.UNKNOWN) {
          showSnackbar(`不支持的文件类型: ${file.name}`);
          continue;
        }

        const fileId = generateId();
        const uploadedFile: UploadedFile = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: fileType,
          uploadTime: new Date().toISOString(),
          content: null,
          isParsing: true,
          parseError: null,
          rawBuffer: null,
        };

        addFile(uploadedFile);
        setLoading(true);

        try {
          const buffer = await file.arrayBuffer();
          const content = await parseDocument(buffer, fileType);

          updateFileContent(fileId, content);
          setFileParsing(fileId, false);

          // 自动检测敏感信息
          detectFileSensitive(fileId);
          showSnackbar(`文件 "${file.name}" 解析完成`);
        } catch (err) {
          setFileParseError(fileId, (err as Error).message);
          setFileParsing(fileId, false);
          showSnackbar(`文件 "${file.name}" 解析失败: ${(err as Error).message}`);
        } finally {
          setLoading(false);
        }
      }
    },
    [addFile, updateFileContent, setFileParsing, setFileParseError, detectFileSensitive, showSnackbar, setLoading]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
    },
    multiple: true,
    disabled: loading,
  });

  return (
    <Paper
      {...getRootProps()}
      sx={{
        p: 3,
        textAlign: 'center',
        cursor: loading ? 'not-allowed' : 'pointer',
        border: '2px dashed',
        borderColor: isDragActive ? 'primary.main' : 'grey.300',
        bgcolor: isDragActive ? 'primary.50' : 'background.paper',
        transition: 'all 0.3s ease',
        opacity: loading ? 0.6 : 1,
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'primary.50',
        },
      }}
    >
      <input {...getInputProps()} />
      <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
      <Typography variant="h6" color="primary.main" gutterBottom>
        {isDragActive ? '释放文件以上传' : '拖拽文件到此处或点击上传'}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        支持 PDF、Word(.docx)、Excel(.xlsx) 格式，可批量上传
      </Typography>
      <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'center' }}>
        <Chip label="PDF" size="small" color="primary" variant="outlined" />
        <Chip label="Word" size="small" color="secondary" variant="outlined" />
        <Chip label="Excel" size="small" color="success" variant="outlined" />
      </Box>
    </Paper>
  );
};

export default FileUpload;
