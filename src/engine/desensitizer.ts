import {
  SensitiveItem,
  DesensitizeRule,
  DesensitizeStrategy,
  SensitiveType,
  ExcelSheetContent,
  ExcelCell,
} from '../types';
import { defaultDesensitizeRules } from './rules';
import * as XLSX from 'xlsx';

/** 应用部分遮盖脱敏 */
function applyPartialMask(
  text: string,
  rule: DesensitizeRule
): string {
  const { keepPrefix, keepSuffix, maskChar } = rule;
  const len = text.length;

  if (keepPrefix + keepSuffix >= len) {
    return text;
  }

  const prefix = text.substring(0, keepPrefix);
  const suffix = text.substring(len - keepSuffix);
  const maskLen = len - keepPrefix - keepSuffix;
  const mask = maskChar.repeat(maskLen);

  return `${prefix}${mask}${suffix}`;
}

/** 应用完全遮盖脱敏 */
function applyFullMask(text: string, rule: DesensitizeRule): string {
  return rule.maskChar.repeat(text.length);
}

/** 应用占位符替换 */
function applyPlaceholder(text: string, rule: DesensitizeRule): string {
  return rule.placeholderText;
}

/** 根据规则对单个敏感项执行脱敏 */
export function desensitizeItem(
  item: SensitiveItem,
  rule: DesensitizeRule
): string {
  if (!rule.enabled) {
    return item.originalText;
  }

  switch (rule.strategy) {
    case DesensitizeStrategy.PARTIAL_MASK:
      return applyPartialMask(item.originalText, rule);
    case DesensitizeStrategy.FULL_MASK:
      return applyFullMask(item.originalText, rule);
    case DesensitizeStrategy.PLACEHOLDER:
      return applyPlaceholder(item.originalText, rule);
    default:
      return applyPartialMask(item.originalText, rule);
  }
}

/** 查找匹配的脱敏规则 */
export function findRuleForType(
  type: SensitiveType,
  rules: DesensitizeRule[]
): DesensitizeRule {
  return (
    rules.find((r) => r.type === type) ||
    defaultDesensitizeRules.find((r) => r.type === type) ||
    {
      type,
      strategy: DesensitizeStrategy.PARTIAL_MASK,
      keepPrefix: 2,
      keepSuffix: 2,
      maskChar: '*',
      placeholderText: '[已脱敏]',
      enabled: true,
    }
  );
}

/** 自动脱敏所有未处理且未忽略的敏感项 */
export function autoDesensitize(
  items: SensitiveItem[],
  rules: DesensitizeRule[]
): SensitiveItem[] {
  return items.map((item) => {
    if (item.isDesensitized || item.isIgnored) return item;

    const rule = findRuleForType(item.type, rules);
    if (!rule.enabled) return item;

    return {
      ...item,
      isDesensitized: true,
      desensitizedText: desensitizeItem(item, rule),
    };
  });
}

/** 对单个敏感项执行脱敏 */
export function desensitizeSingleItem(
  item: SensitiveItem,
  rules: DesensitizeRule[]
): SensitiveItem {
  if (item.isIgnored) return item;

  const rule = findRuleForType(item.type, rules);
  return {
    ...item,
    isDesensitized: true,
    desensitizedText: desensitizeItem(item, rule),
  };
}

/** 撤销单个敏感项的脱敏 */
export function undoDesensitizeItem(item: SensitiveItem): SensitiveItem {
  return {
    ...item,
    isDesensitized: false,
    desensitizedText: '',
  };
}

/** 批量脱敏指定类型的所有敏感项 */
export function batchDesensitizeByType(
  items: SensitiveItem[],
  type: SensitiveType,
  rules: DesensitizeRule[]
): SensitiveItem[] {
  return items.map((item) => {
    if (item.type !== type || item.isDesensitized || item.isIgnored) return item;

    const rule = findRuleForType(item.type, rules);
    return {
      ...item,
      isDesensitized: true,
      desensitizedText: desensitizeItem(item, rule),
    };
  });
}

