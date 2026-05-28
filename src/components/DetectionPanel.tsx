import React, { useMemo } from 'react';
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
  LinearProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useAppStore } from '../store/useAppStore';
import { getSensitiveStats } from '../engine/detector';
import { sensitiveTypeConfigs } from '../utils/helpers';
import { SensitiveType } from '../types';

const DetectionPanel: React.FC = () => {
  const selectedFileId = useAppStore((s) => s.selectedFileId);
  const sensitiveItemsMap = useAppStore((s) => s.sensitiveItemsMap);
  const batchDesensitizeType = useAppStore((s) => s.batchDesensitizeType);
  const batchUndoDesensitizeByType = useAppStore((s) => s.batchUndoDesensitizeByType);
  const showSnackbar = useAppStore((s) => s.showSnackbar);

  const items = selectedFileId ? sensitiveItemsMap[selectedFileId] || [] : [];
  const stats = useMemo(() => getSensitiveStats(items), [items]);

  const totalItems = items.length;
  const desensitizedItems = items.filter((i) => i.isDesensitized).length;
  const progressPercent = totalItems > 0 ? (desensitizedItems / totalItems) * 100 : 0;

  const typeEntries = Object.entries(stats).filter(
    ([, val]) => val.total > 0
  ) as [SensitiveType, { total: number; desensitized: number; ignored: number }][];

  function handleBatchDesensitize(type: SensitiveType) {
    if (selectedFileId) {
      batchDesensitizeType(selectedFileId, type);
      const config = sensitiveTypeConfigs[type];
      showSnackbar(`已批量脱敏所有${config.label}`);
    }
  }

  function handleBatchUndoDesensitize(type: SensitiveType) {
    if (selectedFileId) {
      batchUndoDesensitizeByType(selectedFileId, type);
      const config = sensitiveTypeConfigs[type];
      showSnackbar(`已批量取消脱敏所有${config.label}`);
    }
  }

  if (!selectedFileId) {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          请选择文件以查看检测结果
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
        识别结果统计
      </Typography>

      {/* 总体进度 */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography variant="body2">脱敏进度</Typography>
          <Typography variant="body2" color="text.secondary">
            {desensitizedItems} / {totalItems}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressPercent}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {/* 分类统计表 */}
      {typeEntries.length > 0 ? (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>类型</TableCell>
                <TableCell align="center">总数</TableCell>
                <TableCell align="center">已脱敏</TableCell>
                <TableCell align="center">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {typeEntries.map(([type, val]) => {
                const config = sensitiveTypeConfigs[type];
                return (
                  <TableRow key={type}>
                    <TableCell>
                      <Chip
                        label={config.label}
                        size="small"
                        sx={{
                          bgcolor: config.bgColor,
                          color: config.color,
                          borderColor: config.borderColor,
                          border: '1px solid',
                          fontSize: '0.7rem',
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {val.total}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="body2" color={val.desensitized === val.total ? 'success.main' : 'text.primary'}>
                        {val.desensitized}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      {val.desensitized < val.total && (
                        <Tooltip title={`批量脱敏所有${config.label}`}>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleBatchDesensitize(type)}
                          >
                            <LockIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      {val.desensitized > 0 && (
                        <Tooltip title={`批量取消脱敏所有${config.label}`}>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleBatchUndoDesensitize(type)}
                          >
                            <LockOpenIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          {totalItems === 0 ? '未检测到敏感信息' : ''}
        </Typography>
      )}
    </Box>
  );
};

export default DetectionPanel;
