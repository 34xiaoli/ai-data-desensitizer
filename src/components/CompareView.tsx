import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  ToggleButtonGroup,
  ToggleButton,
  Chip,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
} from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import DownloadIcon from '@mui/icons-material/Download';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import TableChartIcon from '@mui/icons-material/TableChart';
import DescriptionIcon from '@mui/icons-material/Description';
import CodeIcon from '@mui/icons-material/Code';
import AssessmentIcon from '@mui/icons-material/Assessment';
import { useAppStore } from '../store/useAppStore';
import { splitTextBySensitiveItems, sensitiveTypeConfigs } from '../utils/helpers';
import {
  generateDesensitizedText,
  exportExcelBuffer,
  generateDesensitizedMarkdown,
} from '../engine/desensitizer';
import { SensitiveType, CompareMode, FileType } from '../types';

const CompareView: React.FC = () => {
  const selectedFileId = useAppStore((s) => s.selectedFileId);
  const files = useAppStore((s) => s.files);
  const sensitiveItemsMap = useAppStore((s) => s.sensitiveItemsMap);
  const compareMode = useAppStore((s) => s.compareMode);
  const setCompareMode = useAppStore((s) => s.setCompareMode);
  const showSnackbar = useAppStore((s) => s.showSnackbar);

  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const isSyncing = React.useRef(false);

  const [downloadAnchor, setDownloadAnchor] = useState<null | HTMLElement>(null);
  const [downloading, setDownloading] = useState(false);

  const file = files.find((f) => f.id === selectedFileId);
  const items = selectedFileId ? sensitiveItemsMap[selectedFileId] || [] : [];
  const isExcelFile = file?.type === FileType.EXCEL;

  /** 生成脱敏后的文本 */
  const desensitizedText = useMemo(() => {
    if (!file || !file.content) return '';
    return generateDesensitizedText(file.content.plainText, items);
  }, [file, items]);

  /** 下载 Blob */
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

  /** 执行下载 */
  async function handleDownload(formatKey: string) {
    setDownloadAnchor(null);
    if (!file || !file.content) return;
    setDownloading(true);
    await new Promise((r) => setTimeout(r, 50));

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '');
      switch (formatKey) {
        case 'txt': {
          const text = generateDesensitizedText(file.content.plainText, items);
          downloadBlob(new Blob([text], { type: 'text/plain;charset=utf-8' }), `${baseName}_脱敏.txt`);
          break;
        }
        case 'xlsx': {
          if (!file.content.excelSheets) { showSnackbar('非 Excel 文件'); setDownloading(false); return; }
          const buffer = exportExcelBuffer(file.content.excelSheets, items);
          downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${baseName}_脱敏.xlsx`);
          break;
        }
        case 'md': {
          const text = generateDesensitizedText(file.content.plainText, items);
          const md = generateDesensitizedMarkdown(file.name, text, items);
          downloadBlob(new Blob([md], { type: 'text/markdown;charset=utf-8' }), `${baseName}_脱敏.md`);
          break;
        }
        case 'json': {
          const text = generateDesensitizedText(file.content.plainText, items);
          downloadBlob(new Blob([JSON.stringify({ fileName: file.name, desensitizedText: text, sensitiveItems: items }, null, 2)], { type: 'application/json;charset=utf-8' }), `${baseName}_脱敏.json`);
          break;
        }
      }
      showSnackbar(`✅ 已下载脱敏文件`);
    } catch (err) {
      showSnackbar(`下载失败: ${(err as Error).message}`);
    } finally {
      setDownloading(false);
    }
  }

  /** 同步滚动 */
  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;
    if (!left || !right) return;

    const handleLeftScroll = () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      right.scrollTop = left.scrollTop;
      isSyncing.current = false;
    };

    const handleRightScroll = () => {
      if (isSyncing.current) return;
      isSyncing.current = true;
      left.scrollTop = right.scrollTop;
      isSyncing.current = false;
    };

    left.addEventListener('scroll', handleLeftScroll);
    right.addEventListener('scroll', handleRightScroll);

    return () => {
      left.removeEventListener('scroll', handleLeftScroll);
      right.removeEventListener('scroll', handleRightScroll);
    };
  }, []);

  /** 渲染带高亮的原文 */
  const renderOriginalContent = useMemo(() => {
    if (!file || !file.content) return null;
    const segments = splitTextBySensitiveItems(file.content.plainText, items);
    return segments.map((seg, idx) => {
      if (!seg.isSensitive) {
        return <span key={idx}>{seg.text}</span>;
      }
      const config = sensitiveTypeConfigs[seg.sensitiveType || SensitiveType.CUSTOM];
      return (
        <span
          key={idx}
          className={`sensitive-highlight ${config.cssClass}`}
        >
          {seg.text}
        </span>
      );
    });
  }, [file, items]);

  /** 渲染脱敏后内容，标记脱敏区域 */
  const renderDesensitizedContent = useMemo(() => {
    if (!file || !file.content) return null;
    const segments = splitTextBySensitiveItems(file.content.plainText, items);
    return segments.map((seg, idx) => {
      if (!seg.isSensitive) {
        return <span key={idx}>{seg.text}</span>;
      }
      if (seg.isDesensitized) {
        return (
          <span key={idx} className="desensitized-mark">
            <span className="replacement">{seg.desensitizedText}</span>
          </span>
        );
      }
      // 未脱敏的保持原样
      const config = sensitiveTypeConfigs[seg.sensitiveType || SensitiveType.CUSTOM];
      return (
        <span
          key={idx}
          className={`sensitive-highlight ${config.cssClass}`}
        >
          {seg.text}
        </span>
      );
    });
  }, [file, items]);

  if (!file || !file.content) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
        <Typography variant="h6" color="text.secondary">
          请选择文件以查看对比
        </Typography>
      </Box>
    );
  }

  if (compareMode === CompareMode.SINGLE) {
    return (
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {downloading && <LinearProgress />}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            脱敏预览 - {file.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Button
              variant="contained"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={(e) => setDownloadAnchor(e.currentTarget)}
              disabled={downloading}
              sx={{ bgcolor: '#334e68', fontSize: 12 }}
            >
              下载
            </Button>
            <ToggleButtonGroup
              size="small"
              value={compareMode}
              exclusive
              onChange={(_, val) => val && setCompareMode(val)}
            >
              <ToggleButton value={CompareMode.SPLIT}>
                <ViewColumnIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value={CompareMode.SINGLE}>
                <ViewAgendaIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Box>
        <Paper sx={{ flex: 1, overflow: 'auto', p: 2 }} className="document-content">
          {renderDesensitizedContent}
        </Paper>
        {renderDownloadMenu()}
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {downloading && <LinearProgress />}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, px: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          对比视图 - {file.name}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<DownloadIcon />}
            onClick={(e) => setDownloadAnchor(e.currentTarget)}
            disabled={downloading}
            sx={{ bgcolor: '#334e68', fontSize: 12 }}
          >
            下载
          </Button>
          <ToggleButtonGroup
            size="small"
            value={compareMode}
            exclusive
            onChange={(_, val) => val && setCompareMode(val)}
          >
            <ToggleButton value={CompareMode.SPLIT}>
              <ViewColumnIcon fontSize="small" />
            </ToggleButton>
            <ToggleButton value={CompareMode.SINGLE}>
              <ViewAgendaIcon fontSize="small" />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      <Box sx={{ flex: 1, display: 'flex', gap: 1, overflow: 'hidden' }}>
        {/* 左侧 - 原文 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="原文" size="small" color="default" />
          </Box>
          <Paper
            ref={leftRef}
            className="compare-pane"
            sx={{ flex: 1, p: 2, overflow: 'auto', bgcolor: '#fafafa' }}
          >
            <div className="document-content">{renderOriginalContent}</div>
          </Paper>
        </Box>

        {/* 右侧 - 脱敏后 */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip label="脱敏后" size="small" color="success" />
          </Box>
          <Paper
            ref={rightRef}
            className="compare-pane"
            sx={{ flex: 1, p: 2, overflow: 'auto', bgcolor: '#f1f8e9' }}
          >
            <div className="document-content">{renderDesensitizedContent}</div>
          </Paper>
        </Box>
      </Box>
      {renderDownloadMenu()}
    </Box>
  );

  /** 下载格式选择菜单 */
  function renderDownloadMenu() {
    const options = [
      { key: 'txt', label: '纯文本 .txt', icon: <TextSnippetIcon fontSize="small" />, desc: '脱敏后纯文本' },
      { key: 'xlsx', label: 'Excel 表格 .xlsx', icon: <TableChartIcon fontSize="small" />, desc: '保留表格结构' },
      { key: 'md', label: 'Markdown .md', icon: <DescriptionIcon fontSize="small" />, desc: '含脱敏统计' },
      { key: 'json', label: 'JSON .json', icon: <CodeIcon fontSize="small" />, desc: '结构化数据' },
      { key: 'report', label: '脱敏报告 .json', icon: <AssessmentIcon fontSize="small" />, desc: '仅统计摘要' },
    ].filter((o) => !(o.key === 'xlsx' && !isExcelFile));

    return (
      <Menu
        anchorEl={downloadAnchor}
        open={Boolean(downloadAnchor)}
        onClose={() => setDownloadAnchor(null)}
        PaperProps={{ sx: { minWidth: 260 } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5 }}>
          选择下载格式
        </Typography>
        {options.map((option) => (
          <MenuItem key={option.key} onClick={() => handleDownload(option.key)} sx={{ py: 1 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>{option.icon}</ListItemIcon>
            <ListItemText
              primary={option.label}
              secondary={option.desc}
              primaryTypographyProps={{ fontSize: 14 }}
              secondaryTypographyProps={{ fontSize: 11 }}
            />
          </MenuItem>
        ))}
      </Menu>
    );
  }
};

export default CompareView;
