/**
 * 审计文档智能脱敏可视化工具 - 辅助函数与导出功能测试
 * 测试范围：helpers.ts 中的工具函数、日志CSV生成、报告JSON生成
 */

import { describe, it, expect } from 'vitest';
import {
  SensitiveType,
  DesensitizeStrategy,
  OperationLogEntry,
  DesensitizeReport,
  SensitiveItem,
} from '../types';
import {
  formatFileSize,
  formatTimestamp,
  generateId,
  getFileExtension,
  splitTextBySensitiveItems,
  generateLogCsv,
  generateReportJson,
  sensitiveTypeConfigs,
} from '../utils/helpers';

// ==================== 文件大小格式化测试 ====================

describe('文件大小格式化 (formatFileSize)', () => {
  it('0 字节应返回 "0 B"', () => {
    expect(formatFileSize(0)).toBe('0 B');
  });

  it('小于1KB应返回字节', () => {
    expect(formatFileSize(512)).toBe('512 B');
  });

  it('应正确格式化KB', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('应正确格式化MB', () => {
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1572864)).toBe('1.5 MB');
  });

  it('应正确格式化GB', () => {
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });
});

// ==================== 时间戳格式化测试 ====================

describe('时间戳格式化 (formatTimestamp)', () => {
  it('应返回 zh-CN 格式的时间字符串', () => {
    const ts = '2024-01-15T10:30:00.000Z';
    const result = formatTimestamp(ts);
    expect(result).toBeTruthy();
    expect(typeof result).toBe('string');
  });

  it('应处理各种合法 ISO 时间戳', () => {
    expect(() => formatTimestamp('2024-06-01T00:00:00.000Z')).not.toThrow();
    expect(() => formatTimestamp('2024-12-31T23:59:59.999Z')).not.toThrow();
  });
});

// ==================== ID生成测试 ====================

describe('ID生成 (generateId)', () => {
  it('应生成非空字符串', () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('连续调用应生成不同ID', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });
});

// ==================== 文件扩展名测试 ====================

describe('获取文件扩展名 (getFileExtension)', () => {
  it('应正确提取扩展名', () => {
    expect(getFileExtension('report.pdf')).toBe('pdf');
    expect(getFileExtension('data.XLSX')).toBe('xlsx');
  });

  it('无扩展名时返回文件名本身', () => {
    // getFileExtension 用 split('.').pop() 实现，无点号时返回整个字符串
    expect(getFileExtension('noextension')).toBe('noextension');
  });

  it('应处理多点文件名', () => {
    expect(getFileExtension('my.report.final.docx')).toBe('docx');
  });
});

// ==================== 敏感类型配置测试 ====================

describe('敏感类型显示配置 (sensitiveTypeConfigs)', () => {
  it('所有 SensitiveType 都应有配置', () => {
    for (const type of Object.values(SensitiveType)) {
      expect(sensitiveTypeConfigs[type]).toBeDefined();
      expect(sensitiveTypeConfigs[type].label).toBeTruthy();
      expect(sensitiveTypeConfigs[type].color).toBeTruthy();
      expect(sensitiveTypeConfigs[type].bgColor).toBeTruthy();
      expect(sensitiveTypeConfigs[type].icon).toBeTruthy();
    }
  });
});

// ==================== 文本分割渲染测试 ====================

describe('文本分割渲染 (splitTextBySensitiveItems)', () => {
  it('无敏感项时返回整个文本作为一个片段', () => {
    const result = splitTextBySensitiveItems('普通文本', []);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe('普通文本');
    expect(result[0].isSensitive).toBe(false);
  });

  it('应在敏感项位置正确分割文本', () => {
    const text = '前面手机13812345678后面';
    const items: SensitiveItem[] = [
      {
        id: 'test_1',
        type: SensitiveType.PHONE,
        originalText: '13812345678',
        startIndex: 4,
        endIndex: 15,
        isDesensitized: false,
        desensitizedText: '',
        segmentIndex: 0,
        isIgnored: false,
      },
    ];
    const result = splitTextBySensitiveItems(text, items);
    expect(result.length).toBe(3);
    expect(result[0].text).toBe('前面手机');
    expect(result[0].isSensitive).toBe(false);
    expect(result[1].text).toBe('13812345678');
    expect(result[1].isSensitive).toBe(true);
    expect(result[2].text).toBe('后面');
    expect(result[2].isSensitive).toBe(false);
  });

  it('脱敏项应携带脱敏文本', () => {
    const text = '手机13812345678';
    const items: SensitiveItem[] = [
      {
        id: 'test_1',
        type: SensitiveType.PHONE,
        originalText: '13812345678',
        startIndex: 2,
        endIndex: 13,
        isDesensitized: true,
        desensitizedText: '138****5678',
        segmentIndex: 0,
        isIgnored: false,
      },
    ];
    const result = splitTextBySensitiveItems(text, items);
    const sensitive = result.find(s => s.isSensitive);
    expect(sensitive?.desensitizedText).toBe('138****5678');
  });

  it('开头的敏感项应正确分割', () => {
    const text = '13812345678是手机号';
    const items: SensitiveItem[] = [
      {
        id: 'test_1',
        type: SensitiveType.PHONE,
        originalText: '13812345678',
        startIndex: 0,
        endIndex: 11,
        isDesensitized: false,
        desensitizedText: '',
        segmentIndex: 0,
        isIgnored: false,
      },
    ];
    const result = splitTextBySensitiveItems(text, items);
    expect(result[0].text).toBe('13812345678');
    expect(result[0].isSensitive).toBe(true);
    expect(result[1].text).toBe('是手机号');
    expect(result[1].isSensitive).toBe(false);
  });

  it('末尾的敏感项应正确分割', () => {
    const text = '手机号是13812345678';
    const items: SensitiveItem[] = [
      {
        id: 'test_1',
        type: SensitiveType.PHONE,
        originalText: '13812345678',
        startIndex: 4,
        endIndex: 15,
        isDesensitized: false,
        desensitizedText: '',
        segmentIndex: 0,
        isIgnored: false,
      },
    ];
    const result = splitTextBySensitiveItems(text, items);
    expect(result[result.length - 1].text).toBe('13812345678');
    expect(result[result.length - 1].isSensitive).toBe(true);
  });
});

