import React, { useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { useAppStore } from '../store/useAppStore';
import { sensitiveTypeConfigs, formatFileSize } from '../utils/helpers';
import {
  generateDesensitizedText,
  exportExcelBuffer,
  generateDesensitizedMarkdown,
} from '../engine/desensitizer';
import { SensitiveType, DesensitizeReport, FileType } from '../types';

const ExportDialog: React.FC = () => {
  const exportDialogOpen = useAppStore((s) => s.exportDialogOpen);
  const setExportDialogOpen = useAppStore((s) => s.setExportDialogOpen);
  const selectedFileId = useAppStore((s) => s.selectedFileId);
  const files = useAppStore((s) => s.files);
  const sensitiveItemsMap = useAppStore((s) => s.sensitiveItemsMap);
  const showSnackbar = useAppStore((s) => s.showSnackbar);

  const [exportFormat, setExportFormat] = React.useState('txt');
  const [exportScope, setExportScope] = React.useState('current');

  const file = files.find((f) => f.id === selectedFileId);
  const items = selectedFileId ? sensitiveItemsMap[selectedFileId] || [] : [];
  const isExcelFile = file?.type === FileType.EXCEL;

  /** 生成脱敏报告 */
  const report: DesensitizeReport | null = useMemo(() => {
    if (!file) return null;
    const byType: Record<SensitiveType, { total: number; desensitized: number }> = {} as any;
    for (const type of Object.values(SensitiveType)) {
      byType[type] = { total: 0, desensitized: 0 };
    }
    for (const item of items) {
      byType[item.type].total += 1;
      if (item.isDesensitized) byType[item.type].desensitized += 1;
    }
    return {
      fileName: file.name,
      totalSensitiveItems: items.length,
      desensitizedItems: items.filter((i) => i.isDesensitized).length,
      ignoredItems: items.filter((i) => i.isIgnored).length,
      byType,
      exportTime: new Date().toISOString(),
    };
  }, [file, items]);

  /** 执行导出 */
  function handleExport() {
    if (exportScope === 'all') {
      handleBatchExport();
      return;
    }
    if (!file || !file.content) return;

    const desensitizedText = generateDesensitizedText(
      file.content.plainText,
      items
    );

    let blob: Blob;
    let fileName: string;
    const baseName = file.name.replace(/\.[^/.]+$/, '');

    switch (exportFormat) {
      case 'txt':
        blob = new Blob([desensitizedText], { type: 'text/plain;charset=utf-8' });
        fileName = `${baseName}_脱敏.txt`;
        break;

      case 'xlsx':
        if (!file.content.excelSheets) {
          showSnackbar('当前文件不是 Excel 格式，无法导出 XLSX');
          return;
        }
        const xlsxBuffer = exportExcelBuffer(file.content.excelSheets, items);
        blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        fileName = `${baseName}_脱敏.xlsx`;
        break;

      case 'md':
        blob = new Blob([generateDesensitizedMarkdown(file.name, desensitizedText, items)], { type: 'text/markdown;charset=utf-8' });
        fileName = `${baseName}_脱敏.md`;
        break;

      case 'json':
        const jsonData = {
          fileName: file.name,
          fileType: file.type,
          content: file.content,
          desensitizedText,
          sensitiveItems: items.map((i) => ({
            type: i.type,
            typeLabel: sensitiveTypeConfigs[i.type].label,
            originalText: i.isDesensitized || i.isIgnored ? i.originalText : '[未脱敏]',
            desensitizedText: i.desensitizedText,
            isDesensitized: i.isDesensitized,
            isIgnored: i.isIgnored,
          })),
          report,
        };
        blob = new Blob([JSON.stringify(jsonData, null, 2)], {
          type: 'application/json;charset=utf-8',
        });
        fileName = `${baseName}_脱敏.json`;
        break;

      case 'report':
        const reportText = JSON.stringify(report, null, 2);
        blob = new Blob([reportText], { type: 'application/json;charset=utf-8' });
        fileName = `${baseName}_脱敏报告.json`;
        break;

      default:
        // txt as default
        blob = new Blob([desensitizedText], { type: 'text/plain;charset=utf-8' });
        fileName = `${baseName}_脱敏.txt`;
    }

    // Download
    downloadBlob(blob, fileName);
    setExportDialogOpen(false);
    showSnackbar(`文件已导出: ${fileName}`);
  }

  /** 批量导出所有已处理文件 */
  function handleBatchExport() {
    const processedFiles = files.filter((f) => f.content && sensitiveItemsMap[f.id]?.length > 0);
    if (processedFiles.length === 0) {
      showSnackbar('没有已处理的文件可导出');
      return;
    }

    let exportCount = 0;
    for (const f of processedFiles) {
      const fItems = sensitiveItemsMap[f.id] || [];
      const desensitizedText = generateDesensitizedText(f.content!.plainText, fItems);
      const baseName = f.name.replace(/\.[^/.]+$/, '');
      let blob: Blob;
      let fileName: string;

      switch (exportFormat) {
        case 'txt':
          blob = new Blob([desensitizedText], { type: 'text/plain;charset=utf-8' });
          fileName = `${baseName}_脱敏.txt`;
          break;
        case 'xlsx':
          if (f.content!.excelSheets) {
            const buf = exportExcelBuffer(f.content!.excelSheets, fItems);
            blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          } else {
            blob = new Blob([desensitizedText], { type: 'text/plain;charset=utf-8' });
          }
          fileName = `${baseName}_脱敏.xlsx`;
          break;
        case 'md':
          blob = new Blob([generateDesensitizedMarkdown(f.name, desensitizedText, fItems)], { type: 'text/markdown;charset=utf-8' });
          fileName = `${baseName}_脱敏.md`;
          break;
        case 'json':
          blob = new Blob([JSON.stringify({ fileName: f.name, desensitizedText, sensitiveItems: fItems }, null, 2)], { type: 'application/json;charset=utf-8' });
          fileName = `${baseName}_脱敏.json`;
          break;
        default:
          blob = new Blob([desensitizedText], { type: 'text/plain;charset=utf-8' });
          fileName = `${baseName}_脱敏.txt`;
      }

      downloadBlob(blob, fileName);
      exportCount++;
    }

    setExportDialogOpen(false);
    showSnackbar(`已批量导出 ${exportCount} 个文件`);
  }

  /** 通用下载方法 */
  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog
      open={exportDialogOpen}
      onClose={() => setExportDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>导出文档</DialogTitle>
      <DialogContent>
        {file && report && (
          <>
            {/* 导出格式选择 */}
            <FormControl fullWidth size="small" sx={{ mb: 2, mt: 1 }}>
              <InputLabel>导出格式</InputLabel>
              <Select
                value={exportFormat}
                label="导出格式"
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <MenuItem value="txt">纯文本 (TXT)</MenuItem>
                {isExcelFile && <MenuItem value="xlsx">Excel 表格 (XLSX)</MenuItem>}
                <MenuItem value="md">Markdown 文档 (MD)</MenuItem>
                <MenuItem value="json">JSON 结构化数据</MenuItem>
                <MenuItem value="report">脱敏报告 (JSON)</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>导出范围</InputLabel>
              <Select
                value={exportScope}
                label="导出范围"
                onChange={(e) => setExportScope(e.target.value)}
              >
                <MenuItem value="current">当前文件</MenuItem>
                <MenuItem value="all">所有已处理文件</MenuItem>
              </Select>
            </FormControl>

            {/* 脱敏报告预览 */}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              脱敏报告摘要
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell>文件名</TableCell>
                    <TableCell>{file.name}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>敏感信息总数</TableCell>
                    <TableCell>{report.totalSensitiveItems}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>已脱敏</TableCell>
                    <TableCell sx={{ color: 'success.main' }}>
                      {report.desensitizedItems}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>已忽略</TableCell>
                    <TableCell>{report.ignoredItems}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>

            {/* 各类型统计 */}
            <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
              各类型脱敏统计
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>类型</TableCell>
                    <TableCell align="center">总数</TableCell>
                    <TableCell align="center">已脱敏</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(report.byType)
                    .filter(([, val]) => val.total > 0)
                    .map(([type, val]) => (
                      <TableRow key={type}>
                        <TableCell>
                          {sensitiveTypeConfigs[type as SensitiveType].label}
                        </TableCell>
                        <TableCell align="center">{val.total}</TableCell>
                        <TableCell align="center">{val.desensitized}</TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setExportDialogOpen(false)}>取消</Button>
        <Button variant="contained" onClick={handleExport} sx={{ bgcolor: '#334e68' }}>
          导出
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog;
