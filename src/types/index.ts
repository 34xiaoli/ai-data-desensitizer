/** 敏感信息类型枚举 */
export enum SensitiveType {
  ID_CARD = 'ID_CARD',
  PHONE = 'PHONE',
  BANK_CARD = 'BANK_CARD',
  EMAIL = 'EMAIL',
  CREDIT_CODE = 'CREDIT_CODE',
  AMOUNT = 'AMOUNT',
  NAME = 'NAME',
  CUSTOM = 'CUSTOM',
}

/** 脱敏策略枚举 */
export enum DesensitizeStrategy {
  FULL_MASK = 'FULL_MASK',
  PARTIAL_MASK = 'PARTIAL_MASK',
  PLACEHOLDER = 'PLACEHOLDER',
}

/** 文件类型枚举 */
export enum FileType {
  PDF = 'PDF',
  WORD = 'WORD',
  EXCEL = 'EXCEL',
  UNKNOWN = 'UNKNOWN',
}

/** 脱敏模式 */
export enum DesensitizeMode {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL',
}

/** 对比视图模式 */
export enum CompareMode {
  SPLIT = 'SPLIT',
  SINGLE = 'SINGLE',
}

/** 敏感信息项 */
export interface SensitiveItem {
  id: string;
  type: SensitiveType;
  originalText: string;
  /** 在文档内容中的起始偏移量 */
  startIndex: number;
  /** 在文档内容中的结束偏移量 */
  endIndex: number;
  /** 是否已脱敏 */
  isDesensitized: boolean;
  /** 脱敏后的文本 */
  desensitizedText: string;
  /** 所在页面/段落/单元格索引 */
  segmentIndex: number;
  /** 用户是否标记为忽略 */
  isIgnored: boolean;
}

/** 脱敏规则配置 */
export interface DesensitizeRule {
  type: SensitiveType;
  strategy: DesensitizeStrategy;
  /** 部分遮盖时保留前N位 */
  keepPrefix: number;
  /** 部分遮盖时保留后N位 */
  keepSuffix: number;
  /** 遮盖字符 */
  maskChar: string;
  /** 占位符文本 */
  placeholderText: string;
  /** 是否启用 */
  enabled: boolean;
}

/** 自定义正则规则 */
export interface CustomRegexRule {
  id: string;
  name: string;
  pattern: string;
  sensitiveType: SensitiveType;
  enabled: boolean;
}

/** PDF页面内容 */
export interface PdfPageContent {
  pageIndex: number;
  text: string;
}

/** Word段落内容 */
export interface WordParagraphContent {
  paragraphIndex: number;
  text: string;
}

/** Excel单元格 */
export interface ExcelCell {
  row: number;
  col: number;
  value: string;
}

/** Excel工作表内容 */
export interface ExcelSheetContent {
  sheetName: string;
  cells: ExcelCell[];
}

/** 文档内容（联合类型） */
export interface DocumentContent {
  fileType: FileType;
  /** PDF 的分页内容 */
  pdfPages?: PdfPageContent[];
  /** Word 的段落内容 */
  wordParagraphs?: WordParagraphContent[];
  /** Excel 的工作表内容 */
  excelSheets?: ExcelSheetContent[];
  /** 原始纯文本（用于检测） */
  plainText: string;
}

/** 上传文件 */
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: FileType;
  uploadTime: string;
  content: DocumentContent | null;
  isParsing: boolean;
  parseError: string | null;
  /** 原始文件的 ArrayBuffer */
  rawBuffer: ArrayBuffer | null;
}

/** 操作日志条目 */
export interface OperationLogEntry {
  id: string;
  timestamp: string;
  operationType: 'DESENSITIZE' | 'UNDO_DESENSITIZE' | 'IGNORE' | 'UNIGNORE' | 'EDIT' | 'AUTO_DESENSITIZE' | 'BATCH_DESENSITIZE' | 'BATCH_UNDO_DESENSITIZE' | 'UNDO_ALL_DESENSITIZE';
  targetType: SensitiveType;
  /** 使用的脱敏规则描述 */
  ruleDescription: string;
  /** 所属文件ID */
  fileId: string;
  /** 目标敏感项ID */
  sensitiveItemId: string;
  /** 原始内容 */
  originalContent: string;
  /** 操作后内容 */
  resultContent: string;
}

/** 脱敏报告 */
export interface DesensitizeReport {
  fileName: string;
  totalSensitiveItems: number;
  desensitizedItems: number;
  ignoredItems: number;
  byType: Record<SensitiveType, { total: number; desensitized: number }>;
  exportTime: string;
}

/** 撤销/重做历史记录 */
export interface HistoryEntry {
  sensitiveItemId: string;
  fileId: string;
  previousState: {
    isDesensitized: boolean;
    desensitizedText: string;
    isIgnored: boolean;
  };
}

/** 敏感类型显示配置 */
export interface SensitiveTypeConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  cssClass: string;
  icon: string;
}

/** 右键菜单状态 */
export interface ContextMenuState {
  open: boolean;
  x: number;
  y: number;
  sensitiveItemId: string | null;
  fileId: string | null;
}
