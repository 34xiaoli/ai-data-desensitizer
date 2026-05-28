import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useAppStore } from '../store/useAppStore';
import { sensitiveTypeConfigs } from '../utils/helpers';
import { exportRules, importRules } from '../engine/desensitizer';
import { SensitiveType, DesensitizeStrategy, DesensitizeRule, CustomRegexRule } from '../types';
import { generateId } from '../utils/helpers';

const RuleConfig: React.FC = () => {
  const desensitizeRules = useAppStore((s) => s.desensitizeRules);
  const customRegexRules = useAppStore((s) => s.customRegexRules);
  const updateRule = useAppStore((s) => s.updateRule);
  const addCustomRegexRule = useAppStore((s) => s.addCustomRegexRule);
  const removeCustomRegexRule = useAppStore((s) => s.removeCustomRegexRule);
  const showSnackbar = useAppStore((s) => s.showSnackbar);

  const [addCustomOpen, setAddCustomOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRulePattern, setNewRulePattern] = useState('');
  const [newRuleType, setNewRuleType] = useState<SensitiveType>(SensitiveType.CUSTOM);

  /** 导出规则 */
  function handleExportRules() {
    const json = exportRules(desensitizeRules);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'desensitize-rules.json';
    a.click();
    URL.revokeObjectURL(url);
    showSnackbar('规则已导出');
  }

  /** 导入规则 */
  function handleImportRules() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const rules = importRules(text);
        for (const rule of rules) {
          updateRule(rule);
        }
        showSnackbar('规则已导入');
      } catch (err) {
        showSnackbar(`导入失败: ${(err as Error).message}`);
      }
    };
    input.click();
  }

  /** 添加自定义规则 */
  function handleAddCustomRule() {
    if (!newRuleName || !newRulePattern) {
      showSnackbar('请填写规则名称和正则表达式');
      return;
    }

    // 验证正则
    try {
      new RegExp(newRulePattern);
    } catch {
      showSnackbar('无效的正则表达式');
      return;
    }

    const rule: CustomRegexRule = {
      id: generateId(),
      name: newRuleName,
      pattern: newRulePattern,
      sensitiveType: newRuleType,
      enabled: true,
    };

    addCustomRegexRule(rule);
    setAddCustomOpen(false);
    setNewRuleName('');
    setNewRulePattern('');
    setNewRuleType(SensitiveType.CUSTOM);
    showSnackbar('自定义规则已添加');
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          脱敏规则配置
        </Typography>
        <Box>
          <Tooltip title="导出规则">
            <IconButton size="small" onClick={handleExportRules}>
              <FileDownloadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="导入规则">
            <IconButton size="small" onClick={handleImportRules}>
              <FileUploadIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* 内置规则 */}
      {desensitizeRules.map((rule) => {
        const config = sensitiveTypeConfigs[rule.type];
        return (
          <Accordion key={rule.type} defaultExpanded={false} sx={{ mb: 0.5 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ py: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Chip
                  label={config.label}
                  size="small"
                  sx={{
                    bgcolor: config.bgColor,
                    color: config.color,
                    fontSize: '0.7rem',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {rule.strategy === DesensitizeStrategy.FULL_MASK && '完全遮盖'}
                  {rule.strategy === DesensitizeStrategy.PARTIAL_MASK && `保留前${rule.keepPrefix}后${rule.keepSuffix}`}
                  {rule.strategy === DesensitizeStrategy.PLACEHOLDER && rule.placeholderText}
                </Typography>
                <Switch
                  checked={rule.enabled}
                  onChange={(e) => updateRule({ ...rule, enabled: e.target.checked })}
                  size="small"
                  sx={{ ml: 'auto' }}
                  onClick={(e) => e.stopPropagation()}
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 1 }}>
              <FormControl fullWidth size="small" sx={{ mb: 1 }}>
                <InputLabel>脱敏策略</InputLabel>
                <Select
                  value={rule.strategy}
                  label="脱敏策略"
                  onChange={(e) =>
                    updateRule({ ...rule, strategy: e.target.value as DesensitizeStrategy })
                  }
                >
                  <MenuItem value={DesensitizeStrategy.FULL_MASK}>完全遮盖</MenuItem>
                  <MenuItem value={DesensitizeStrategy.PARTIAL_MASK}>部分遮盖</MenuItem>
                  <MenuItem value={DesensitizeStrategy.PLACEHOLDER}>替换为占位符</MenuItem>
                </Select>
              </FormControl>

              {rule.strategy === DesensitizeStrategy.PARTIAL_MASK && (
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <TextField
                    label="保留前N位"
                    type="number"
                    size="small"
                    value={rule.keepPrefix}
                    onChange={(e) =>
                      updateRule({ ...rule, keepPrefix: parseInt(e.target.value) || 0 })
                    }
                    inputProps={{ min: 0 }}
                    fullWidth
                  />
                  <TextField
                    label="保留后N位"
                    type="number"
                    size="small"
                    value={rule.keepSuffix}
                    onChange={(e) =>
                      updateRule({ ...rule, keepSuffix: parseInt(e.target.value) || 0 })
                    }
                    inputProps={{ min: 0 }}
                    fullWidth
                  />
                </Box>
              )}

              {rule.strategy === DesensitizeStrategy.PARTIAL_MASK && (
                <TextField
                  label="遮盖字符"
                  size="small"
                  value={rule.maskChar}
                  onChange={(e) => updateRule({ ...rule, maskChar: e.target.value })}
                  fullWidth
                  sx={{ mb: 1 }}
                />
              )}

              {rule.strategy === DesensitizeStrategy.PLACEHOLDER && (
                <TextField
                  label="占位符文本"
                  size="small"
                  value={rule.placeholderText}
                  onChange={(e) => updateRule({ ...rule, placeholderText: e.target.value })}
                  fullWidth
                  sx={{ mb: 1 }}
                />
              )}
            </AccordionDetails>
          </Accordion>
        );
      })}

      <Divider sx={{ my: 2 }} />

      {/* 自定义规则 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">自定义正则规则</Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setAddCustomOpen(true)}
        >
          添加
        </Button>
      </Box>

      {customRegexRules.length === 0 && (
        <Typography variant="caption" color="text.secondary">
          暂无自定义规则
        </Typography>
      )}

      {customRegexRules.map((rule) => (
        <Paper key={rule.id} variant="outlined" sx={{ p: 1.5, mb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {rule.name}
            </Typography>
            <Box>
              <Switch
                checked={rule.enabled}
                onChange={(e) => {
                  // Toggle via add/remove + re-add
                  addCustomRegexRule({ ...rule, enabled: e.target.checked });
                  removeCustomRegexRule(rule.id);
                }}
                size="small"
              />
              <IconButton
                size="small"
                color="error"
                onClick={() => removeCustomRegexRule(rule.id)}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            {rule.pattern}
          </Typography>
        </Paper>
      ))}

      {/* 添加自定义规则对话框 */}
      <Dialog open={addCustomOpen} onClose={() => setAddCustomOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>添加自定义正则规则</DialogTitle>
        <DialogContent>
          <TextField
            label="规则名称"
            fullWidth
            size="small"
            value={newRuleName}
            onChange={(e) => setNewRuleName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            label="正则表达式"
            fullWidth
            size="small"
            value={newRulePattern}
            onChange={(e) => setNewRulePattern(e.target.value)}
            placeholder="例如: \d{6,}"
            sx={{ mb: 2 }}
            helperText="请输入有效的正则表达式"
          />
          <FormControl fullWidth size="small">
            <InputLabel>敏感类型</InputLabel>
            <Select
              value={newRuleType}
              label="敏感类型"
              onChange={(e) => setNewRuleType(e.target.value as SensitiveType)}
            >
              {Object.values(SensitiveType).map((type) => (
                <MenuItem key={type} value={type}>
                  {sensitiveTypeConfigs[type].label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddCustomOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleAddCustomRule}>
            添加
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RuleConfig;
