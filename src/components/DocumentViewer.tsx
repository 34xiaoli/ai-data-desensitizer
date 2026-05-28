import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import UndoIcon from '@mui/icons-material/Undo';
import RestoreIcon from '@mui/icons-material/Restore';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import EditIcon from '@mui/icons-material/Edit';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import { useAppStore } from '../store/useAppStore';
import { splitTextBySensitiveItems, sensitiveTypeConfigs } from '../utils/helpers';
import { SensitiveType, FileType } from '../types';

const DocumentViewer: React.FC = () => {
  const selectedFileId = useAppStore((s) => s.selectedFileId);
  const files = useAppStore((s) => s.files);
  const sensitiveItemsMap = useAppStore((s) => s.sensitiveItemsMap);
  const desensitizeSingle = useAppStore((s) => s.desensitizeSingle);
  const undoDesensitize = useAppStore((s) => s.undoDesensitize);
  const ignoreItem = useAppStore((s) => s.ignoreItem);
  const unignoreItem = useAppStore((s) => s.unignoreItem);
  const contextMenu = useAppStore((s) => s.contextMenu);
  const setContextMenu = useAppStore((s) => s.setContextMenu);
  const editItemText = useAppStore((s) => s.editItemText);

  const file = files.find((f) => f.id === selectedFileId);
  const items = selectedFileId ? sensitiveItemsMap[selectedFileId] || [] : [];

  const [editDialogId, setEditDialogId] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState('');

  /** 根据文件类型渲染文档内容 */
  const renderedContent = useMemo(() => {
    if (!file || !file.content) return null;

    const { content } = file;
    const plainText = content.plainText;
    const segments = splitTextBySensitiveItems(plainText, items);

    if (content.fileType === FileType.PDF && content.pdfPages) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            PDF 文档内容（共 {content.pdfPages.length} 页）
          </Typography>
          {content.pdfPages.map((page) => {
            const pageOffset = content.pdfPages!
              .slice(0, page.pageIndex - 1)
              .reduce((acc, p) => acc + p.text.length + 1, 0);
            const pageEndOffset = pageOffset + page.text.length;
            const pageItems = items.filter(
              (i) => i.startIndex >= pageOffset && i.startIndex < pageEndOffset
            );
            const pageSegments = splitTextBySensitiveItems(page.text, pageItems);

            return (
              <Paper key={page.pageIndex} sx={{ p: 2, mb: 2 }} elevation={0} className="document-content">
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  第 {page.pageIndex} 页
                </Typography>
                {renderSegments(pageSegments)}
              </Paper>
            );
          })}
        </Box>
      );
    }

    if (content.fileType === FileType.WORD && content.wordParagraphs) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Word 文档内容
          </Typography>
          {content.wordParagraphs.map((para) => {
            const paraOffset = content.wordParagraphs!
              .slice(0, para.paragraphIndex)
              .reduce((acc, p) => acc + p.text.length + 1, 0);
            const paraEndOffset = paraOffset + para.text.length;
            const paraItems = items.filter(
              (i) => i.startIndex >= paraOffset && i.startIndex < paraEndOffset
            );
            const paraSegments = splitTextBySensitiveItems(para.text, paraItems);

            return (
              <Typography
                key={para.paragraphIndex}
                component="div"
                sx={{ mb: 1, lineHeight: 2 }}
                className="document-content"
              >
                {renderSegments(paraSegments)}
              </Typography>
            );
          })}
        </Box>
      );
    }

    if (content.fileType === FileType.EXCEL && content.excelSheets) {
      return (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
            Excel 文档内容
          </Typography>
          {content.excelSheets.map((sheet, sheetIdx) => (
            <Paper key={sheetIdx} sx={{ p: 2, mb: 2 }} elevation={0}>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                工作表: {sheet.sheetName}
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <tbody>
                    {renderExcelSheet(sheet.cells)}
                  </tbody>
                </table>
              </Box>
            </Paper>
          ))}
        </Box>
      );
    }

    // 降级：纯文本
    return (
      <Box className="document-content">
        {renderSegments(segments)}
      </Box>
    );
  }, [file, items]);

  /** 渲染文本片段 */
  function renderSegments(segments: ReturnType<typeof splitTextBySensitiveItems>) {
    return segments.map((seg, idx) => {
      if (!seg.isSensitive) {
        return <span key={idx}>{seg.text}</span>;
      }

      const config = sensitiveTypeConfigs[seg.sensitiveType || SensitiveType.CUSTOM];

      if (seg.isDesensitized) {
        return (
          <Tooltip
            key={idx}
            title={`原文: ${seg.text} | 点击取消脱敏`}
            arrow
          >
            <span
              className="desensitized-mark interactive-restore"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (seg.sensitiveItemId && selectedFileId) {
                  undoDesensitize(selectedFileId, seg.sensitiveItemId);
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              <span className="replacement">{seg.desensitizedText}</span>
              <RestoreIcon sx={{ fontSize: 12, ml: 0.3, verticalAlign: 'middle', color: '#90a4ae', opacity: 0, transition: 'opacity 0.2s' }} className="restore-icon" />
            </span>
          </Tooltip>
        );
      }

      return (
        <Tooltip
          key={idx}
          title={`${config.label} | 点击操作`}
          arrow
        >
          <span
            className={`sensitive-highlight ${config.cssClass}`}
            onClick={(e) => handleContextMenu(e, seg.sensitiveItemId!)}
            style={{ cursor: 'pointer' }}
          >
            {seg.text}
          </span>
        </Tooltip>
      );
    });
  }

  /** 渲染 Excel 工作表 */
  function renderExcelSheet(cells: import('../types').ExcelCell[]) {
    if (cells.length === 0) return null;

    const maxRow = Math.max(...cells.map((c) => c.row));
    const maxCol = Math.max(...cells.map((c) => c.col));
    const cellMap = new Map<string, string>();
    cells.forEach((c) => cellMap.set(`${c.row}-${c.col}`, c.value));

    const rows: React.ReactElement[] = [];
    for (let r = 0; r <= maxRow; r++) {
      const cols: React.ReactElement[] = [];
      for (let c = 0; c <= maxCol; c++) {
        const value = cellMap.get(`${r}-${c}`) || '';
        cols.push(
          <td
            key={c}
            style={{
              border: '1px solid #e0e0e0',
              padding: '4px 8px',
              fontSize: '13px',
              minWidth: '60px',
            }}
          >
            {value}
          </td>
        );
      }
      rows.push(<tr key={r}>{cols}</tr>);
    }
    return rows;
  }

  /** 处理右键/点击菜单 */
  function handleContextMenu(e: React.MouseEvent, itemId: string) {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      open: true,
      x: e.clientX,
      y: e.clientY,
      sensitiveItemId: itemId,
      fileId: selectedFileId!,
    });
  }

  function handleMenuClose() {
    setContextMenu({ open: false, x: 0, y: 0, sensitiveItemId: null, fileId: null });
  }

  function handleDesensitize() {
    if (contextMenu.fileId && contextMenu.sensitiveItemId) {
      desensitizeSingle(contextMenu.fileId, contextMenu.sensitiveItemId);
    }
    handleMenuClose();
  }

  function handleUndo() {
    if (contextMenu.fileId && contextMenu.sensitiveItemId) {
      undoDesensitize(contextMenu.fileId, contextMenu.sensitiveItemId);
    }
    handleMenuClose();
  }

  function handleIgnore() {
    if (contextMenu.fileId && contextMenu.sensitiveItemId) {
      ignoreItem(contextMenu.fileId, contextMenu.sensitiveItemId);
    }
    handleMenuClose();
  }

  function handleUnignore() {
    if (contextMenu.fileId && contextMenu.sensitiveItemId) {
      unignoreItem(contextMenu.fileId, contextMenu.sensitiveItemId);
    }
    handleMenuClose();
  }

  function handleEditStart() {
    if (contextMenu.sensitiveItemId) {
      const item = items.find((i) => i.id === contextMenu.sensitiveItemId);
      if (item) {
        setEditText(item.desensitizedText || item.originalText);
        setEditDialogId(contextMenu.sensitiveItemId);
      }
    }
    handleMenuClose();
  }

  function handleEditConfirm() {
    if (editDialogId && selectedFileId) {
      editItemText(selectedFileId, editDialogId, editText);
    }
    setEditDialogId(null);
    setEditText('');
  }

  const selectedItem = contextMenu.sensitiveItemId
    ? items.find((i) => i.id === contextMenu.sensitiveItemId)
    : null;

  if (!file) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
        <Typography variant="h6" color="text.secondary">
          请选择或上传文件以查看内容
        </Typography>
      </Box>
    );
  }

  if (file.isParsing) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
        <Typography variant="h6" color="text.secondary">
          正在解析文档...
        </Typography>
      </Box>
    );
  }

  if (file.parseError) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', p: 4 }}>
        <Typography variant="h6" color="error">
          文档解析失败
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {file.parseError}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {file.name}
        </Typography>
        <Chip label={file.type} size="small" color="primary" variant="outlined" />
        {items.length > 0 && (
          <Chip label={`${items.length} 项敏感信息`} size="small" color="warning" />
        )}
      </Box>

      {renderedContent}

      {/* 右键操作菜单 */}
      <Menu
        open={contextMenu.open}
        onClose={handleMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu.open
            ? { top: contextMenu.y, left: contextMenu.x }
            : undefined
        }
      >
        {selectedItem && !selectedItem.isDesensitized && !selectedItem.isIgnored && (
          <MenuItem onClick={handleDesensitize}>
            <ListItemIcon><LockIcon fontSize="small" /></ListItemIcon>
            <ListItemText>脱敏</ListItemText>
          </MenuItem>
        )}
        {selectedItem && selectedItem.isDesensitized && (
          <MenuItem onClick={handleUndo}>
            <ListItemIcon><LockOpenIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>取消脱敏（恢复原文）</ListItemText>
          </MenuItem>
        )}
        {selectedItem && !selectedItem.isIgnored && (
          <MenuItem onClick={handleIgnore}>
            <ListItemIcon><VisibilityOffIcon fontSize="small" /></ListItemIcon>
            <ListItemText>忽略</ListItemText>
          </MenuItem>
        )}
        {selectedItem && selectedItem.isIgnored && (
          <MenuItem onClick={handleUnignore}>
            <ListItemIcon><VisibilityOffIcon fontSize="small" /></ListItemIcon>
            <ListItemText>取消忽略</ListItemText>
          </MenuItem>
        )}
        {selectedItem && (
          <>
            <Divider />
            <MenuItem onClick={handleEditStart}>
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText>编辑替换内容</ListItemText>
            </MenuItem>
          </>
        )}
      </Menu>

      {/* 编辑对话框 - 简单实现 */}
      {editDialogId && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0,0,0,0.5)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => { setEditDialogId(null); setEditText(''); }}
        >
          <Paper
            sx={{ p: 3, minWidth: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" gutterBottom>编辑替换内容</Typography>
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              style={{
                width: '100%',
                minHeight: 80,
                padding: 8,
                border: '1px solid #ccc',
                borderRadius: 4,
                fontSize: 14,
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
            <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setEditDialogId(null); setEditText(''); }}
                style={{ padding: '6px 16px', borderRadius: 4, border: '1px solid #ccc', cursor: 'pointer' }}
              >
                取消
              </button>
              <button
                onClick={handleEditConfirm}
                style={{
                  padding: '6px 16px',
                  borderRadius: 4,
                  border: 'none',
                  background: '#334e68',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                确认
              </button>
            </Box>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default DocumentViewer;