// ==================== 操作日志CSV导出测试 ====================

describe('操作日志CSV导出 (generateLogCsv)', () => {
  it('应正确生成CSV格式', () => {
    const logs: OperationLogEntry[] = [
      {
        id: 'log_1',
        timestamp: '2024-01-15T10:30:00.000Z',
        operationType: 'DESENSITIZE',
        targetType: SensitiveType.PHONE,
        ruleDescription: 'PARTIAL_MASK',
        fileId: 'file_1',
        sensitiveItemId: 'si_1',
        originalContent: '13812345678',
        resultContent: '138****5678',
      },
    ];
    const csv = generateLogCsv(logs);
    expect(csv).toContain('时间,操作类型,目标类型');
    expect(csv).toContain('DESENSITIZE');
    expect(csv).toContain('13812345678');
    expect(csv).toContain('138****5678');
  });

  it('空日志应只输出表头', () => {
    const csv = generateLogCsv([]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('时间');
  });

  it('多条日志应分行输出', () => {
    const logs: OperationLogEntry[] = [
      {
        id: 'log_1',
        timestamp: '2024-01-15T10:30:00.000Z',
        operationType: 'DESENSITIZE',
        targetType: SensitiveType.PHONE,
        ruleDescription: 'test1',
        fileId: 'f1',
        sensitiveItemId: 's1',
        originalContent: 'a',
        resultContent: 'b',
      },
      {
        id: 'log_2',
        timestamp: '2024-01-15T10:31:00.000Z',
        operationType: 'UNDO_DESENSITIZE',
        targetType: SensitiveType.EMAIL,
        ruleDescription: 'test2',
        fileId: 'f1',
        sensitiveItemId: 's2',
        originalContent: 'c',
        resultContent: 'd',
      },
    ];
    const csv = generateLogCsv(logs);
    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // header + 2 rows
  });
});

// ==================== 脱敏报告JSON导出测试 ====================

describe('脱敏报告JSON导出 (generateReportJson)', () => {
  it('应生成合法的JSON', () => {
    const report: DesensitizeReport = {
      fileName: 'test.pdf',
      totalSensitiveItems: 5,
      desensitizedItems: 3,
      ignoredItems: 1,
      byType: {
        [SensitiveType.ID_CARD]: { total: 0, desensitized: 0 },
        [SensitiveType.PHONE]: { total: 3, desensitized: 2 },
        [SensitiveType.BANK_CARD]: { total: 0, desensitized: 0 },
        [SensitiveType.EMAIL]: { total: 2, desensitized: 1 },
        [SensitiveType.CREDIT_CODE]: { total: 0, desensitized: 0 },
        [SensitiveType.AMOUNT]: { total: 0, desensitized: 0 },
        [SensitiveType.NAME]: { total: 0, desensitized: 0 },
        [SensitiveType.CUSTOM]: { total: 0, desensitized: 0 },
      },
      exportTime: '2024-01-15T10:30:00.000Z',
    };
    const json = generateReportJson(report);
    expect(() => JSON.parse(json)).not.toThrow();
    const parsed = JSON.parse(json);
    expect(parsed.fileName).toBe('test.pdf');
    expect(parsed.totalSensitiveItems).toBe(5);
    expect(parsed.desensitizedItems).toBe(3);
    expect(parsed.ignoredItems).toBe(1);
  });

  it('应正确包含byType统计', () => {
    const report: DesensitizeReport = {
      fileName: 'report.pdf',
      totalSensitiveItems: 10,
      desensitizedItems: 8,
      ignoredItems: 2,
      byType: {
        [SensitiveType.ID_CARD]: { total: 5, desensitized: 4 },
        [SensitiveType.PHONE]: { total: 5, desensitized: 4 },
        [SensitiveType.BANK_CARD]: { total: 0, desensitized: 0 },
        [SensitiveType.EMAIL]: { total: 0, desensitized: 0 },
        [SensitiveType.CREDIT_CODE]: { total: 0, desensitized: 0 },
        [SensitiveType.AMOUNT]: { total: 0, desensitized: 0 },
        [SensitiveType.NAME]: { total: 0, desensitized: 0 },
        [SensitiveType.CUSTOM]: { total: 0, desensitized: 0 },
      },
      exportTime: '2024-01-15T10:30:00.000Z',
    };
    const json = generateReportJson(report);
    const parsed = JSON.parse(json);
    expect(parsed.byType[SensitiveType.ID_CARD].total).toBe(5);
    expect(parsed.byType[SensitiveType.PHONE].total).toBe(5);
  });
});
