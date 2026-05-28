import { SensitiveType, DesensitizeStrategy, DesensitizeRule, CustomRegexRule } from '../types';

/** 默认脱敏规则集 */
export const defaultDesensitizeRules: DesensitizeRule[] = [
  {
    type: SensitiveType.ID_CARD,
    strategy: DesensitizeStrategy.PARTIAL_MASK,
    keepPrefix: 3,
    keepSuffix: 4,
    maskChar: '*',
    placeholderText: '[身份证已脱敏]',
    enabled: true,
  },
  {
    type: SensitiveType.PHONE,
    strategy: DesensitizeStrategy.PARTIAL_MASK,
    keepPrefix: 3,
    keepSuffix: 4,
    maskChar: '*',
    placeholderText: '[手机号已脱敏]',
    enabled: true,
  },
  {
    type: SensitiveType.BANK_CARD,
    strategy: DesensitizeStrategy.PARTIAL_MASK,
    keepPrefix: 4,
    keepSuffix: 4,
    maskChar: '*',
    placeholderText: '[银行卡号已脱敏]',
    enabled: true,
  },
  {
    type: SensitiveType.EMAIL,
    strategy: DesensitizeStrategy.PARTIAL_MASK,
    keepPrefix: 2,
    keepSuffix: 0,
    maskChar: '*',
    placeholderText: '[邮箱已脱敏]',
    enabled: true,
  },
  {
    type: SensitiveType.CREDIT_CODE,
    strategy: DesensitizeStrategy.PARTIAL_MASK,
    keepPrefix: 4,
    keepSuffix: 4,
    maskChar: '*',
    placeholderText: '[信用代码已脱敏]',
    enabled: true,
  },
  {
    type: SensitiveType.AMOUNT,
    strategy: DesensitizeStrategy.PLACEHOLDER,
    keepPrefix: 0,
    keepSuffix: 0,
    maskChar: '*',
    placeholderText: '[已脱敏]',
    enabled: true,
  },
  {
    type: SensitiveType.NAME,
    strategy: DesensitizeStrategy.PARTIAL_MASK,
    keepPrefix: 1,
    keepSuffix: 0,
    maskChar: '*',
    placeholderText: '[姓名已脱敏]',
    enabled: true,
  },
  {
    type: SensitiveType.CUSTOM,
    strategy: DesensitizeStrategy.FULL_MASK,
    keepPrefix: 0,
    keepSuffix: 0,
    maskChar: '*',
    placeholderText: '[已脱敏]',
    enabled: true,
  },
];

/** 默认自定义正则规则 */
export const defaultCustomRegexRules: CustomRegexRule[] = [];

/** 敏感信息正则匹配规则 */
export const sensitiveRegexPatterns: Record<
  SensitiveType,
  { pattern: RegExp; label: string }
> = {
  [SensitiveType.ID_CARD]: {
    pattern: /(?<!\d)([1-9]\d{5}(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3}[\dXx])(?!\d)|(?<!\d)([1-9]\d{7}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])\d{3})(?!\d)/g,
    label: '身份证号',
  },
  [SensitiveType.PHONE]: {
    pattern: /(?<!\d)(1[3-9]\d{9})(?!\d)/g,
    label: '手机号码',
  },
  [SensitiveType.BANK_CARD]: {
    pattern: /(?<!\d)(\d{16,19})(?!\d)/g,
    label: '银行卡号',
  },
  [SensitiveType.EMAIL]: {
    pattern: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    label: '邮箱地址',
  },
  [SensitiveType.CREDIT_CODE]: {
    pattern: /([0-9A-HJ-NP-RTU-Y]{2}\d{6}[0-9A-HJ-NP-RTU-Y]{10})/g,
    label: '统一社会信用代码',
  },
  [SensitiveType.AMOUNT]: {
    pattern: /(¥[\d,]+\.?\d{0,2})/g,
    label: '金额/财务数据',
  },
  [SensitiveType.NAME]: {
    pattern: /([\u4e00-\u9fa5]{2,3}?)(?=先生|女士|同志|经理|总监|主管|总裁|部长|处长|科长|主任|负责)/g,
    label: '人名',
  },
  [SensitiveType.CUSTOM]: {
    pattern: /(?:)/g,
    label: '自定义',
  },
};

/** 人名匹配中应排除的称谓关键词（与前瞻列表一致） */
export const nameTitleKeywords = [
  '先生', '女士', '同志', '经理', '总监', '主管',
  '总裁', '部长', '处长', '科长', '主任', '负责',
];
