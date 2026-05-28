import React, { useState } from 'react';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Button,
  ButtonGroup,
  Tooltip,
  Divider,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Snackbar,
  Alert,
} from '@mui/material';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DownloadIcon from '@mui/icons-material/Download';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import TableChartIcon from '@mui/icons-material/TableChart';
import CodeIcon from '@mui/icons-material/Code';
import DescriptionIcon from '@mui/icons-material/Description';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useAppStore } from '../store/useAppStore';
import {
  generateDesensitizedText,
  exportExcelBuffer,
  generateDesensitizedMarkdown,
} from '../engine/desensitizer';
import { DesensitizeMode, CompareMode, FileType } from '../types';
import { sensitiveTypeConfigs } from '../utils/helpers';

/** 导出格式选项 */
interface ExportOption {
  key: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  ext: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    key: 'txt',
    label: '纯文本',
    icon: <TextSnippetIcon fontSize="small" />,
    description: '脱敏后纯文本内容',
    ext: '.txt',
  },
  {
    key: 'xlsx',
    label: 'Excel 表格',
    icon: <TableChartIcon fontSize="small" />,
    description: '保留表格结构的脱敏文件',
    ext: '.xlsx',
  },
  {
    key: 'md',
    label: 'Markdown',
    icon: <DescriptionIcon fontSize="small" />,
    description: '含脱敏统计的 Markdown 文档',
    ext: '.md',
  },
  {
    key: 'json',
    label: 'JSON',
    icon: <CodeIcon fontSize="small" />,
    description: '结构化数据（含敏感项详情）',
    ext: '.json',
  },
  {
    key: 'report',
    label: '脱敏报告',
    icon: <AssessmentIcon fontSize="small" />,
    description: '仅脱敏统计摘要',
    ext: '.json',
  },
];

