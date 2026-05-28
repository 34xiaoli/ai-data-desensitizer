import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import { useAppStore } from '../store/useAppStore';
import { formatTimestamp, sensitiveTypeConfigs, generateLogCsv } from '../utils/helpers';
import { SensitiveType } from '../types';

const OperationLog: React.FC = () => {
  const operationLogs = useAppStore((s) => s.operationLogs);
  const showSnackbar = useAppStore((s) => s.showSnackbar);

  const [filterType, setFilterType] = useState<string>('all');
  const [filterFileId, setFilterFileId] = useState<string>('all');
  const [searchText, setSearchText] = useState('');

  const files = useAppStore((s) => s.files);

  /** 过滤日志 */
  const filteredLogs = useMemo(() => {
    let logs = [...operationLogs];

    if (filterType !== 'all') {
      logs = logs.filter((l) => l.operationType === filterType);
    }

    if (filterFileId !== 'all') {
      logs = logs.filter((l) => l.fileId === filterFileId);
    }

    if (searchText.trim()) {
      const lower = searchText.toLowerCase();
      logs = logs.filter(
        (l) =>
          l.originalContent.toLowerCase().includes(lower) ||
          l.resultContent.toLowerCase().includes(lower) ||
          l.ruleDescription.toLowerCase().includes(lower)
      );
    }

    // 按时间倒序
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return logs;
  }, [operationLogs, filterType, filterFileId, searchText]);

  /** 导出日志为 CSV */
  function handleExportCsv() {
    if (filteredLogs.length === 0) {
      showSnackbar('没有可导出的日志');
      return;
    }
    const csv = generateLogCsv(filteredLogs);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `操作日志_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSnackbar('日志已导出');
  }

  /** 获取操作类型标签 */
  function getOperationLabel(type: string): string {
    const map: Record<string, string> = {
      DESENSITIZE: '脱敏',
      UNDO_DESENSITIZE: '撤销脱敏',
      IGNORE: '忽略',
      UNIGNORE: '取消忽略',
      EDIT: '编辑',
      AUTO_DESENSITIZE: '自动脱敏',
      BATCH_DESENSITIZE: '批量脱敏',
    };
    return map[type] || type;
  }

  /** 获取操作类型颜色 */
  function getOperationColor(type: string): 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info' {
    const map: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'> = {
      DESENSITIZE: 'success',
      UNDO_DESENSITIZE: 'warning',
      IGNORE: 'default',
      UNIGNORE: 'info',
      EDIT: 'primary',
      AUTO_DESENSITIZE: 'success',
      BATCH_DESENSITIZE: 'success',
    };
    return map[type] || 'default';
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          操作日志
        </Typography>
        <Button
          size="small"
          startIcon={<FileDownloadIcon />}
          onClick={handleExportCsv}
          disabled={filteredLogs.length === 0}
        >
          导出 CSV
        </Button>
      </Box>

      {/* 筛选器 */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>操作类型</InputLabel>
          <Select
            value={filterType}
            label="操作类型"
            onChange={(e) => setFilterType(e.target.value)}
          >
            <MenuItem value="all">全部</MenuItem>
            <MenuItem value="DESENSITIZE">脱敏</MenuItem>
            <MenuItem value="UNDO_DESENSITIZE">撤销脱敏</MenuItem>
            <MenuItem value="AUTO_DESENSITIZE">自动脱敏</MenuItem>
            <MenuItem value="BATCH_DESENSITIZE">批量脱敏</MenuItem>
            <MenuItem value="IGNORE">忽略</MenuItem>
            <MenuItem value="UNIGNORE">取消忽略</MenuItem>
            <MenuItem value="EDIT">编辑</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>文件</InputLabel>
          <Select
            value={filterFileId}
            label="文件"
            onChange={(e) => setFilterFileId(e.target.value)}
          >
            <MenuItem value="all">全部文件</MenuItem>
            {files.map((f) => (
              <MenuItem key={f.id} value={f.id}>
                {f.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder="搜索日志..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 150 }}
        />
      </Box>

      {/* 日志表格 */}
      {filteredLogs.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
          暂无操作日志
        </Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ minWidth: 140 }}>时间</TableCell>
                <TableCell sx={{ minWidth: 80 }}>操作</TableCell>
                <TableCell sx={{ minWidth: 80 }}>类型</TableCell>
                <TableCell sx={{ minWidth: 100 }}>原始内容</TableCell>
                <TableCell sx={{ minWidth: 100 }}>结果内容</TableCell>
                <TableCell sx={{ minWidth: 80 }}>规则</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLogs.map((log) => (
                <TableRow key={log.id} hover>
                  <TableCell>
                    <Typography variant="caption">
                      {formatTimestamp(log.timestamp)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getOperationLabel(log.operationType)}
                      size="small"
                      color={getOperationColor(log.operationType)}
                      sx={{ fontSize: '0.65rem', height: 20 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {sensitiveTypeConfigs[log.targetType]?.label || log.targetType}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        maxWidth: 100,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {log.originalContent}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="caption"
                      sx={{
                        maxWidth: 100,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        display: 'block',
                      }}
                    >
                      {log.resultContent}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{log.ruleDescription}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
};

export default OperationLog;
