import { SensitiveType, SensitiveTypeConfig } from '../types';

/** 敏感类型显示配置映射 */
export const sensitiveTypeConfigs: Record<SensitiveType, SensitiveTypeConfig> = {
  [SensitiveType.ID_CARD]: {
    label: '身份证号',
    color: '#e53935',
    bgColor: '#ffcdd2',
    borderColor: '#e53935',
    cssClass: 'id-card',
    icon: 'Badge',
  },
  [SensitiveType.PHONE]: {
    label: '手机号码',
    color: '#1e88e5',
    bgColor: '#bbdefb',
    borderColor: '#1e88e5',
    cssClass: 'phone',
    icon: 'Phone',
  },
  [SensitiveType.BANK_CARD]: {
    label: '银行卡号',
    color: '#43a047',
    bgColor: '#c8e6c9',
    borderColor: '#43a047',
    cssClass: 'bank-card',
    icon: 'CreditCard',
  },
  [SensitiveType.EMAIL]: {
    label: '邮箱地址',
    color: '#fdd835',
    bgColor: '#fff9c4',
    borderColor: '#fdd835',
    cssClass: 'email',
    icon: 'Email',
  },
  [SensitiveType.CREDIT_CODE]: {
    label: '统一社会信用代码',
    color: '#8e24aa',
    bgColor: '#e1bee7',
    borderColor: '#8e24aa',
    cssClass: 'credit-code',
    icon: 'Business',
  },
  [SensitiveType.AMOUNT]: {
    label: '金额/财务数据',
    color: '#fb8c00',
    bgColor: '#ffe0b2',
    borderColor: '#fb8c00',
    cssClass: 'amount',
    icon: 'AttachMoney',
  },
  [SensitiveType.NAME]: {
    label: '人名',
    color: '#00897b',
    bgColor: '#b2dfdb',
    borderColor: '#00897b',
    cssClass: 'name',
    icon: 'Person',
  },
  [SensitiveType.CUSTOM]: {
    label: '自定义',
    color: '#546e7a',
    bgColor: '#cfd8dc',
    borderColor: '#546e7a',
    cssClass: 'custom',
    icon: 'Rule',
  },
};

/** 格式化文件大小 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/** 格式化时间戳 */
export function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/** 生成唯一 ID */
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** 获取文件扩展名 */
export function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().split('.').pop() || '';
}

/** 将文本按敏感项分割为片段（用于渲染高亮） */
export interface TextSegment {
  text: string;
  isSensitive: boolean;
  sensitiveItemId?: string;
  sensitiveType?: SensitiveType;
  isDesensitized: boolean;
  desensitizedText?: string;
}

export function splitTextBySensitiveItems(
  text: string,
  items: SensitiveItem[]
): TextSegment[] {
  if (items.length === 0) {
    return [{ text, isSensitive: false, isDesensitized: false }];
  }

  const segments: TextSegment[] = [];
  const sortedItems = [...items].sort((a, b) => a.startIndex - b.startIndex);
  let currentIndex = 0;

  for (const item of sortedItems) {
    // 添加敏感项之前的普通文本
    if (item.startIndex > currentIndex) {
      segments.push({
        text: text.substring(currentIndex, item.startIndex),
        isSensitive: false,
        isDesensitized: false,
      });
    }

    // 添加敏感项文本
    segments.push({
      text: item.originalText,
      isSensitive: true,
      sensitiveItemId: item.id,
      sensitiveType: item.type,
      isDesensitized: item.isDesensitized,
      desensitizedText: item.desensitizedText,
    });

    currentIndex = item.endIndex;
  }

  // 添加剩余普通文本
  if (currentIndex < text.length) {
    segments.push({
      text: text.substring(currentIndex),
      isSensitive: false,
      isDesensitized: false,
    });
  }

  return segments;
}

// Need to import SensitiveItem for splitTextBySensitiveItems
import { SensitiveItem } from '../types';

/** 生成脱敏报告 CSV 内容 */
export function generateLogCsv(
  logs: import('../types').OperationLogEntry[]
): string {
  const header = '时间,操作类型,目标类型,规则描述,文件ID,敏感项ID,原始内容,操作后内容';
  const rows = logs.map(
    (log) =>
      `"${log.timestamp}","${log.operationType}","${log.targetType}","${log.ruleDescription}","${log.fileId}","${log.sensitiveItemId}","${log.originalContent}","${log.resultContent}"`
  );
  return [header, ...rows].join('\n');
}

/** 生成脱敏报告 JSON 内容 */
export function generateReportJson(
  report: import('../types').DesensitizeReport
): string {
  return JSON.stringify(report, null, 2);
}