const DesensitizeToolbar: React.FC = () => {
  const selectedFileId = useAppStore((s) => s.selectedFileId);
  const desensitizeMode = useAppStore((s) => s.desensitizeMode);
  const setDesensitizeMode = useAppStore((s) => s.setDesensitizeMode);
  const compareMode = useAppStore((s) => s.compareMode);
  const setCompareMode = useAppStore((s) => s.setCompareMode);
  const autoDesensitizeAll = useAppStore((s) => s.autoDesensitizeAll);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const undoStack = useAppStore((s) => s.undoStack);
  const redoStack = useAppStore((s) => s.redoStack);
  const undoAllDesensitize = useAppStore((s) => s.undoAllDesensitize);
  const showSnackbar = useAppStore((s) => s.showSnackbar);
  const sensitiveItemsMap = useAppStore((s) => s.sensitiveItemsMap);
  const files = useAppStore((s) => s.files);

  const [downloadAnchor, setDownloadAnchor] = useState<null | HTMLElement>(null);
  const [downloading, setDownloading] = useState(false);

  const file = files.find((f) => f.id === selectedFileId);
  const items = selectedFileId ? sensitiveItemsMap[selectedFileId] || [] : [];
  const hasUndetected = items.some((i) => !i.isDesensitized && !i.isIgnored);
  const hasDesensitized = items.some((i) => i.isDesensitized);

  /** 判断当前文件是否支持 Excel 导出 */
  const isExcelFile = file?.type === FileType.EXCEL;

  function handleAutoDesensitize() {
    if (!selectedFileId) {
      showSnackbar('请先选择文件');
      return;
    }
    autoDesensitizeAll(selectedFileId);
    showSnackbar('自动脱敏完成');
  }

  function handleUndoAllDesensitize() {
    if (!selectedFileId) {
      showSnackbar('请先选择文件');
      return;
    }
    undoAllDesensitize(selectedFileId);
    showSnackbar('已取消全部脱敏，恢复原文');
  }

  /** 打开下载菜单 */
  function handleDownloadClick(e: React.MouseEvent<HTMLElement>) {
    setDownloadAnchor(e.currentTarget);
  }

  /** 执行下载 */
  async function handleDownload(formatKey: string) {
    setDownloadAnchor(null);
    if (!file || !file.content) {
      showSnackbar('请先选择已解析的文件');
      return;
    }

    setDownloading(true);
    // 微延迟让 UI 更新
    await new Promise((r) => setTimeout(r, 100));

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      const option = EXPORT_OPTIONS.find((o) => o.key === formatKey);

      switch (formatKey) {
        case 'txt': {
          const text = generateDesensitizedText(file.content.plainText, items);
          downloadBlob(
            new Blob([text], { type: 'text/plain;charset=utf-8' }),
            `${baseName}_脱敏.txt`
          );
          break;
        }
        case 'xlsx': {
          if (!file.content.excelSheets) {
            showSnackbar('当前文件不是 Excel 格式，无法导出 XLSX');
            setDownloading(false);
            return;
          }
          const buffer = exportExcelBuffer(file.content.excelSheets, items);
          downloadBlob(
            new Blob([buffer], {
              type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            }),
            `${baseName}_脱敏.xlsx`
          );
          break;
        }
        case 'md': {
          const text = generateDesensitizedText(file.content.plainText, items);
          const md = generateDesensitizedMarkdown(file.name, text, items);
          downloadBlob(
            new Blob([md], { type: 'text/markdown;charset=utf-8' }),
            `${baseName}_脱敏.md`
          );
          break;
        }
        case 'json': {
          const text = generateDesensitizedText(file.content.plainText, items);
          const jsonData = {
            fileName: file.name,
            fileType: file.type,
            desensitizedText: text,
            sensitiveItems: items.map((i) => ({
              type: i.type,
              typeLabel: sensitiveTypeConfigs[i.type].label,
              originalText: i.isDesensitized || i.isIgnored ? i.originalText : '[未脱敏]',
              desensitizedText: i.desensitizedText,
              isDesensitized: i.isDesensitized,
              isIgnored: i.isIgnored,
            })),
            exportTime: new Date().toISOString(),
          };
          downloadBlob(
            new Blob([JSON.stringify(jsonData, null, 2)], {
              type: 'application/json;charset=utf-8',
            }),
            `${baseName}_脱敏.json`
          );
          break;
        }
        case 'report': {
          const byType: Record<string, { total: number; desensitized: number }> = {};
          for (const item of items) {
            if (!byType[item.type]) byType[item.type] = { total: 0, desensitized: 0 };
            byType[item.type].total += 1;
            if (item.isDesensitized) byType[item.type].desensitized += 1;
          }
          const report = {
            fileName: file.name,
            totalSensitiveItems: items.length,
            desensitizedItems: items.filter((i) => i.isDesensitized).length,
            ignoredItems: items.filter((i) => i.isIgnored).length,
            byType,
            exportTime: new Date().toISOString(),
          };
          downloadBlob(
            new Blob([JSON.stringify(report, null, 2)], {
              type: 'application/json;charset=utf-8',
            }),
            `${baseName}_脱敏报告.json`
          );
          break;
        }
      }

      showSnackbar(`✅ 已下载: ${baseName}_脱敏${option?.ext || '.txt'}`);
    } catch (err) {
      showSnackbar(`下载失败: ${(err as Error).message}`);
    } finally {
      setDownloading(false);
    }
  }

  /** 通用下载方法 */
  function downloadBlob(blob: Blob, fileName: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      {downloading && (
        <Box sx={{ width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
          <LinearProgress />
        </Box>
      )}

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 2,
          py: 1,
          bgcolor: 'background.paper',
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexWrap: 'wrap',
        }}
      >
        {/* 脱敏模式切换 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            脱敏模式:
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={desensitizeMode}
            exclusive
            onChange={(_, val) => val && setDesensitizeMode(val)}
          >
            <ToggleButton value={DesensitizeMode.AUTO} sx={{ px: 1.5 }}>
              <AutoFixHighIcon sx={{ mr: 0.5, fontSize: 16 }} />
              自动
            </ToggleButton>
            <ToggleButton value={DesensitizeMode.MANUAL} sx={{ px: 1.5 }}>
              <TouchAppIcon sx={{ mr: 0.5, fontSize: 16 }} />
              手动
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Divider orientation="vertical" flexItem />

        {/* 一键脱敏按钮 */}
        {desensitizeMode === DesensitizeMode.AUTO && (
          <Button
            variant="contained"
            size="small"
            startIcon={<AutoFixHighIcon />}
            onClick={handleAutoDesensitize}
            disabled={!selectedFileId || !hasUndetected}
            sx={{ bgcolor: '#334e68' }}
          >
            一键脱敏
          </Button>
        )}

        {/* 撤销/重做 */}
        <ButtonGroup size="small" variant="outlined">
          <Tooltip title="撤销">
            <span>
              <Button
                onClick={undo}
                disabled={undoStack.length === 0}
                startIcon={<UndoIcon />}
              >
                撤销
              </Button>
            </span>
          </Tooltip>
          <Tooltip title="重做">
            <span>
              <Button
                onClick={redo}
                disabled={redoStack.length === 0}
                startIcon={<RedoIcon />}
              >
                重做
              </Button>
            </span>
          </Tooltip>
        </ButtonGroup>

        {/* 取消全部脱敏 */}
        {hasDesensitized && (
          <Tooltip title="取消全部脱敏，恢复所有原文">
            <Button
              variant="outlined"
              size="small"
              color="success"
              startIcon={<LockOpenIcon />}
              onClick={handleUndoAllDesensitize}
            >
              全部取消脱敏
            </Button>
          </Tooltip>
        )}

        <Divider orientation="vertical" flexItem />

        {/* 视图切换 */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            视图:
          </Typography>
          <ToggleButtonGroup
            size="small"
            value={compareMode}
            exclusive
            onChange={(_, val) => val && setCompareMode(val)}
          >
            <ToggleButton value={CompareMode.SPLIT} sx={{ px: 1.5 }}>
              <CompareArrowsIcon sx={{ mr: 0.5, fontSize: 16 }} />
              对比
            </ToggleButton>
            <ToggleButton value={CompareMode.SINGLE} sx={{ px: 1.5 }}>
              单栏
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>

        <Box sx={{ flex: 1 }} />

        {/* 统一下载按钮 */}
        <Button
          variant="contained"
          size="small"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadClick}
          disabled={!selectedFileId || downloading}
          sx={{ bgcolor: '#334e68', '&:hover': { bgcolor: '#273d52' } }}
        >
          下载脱敏文件
        </Button>

        {/* 状态指示 */}
        {selectedFileId && items.length > 0 && (
          <Chip
            label={`${items.filter((i) => i.isDesensitized).length}/${items.length} 已脱敏`}
            size="small"
            color={
              items.every((i) => i.isDesensitized || i.isIgnored)
                ? 'success'
                : 'warning'
            }
            variant="outlined"
          />
        )}
      </Box>

      {/* 下载格式选择菜单 */}
      <Menu
        anchorEl={downloadAnchor}
        open={Boolean(downloadAnchor)}
        onClose={() => setDownloadAnchor(null)}
        PaperProps={{
          sx: { minWidth: 280 },
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5 }}>
          选择下载格式
        </Typography>
        {EXPORT_OPTIONS.filter((o) => {
          // 非 Excel 文件隐藏 XLSX 选项
          if (o.key === 'xlsx' && !isExcelFile) return false;
          return true;
        }).map((option) => (
          <MenuItem
            key={option.key}
            onClick={() => handleDownload(option.key)}
            sx={{ py: 1 }}
          >
            <ListItemIcon sx={{ minWidth: 36 }}>{option.icon}</ListItemIcon>
            <ListItemText
              primary={option.label + option.ext}
              secondary={option.description}
              primaryTypographyProps={{ fontSize: 14 }}
              secondaryTypographyProps={{ fontSize: 11 }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default DesensitizeToolbar;
