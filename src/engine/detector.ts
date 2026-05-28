import {
  SensitiveItem,
  SensitiveType,
  DocumentContent,
  FileType,
  CustomRegexRule,
} from '../types';
import { sensitiveRegexPatterns, nameTitleKeywords } from './rules';

let itemCounter = 0;

/** 生成唯一ID */
function generateItemId(): string {
  itemCounter += 1;
  return `si_${Date.now()}_${itemCounter}`;
}

/** 在文本中检测敏感信息 */
export function detectSensitiveItems(
  content: DocumentContent,
  customRules: CustomRegexRule[] = []
): SensitiveItem[] {
  const items: SensitiveItem[] = [];
  const plainText = content.plainText;
  const usedRanges: Array<{ start: number; end: number }> = [];

  /** 检查范围是否与已有项重叠 */
  function isOverlapping(start: number, end: number): boolean {
    return usedRanges.some(
      (range) => start < range.end && end > range.start
    );
  }

  /** 对每个段落/页面分别检测，并记录全局偏移量 */
  function detectInSegment(
    segmentText: string,
    segmentIndex: number,
    globalOffset: number
  ) {
    for (const [type, config] of Object.entries(sensitiveRegexPatterns)) {
      if (type === SensitiveType.CUSTOM) continue;

      const regex = new RegExp(config.pattern.source, config.pattern.flags);
      let match: RegExpExecArray | null;

      while ((match = regex.exec(segmentText)) !== null) {
        const matchedText = match[0];
        const localStart = match.index;
        const localEnd = localStart + matchedText.length;
        const globalStart = globalOffset + localStart;
        const globalEnd = globalOffset + localEnd;

        if (!isOverlapping(globalStart, globalEnd)) {
          // 人名匹配后过滤：排除匹配到的文本本身是称谓关键词的情况
          if (type === SensitiveType.NAME && nameTitleKeywords.includes(matchedText)) {
            continue;
          }
          const item: SensitiveItem = {
            id: generateItemId(),
            type: type as SensitiveType,
            originalText: matchedText,
            startIndex: globalStart,
            endIndex: globalEnd,
            isDesensitized: false,
            desensitizedText: '',
            segmentIndex,
            isIgnored: false,
          };
          items.push(item);
          usedRanges.push({ start: globalStart, end: globalEnd });
        }
      }
    }
  }

  /** 应用自定义正则规则 */
  function applyCustomRules(
    segmentText: string,
    segmentIndex: number,
    globalOffset: number
  ) {
    for (const rule of customRules) {
      if (!rule.enabled) continue;

      try {
        const regex = new RegExp(rule.pattern, 'g');
        let match: RegExpExecArray | null;

        while ((match = regex.exec(segmentText)) !== null) {
          const matchedText = match[0];
          const localStart = match.index;
          const localEnd = localStart + matchedText.length;
          const globalStart = globalOffset + localStart;
          const globalEnd = globalOffset + localEnd;

          if (!isOverlapping(globalStart, globalEnd)) {
            const item: SensitiveItem = {
              id: generateItemId(),
              type: rule.sensitiveType,
              originalText: matchedText,
              startIndex: globalStart,
              endIndex: globalEnd,
              isDesensitized: false,
              desensitizedText: '',
              segmentIndex,
              isIgnored: false,
            };
            items.push(item);
            usedRanges.push({ start: globalStart, end: globalEnd });
          }
        }
      } catch {
        // 忽略无效正则
      }
    }
  }

  // 按文件类型分段检测
  if (content.fileType === FileType.PDF && content.pdfPages) {
    let globalOffset = 0;
    for (let i = 0; i < content.pdfPages.length; i++) {
      const pageText = content.pdfPages[i].text;
      detectInSegment(pageText, i, globalOffset);
      applyCustomRules(pageText, i, globalOffset);
      globalOffset += pageText.length + 1; // +1 for \n
    }
  } else if (content.fileType === FileType.WORD && content.wordParagraphs) {
    let globalOffset = 0;
    for (let i = 0; i < content.wordParagraphs.length; i++) {
      const paraText = content.wordParagraphs[i].text;
      detectInSegment(paraText, i, globalOffset);
      applyCustomRules(paraText, i, globalOffset);
      globalOffset += paraText.length + 1;
    }
  } else if (content.fileType === FileType.EXCEL && content.excelSheets) {
    let globalOffset = 0;
    let segIdx = 0;
    for (const sheet of content.excelSheets) {
      const sheetText = sheet.cells.map((c) => c.value).join(' ');
      detectInSegment(sheetText, segIdx, globalOffset);
      applyCustomRules(sheetText, segIdx, globalOffset);
      globalOffset += sheetText.length + 1;
      segIdx += 1;
    }
  } else {
    // 降级：对纯文本做全局检测
    detectInSegment(plainText, 0, 0);
    applyCustomRules(plainText, 0, 0);
  }

  // 按起始位置排序
  items.sort((a, b) => a.startIndex - b.startIndex);
  return items;
}

/** 获取敏感类型统计 */
export function getSensitiveStats(items: SensitiveItem[]): Record<
  SensitiveType,
  { total: number; desensitized: number; ignored: number }
> {
  const stats: Record<
    SensitiveType,
    { total: number; desensitized: number; ignored: number }
  > = {} as any;

  const allTypes = Object.values(SensitiveType);
  for (const type of allTypes) {
    stats[type] = { total: 0, desensitized: 0, ignored: 0 };
  }

  for (const item of items) {
    stats[item.type].total += 1;
    if (item.isDesensitized) stats[item.type].desensitized += 1;
    if (item.isIgnored) stats[item.type].ignored += 1;
  }

  return stats;
}