/** 生成脱敏后的完整文本 */
export function generateDesensitizedText(
  plainText: string,
  items: SensitiveItem[]
): string {
  const sortedItems = [...items]
    .filter((item) => item.isDesensitized)
    .sort((a, b) => b.startIndex - a.startIndex); // 从后往前替换

  let result = plainText;
  for (const item of sortedItems) {
    result =
      result.substring(0, item.startIndex) +
      item.desensitizedText +
      result.substring(item.endIndex);
  }

  return result;
}

/** 脱敏规则导入导出 */
export function exportRules(rules: DesensitizeRule[]): string {
  return JSON.stringify(rules, null, 2);
}

export function importRules(json: string): DesensitizeRule[] {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      return parsed as DesensitizeRule[];
    }
    throw new Error('无效的规则格式');
  } catch (e) {
    throw new Error(`导入规则失败: ${(e as Error).message}`);
  }
}

/** 生成脱敏后的 Excel 工作簿（保留表格结构） */
export function generateDesensitizedExcel(
  sheets: ExcelSheetContent[],
  items: SensitiveItem[]
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    // 找出该sheet中最大行列
    let maxRow = 0;
    let maxCol = 0;
    for (const cell of sheet.cells) {
      if (cell.row > maxRow) maxRow = cell.row;
      if (cell.col > maxCol) maxCol = cell.col;
    }

    // 构建2D数组
    const data: string[][] = [];
    for (let r = 0; r <= maxRow; r++) {
      const row: string[] = [];
      for (let c = 0; c <= maxCol; c++) {
        row.push('');
      }
      data.push(row);
    }

    // 填入单元格值，对敏感项进行脱敏替换
    for (const cell of sheet.cells) {
      // 检查该单元格内容中是否有已脱敏的敏感项
      let cellValue = cell.value;
      // 对该单元格内所有已脱敏的敏感项做替换
      const cellItems = items.filter(
        (item) => item.isDesensitized && cell.value.includes(item.originalText)
      );
      if (cellItems.length > 0) {
        // 从后往前替换，避免偏移
        const sortedCellItems = [...cellItems].sort(
          (a, b) => b.startIndex - a.startIndex
        );
        for (const item of sortedCellItems) {
          cellValue = cellValue.replace(item.originalText, item.desensitizedText);
        }
      }
      data[cell.row][cell.col] = cellValue;
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.sheetName);
  }

  return workbook;
}

/** 导出 Excel 文件为 ArrayBuffer */
export function exportExcelBuffer(
  sheets: ExcelSheetContent[],
  items: SensitiveItem[]
): ArrayBuffer {
  const workbook = generateDesensitizedExcel(sheets, items);
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return wbout;
}

/** 生成脱敏后的 Markdown 文档 */
export function generateDesensitizedMarkdown(
  fileName: string,
  desensitizedText: string,
  items: SensitiveItem[]
): string {
  const stats = items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const typeLabels: Record<string, string> = {
    ID_CARD: '身份证号',
    PHONE: '手机号码',
    BANK_CARD: '银行卡号',
    EMAIL: '邮箱地址',
    CREDIT_CODE: '统一社会信用代码',
    AMOUNT: '金额',
    NAME: '人名',
    CUSTOM: '自定义',
  };

  const statsRows = Object.entries(stats)
    .map(([type, count]) => `- ${typeLabels[type] || type}: ${count} 项`)
    .join('\n');

  return `# ${fileName} - 脱敏文档

## 脱敏统计
- 敏感信息总数: ${items.length}
- 已脱敏: ${items.filter((i) => i.isDesensitized).length}
- 已忽略: ${items.filter((i) => i.isIgnored).length}

## 各类型统计
${statsRows}

## 脱敏后内容

${desensitizedText}
`;
}
