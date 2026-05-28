import { create } from 'zustand';
import {
  UploadedFile,
  FileType,
  SensitiveItem,
  DesensitizeRule,
  OperationLogEntry,
  DesensitizeMode,
  CompareMode,
  CustomRegexRule,
  ContextMenuState,
  SensitiveType,
} from '../types';
import { defaultDesensitizeRules, defaultCustomRegexRules } from '../engine/rules';
import { detectSensitiveItems } from '../engine/detector';
import {
  desensitizeSingleItem,
  undoDesensitizeItem,
  autoDesensitize,
  batchDesensitizeByType,
  findRuleForType,
} from '../engine/desensitizer';
import { generateId } from '../utils/helpers';

interface AppState {
  /** 已上传文件列表 */
  files: UploadedFile[];
  /** 当前选中文件ID */
  selectedFileId: string | null;
  /** 各文件的敏感项映射 */
  sensitiveItemsMap: Record<string, SensitiveItem[]>;
  /** 脱敏规则列表 */
  desensitizeRules: DesensitizeRule[];
  /** 自定义正则规则 */
  customRegexRules: CustomRegexRule[];
  /** 操作日志 */
  operationLogs: OperationLogEntry[];
  /** 脱敏模式 */
  desensitizeMode: DesensitizeMode;
  /** 对比视图模式 */
  compareMode: CompareMode;
  /** 右键菜单状态 */
  contextMenu: ContextMenuState;
  /** 撤销栈 */
  undoStack: import('../types').HistoryEntry[];
  /** 重做栈 */
  redoStack: import('../types').HistoryEntry[];
  /** Snackbar 消息 */
  snackbarMessage: string | null;
  /** 导出对话框是否打开 */
  exportDialogOpen: boolean;
  /** 全局加载状态 */
  loading: boolean;
  /** 右侧面板当前标签页 */
  rightPanelTab: number;

  // Actions
  addFile: (file: UploadedFile) => void;
  removeFile: (fileId: string) => void;
  selectFile: (fileId: string) => void;
  updateFileContent: (fileId: string, content: UploadedFile['content']) => void;
  setFileParsing: (fileId: string, isParsing: boolean) => void;
  setFileParseError: (fileId: string, error: string | null) => void;
  detectFileSensitive: (fileId: string) => void;
  desensitizeSingle: (fileId: string, itemId: string) => void;
  undoDesensitize: (fileId: string, itemId: string) => void;
  ignoreItem: (fileId: string, itemId: string) => void;
  unignoreItem: (fileId: string, itemId: string) => void;
  autoDesensitizeAll: (fileId: string) => void;
  batchDesensitizeType: (fileId: string, type: SensitiveType) => void;
  undo: () => void;
  redo: () => void;
  updateRule: (rule: DesensitizeRule) => void;
  addCustomRegexRule: (rule: CustomRegexRule) => void;
  removeCustomRegexRule: (ruleId: string) => void;
  setDesensitizeMode: (mode: DesensitizeMode) => void;
  setCompareMode: (mode: CompareMode) => void;
  setContextMenu: (state: ContextMenuState) => void;
  showSnackbar: (message: string) => void;
  hideSnackbar: () => void;
  setExportDialogOpen: (open: boolean) => void;
  setLoading: (loading: boolean) => void;
  setRightPanelTab: (tab: number) => void;
  batchUndoDesensitizeByType: (fileId: string, type: SensitiveType) => void;
  undoAllDesensitize: (fileId: string) => void;
  editItemText: (fileId: string, itemId: string, newText: string) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  files: [],
  selectedFileId: null,
  sensitiveItemsMap: {},
  desensitizeRules: [...defaultDesensitizeRules],
  customRegexRules: [...defaultCustomRegexRules],
  operationLogs: [],
  desensitizeMode: DesensitizeMode.MANUAL,
  compareMode: CompareMode.SPLIT,
  contextMenu: { open: false, x: 0, y: 0, sensitiveItemId: null, fileId: null },
  undoStack: [],
  redoStack: [],
  snackbarMessage: null,
  exportDialogOpen: false,
  loading: false,
  rightPanelTab: 0,

  addFile: (file) =>
    set((state) => ({
      files: [...state.files, file],
      selectedFileId: state.selectedFileId || file.id,
    })),

  removeFile: (fileId) =>
    set((state) => {
      const newFiles = state.files.filter((f) => f.id !== fileId);
      const newMap = { ...state.sensitiveItemsMap };
      delete newMap[fileId];
      return {
        files: newFiles,
        selectedFileId:
          state.selectedFileId === fileId
            ? newFiles[0]?.id || null
            : state.selectedFileId,
        sensitiveItemsMap: newMap,
      };
    }),

  selectFile: (fileId) => set({ selectedFileId: fileId }),

  updateFileContent: (fileId, content) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, content } : f
      ),
    })),

  setFileParsing: (fileId, isParsing) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, isParsing } : f
      ),
    })),

  setFileParseError: (fileId, error) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === fileId ? { ...f, parseError: error } : f
      ),
    })),

  detectFileSensitive: (fileId) => {
    const state = get();
    const file = state.files.find((f) => f.id === fileId);
    if (!file || !file.content) return;

    const items = detectSensitiveItems(file.content, state.customRegexRules);
    set((s) => ({
      sensitiveItemsMap: { ...s.sensitiveItemsMap, [fileId]: items },
    }));
  },

  desensitizeSingle: (fileId, itemId) => {
    const state = get();
    const items = state.sensitiveItemsMap[fileId];
    if (!items) return;

    const item = items.find((i) => i.id === itemId);
    if (!item || item.isIgnored) return;

    const rule = findRuleForType(item.type, state.desensitizeRules);
    const updatedItem = desensitizeSingleItem(item, state.desensitizeRules);

    // 记录历史
    const historyEntry: import('../types').HistoryEntry = {
      sensitiveItemId: itemId,
      fileId,
      previousState: {
        isDesensitized: item.isDesensitized,
        desensitizedText: item.desensitizedText,
        isIgnored: item.isIgnored,
      },
    };

    // 记录操作日志
    const logEntry: OperationLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      operationType: 'DESENSITIZE',
      targetType: item.type,
      ruleDescription: `${rule.strategy} - ${item.originalText.substring(0, 5)}...`,
      fileId,
      sensitiveItemId: itemId,
      originalContent: item.originalText,
      resultContent: updatedItem.desensitizedText,
    };

    set((s) => ({
      sensitiveItemsMap: {
        ...s.sensitiveItemsMap,
        [fileId]: s.sensitiveItemsMap[fileId].map((i) =>
          i.id === itemId ? updatedItem : i
        ),
      },
      operationLogs: [...s.operationLogs, logEntry],
      undoStack: [...s.undoStack, historyEntry],
      redoStack: [],
    }));
  },

  undoDesensitize: (fileId, itemId) => {
    const state = get();
    const items = state.sensitiveItemsMap[fileId];
    if (!items) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const updatedItem = undoDesensitizeItem(item);

    const historyEntry: import('../types').HistoryEntry = {
      sensitiveItemId: itemId,
      fileId,
      previousState: {
        isDesensitized: item.isDesensitized,
        desensitizedText: item.desensitizedText,
        isIgnored: item.isIgnored,
      },
    };

    const logEntry: OperationLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      operationType: 'UNDO_DESENSITIZE',
      targetType: item.type,
      ruleDescription: '撤销脱敏',
      fileId,
      sensitiveItemId: itemId,
      originalContent: item.desensitizedText,
      resultContent: item.originalText,
    };

    set((s) => ({
      sensitiveItemsMap: {
        ...s.sensitiveItemsMap,
        [fileId]: s.sensitiveItemsMap[fileId].map((i) =>
          i.id === itemId ? updatedItem : i
        ),
      },
      operationLogs: [...s.operationLogs, logEntry],
      undoStack: [...s.undoStack, historyEntry],
      redoStack: [],
    }));
  },

  ignoreItem: (fileId, itemId) => {
    const state = get();
    const items = state.sensitiveItemsMap[fileId];
    if (!items) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const logEntry: OperationLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      operationType: 'IGNORE',
      targetType: item.type,
      ruleDescription: '忽略',
      fileId,
      sensitiveItemId: itemId,
      originalContent: item.originalText,
      resultContent: '[已忽略]',
    };

    set((s) => ({
      sensitiveItemsMap: {
        ...s.sensitiveItemsMap,
        [fileId]: s.sensitiveItemsMap[fileId].map((i) =>
          i.id === itemId ? { ...i, isIgnored: true } : i
        ),
      },
      operationLogs: [...s.operationLogs, logEntry],
    }));
  },

  unignoreItem: (fileId, itemId) => {
    const state = get();
    const items = state.sensitiveItemsMap[fileId];
    if (!items) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const logEntry: OperationLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      operationType: 'UNIGNORE',
      targetType: item.type,
      ruleDescription: '取消忽略',
      fileId,
      sensitiveItemId: itemId,
      originalContent: '[已忽略]',
      resultContent: item.originalText,
    };

    set((s) => ({
      sensitiveItemsMap: {
        ...s.sensitiveItemsMap,
        [fileId]: s.sensitiveItemsMap[fileId].map((i) =>
          i.id === itemId ? { ...i, isIgnored: false } : i
        ),
      },
      operationLogs: [...s.operationLogs, logEntry],
    }));
  },

  autoDesensitizeAll: (fileId) => {
    const state = get();
    const items = state.sensitiveItemsMap[fileId];
    if (!items) return;

    const updatedItems = autoDesensitize(items, state.desensitizeRules);

    // 记录日志
    const newLogs: OperationLogEntry[] = [];
    for (const item of updatedItems) {
      const original = items.find((i) => i.id === item.id);
      if (original && !original.isDesensitized && item.isDesensitized) {
        const rule = findRuleForType(item.type, state.desensitizeRules);
        newLogs.push({
          id: generateId(),
          timestamp: new Date().toISOString(),
          operationType: 'AUTO_DESENSITIZE',
          targetType: item.type,
          ruleDescription: `自动脱敏 - ${rule.strategy}`,
          fileId,
          sensitiveItemId: item.id,
          originalContent: item.originalText,
          resultContent: item.desensitizedText,
        });
      }
    }

    set((s) => ({
      sensitiveItemsMap: { ...s.sensitiveItemsMap, [fileId]: updatedItems },
      operationLogs: [...s.operationLogs, ...newLogs],
    }));
  },

  batchDesensitizeType: (fileId, type) => {
    const state = get();
    const items = state.sensitiveItemsMap[fileId];
    if (!items) return;

    const updatedItems = batchDesensitizeByType(
      items,
      type,
      state.desensitizeRules
    );

    const newLogs: OperationLogEntry[] = [];
    for (const item of updatedItems) {
      const original = items.find((i) => i.id === item.id);
      if (original && !original.isDesensitized && item.isDesensitized) {
        const rule = findRuleForType(item.type, state.desensitizeRules);
        newLogs.push({
          id: generateId(),
          timestamp: new Date().toISOString(),
          operationType: 'BATCH_DESENSITIZE',
          targetType: item.type,
          ruleDescription: `批量脱敏 - ${rule.strategy}`,
          fileId,
          sensitiveItemId: item.id,
          originalContent: item.originalText,
          resultContent: item.desensitizedText,
        });
      }
    }

    set((s) => ({
      sensitiveItemsMap: { ...s.sensitiveItemsMap, [fileId]: updatedItems },
      operationLogs: [...s.operationLogs, ...newLogs],
    }));
  },

  undo: () => {
    const state = get();
    if (state.undoStack.length === 0) return;

    const lastEntry = state.undoStack[state.undoStack.length - 1];
    const { fileId, sensitiveItemId, previousState } = lastEntry;

    const items = state.sensitiveItemsMap[fileId];
    if (!items) return;

    const item = items.find((i) => i.id === sensitiveItemId);
    if (!item) return;

    set((s) => ({
      sensitiveItemsMap: {
        ...s.sensitiveItemsMap,
        [fileId]: s.sensitiveItemsMap[fileId].map((i) =>
          i.id === sensitiveItemId
            ? {
                ...i,
                isDesensitized: previousState.isDesensitized,
                desensitizedText: previousState.desensitizedText,
                isIgnored: previousState.isIgnored,
              }
            : i
        ),
      },
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, lastEntry],
    }));
  },

  redo: () => {
    const state = get();
    if (state.redoStack.length === 0) return;

    const lastEntry = state.redoStack[state.redoStack.length - 1];
    const { fileId, sensitiveItemId } = lastEntry;

    // Re-apply the desensitize action
    const items = state.sensitiveItemsMap[fileId];
    if (!items) return;

    const item = items.find((i) => i.id === sensitiveItemId);
    if (!item) return;

    const rule = findRuleForType(item.type, state.desensitizeRules);
    const updatedItem = item.isIgnored
      ? item
      : desensitizeSingleItem(item, state.desensitizeRules);

    set((s) => ({
      sensitiveItemsMap: {
        ...s.sensitiveItemsMap,
        [fileId]: s.sensitiveItemsMap[fileId].map((i) =>
          i.id === sensitiveItemId ? updatedItem : i
        ),
      },
      undoStack: [...s.undoStack, lastEntry],
      redoStack: s.redoStack.slice(0, -1),
    }));
  },

  updateRule: (rule) =>
    set((state) => ({
      desensitizeRules: state.desensitizeRules.map((r) =>
        r.type === rule.type ? rule : r
      ),
    })),

  addCustomRegexRule: (rule) =>
    set((state) => ({
      customRegexRules: [...state.customRegexRules, rule],
    })),

  removeCustomRegexRule: (ruleId) =>
    set((state) => ({
      customRegexRules: state.customRegexRules.filter((r) => r.id !== ruleId),
    })),

  setDesensitizeMode: (mode) => set({ desensitizeMode: mode }),

  setCompareMode: (mode) => set({ compareMode: mode }),

  setContextMenu: (state) => set({ contextMenu: state }),

  showSnackbar: (message) => set({ snackbarMessage: message }),

  hideSnackbar: () => set({ snackbarMessage: null }),

  setExportDialogOpen: (open) => set({ exportDialogOpen: open }),

  setLoading: (loading) => set({ loading }),

  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),

  batchUndoDesensitizeByType: (fileId, type) => {
    const state = get();
    const items = state.sensitiveItemsMap[fileId];
    if (!items) return;

    const newLogs: OperationLogEntry[] = [];
    const updatedItems = items.map((item) => {
      if (item.type !== type || !item.isDesensitized) return item;
      newLogs.push({
        id: generateId(),
        timestamp: new Date().toISOString(),
        operationType: 'BATCH_UNDO_DESENSITIZE',
        targetType: item.type,
        ruleDescription: '批量取消脱敏',
        fileId,
        sensitiveItemId: item.id,
        originalContent: item.desensitizedText,
        resultContent: item.originalText,
      });
      return { ...item, isDesensitized: false, desensitizedText: '' };
    });

    set((s) => ({
      sensitiveItemsMap: { ...s.sensitiveItemsMap, [fileId]: updatedItems },
      operationLogs: [...s.operationLogs, ...newLogs],
    }));
  },

  undoAllDesensitize: (fileId) => {
    const state = get();
    const items = state.sensitiveItemsMap[fileId];
    if (!items) return;

    const newLogs: OperationLogEntry[] = [];
    const updatedItems = items.map((item) => {
      if (!item.isDesensitized) return item;
      newLogs.push({
        id: generateId(),
        timestamp: new Date().toISOString(),
        operationType: 'UNDO_ALL_DESENSITIZE',
        targetType: item.type,
        ruleDescription: '全部取消脱敏',
        fileId,
        sensitiveItemId: item.id,
        originalContent: item.desensitizedText,
        resultContent: item.originalText,
      });
      return { ...item, isDesensitized: false, desensitizedText: '' };
    });

    set((s) => ({
      sensitiveItemsMap: { ...s.sensitiveItemsMap, [fileId]: updatedItems },
      undoStack: [],
      redoStack: [],
      operationLogs: [...s.operationLogs, ...newLogs],
    }));
  },

  editItemText: (fileId, itemId, newText) => {
    const state = get();
    const items = state.sensitiveItemsMap[fileId];
    if (!items) return;

    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const logEntry: OperationLogEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      operationType: 'EDIT',
      targetType: item.type,
      ruleDescription: '手动编辑替换内容',
      fileId,
      sensitiveItemId: itemId,
      originalContent: item.desensitizedText || item.originalText,
      resultContent: newText,
    };

    set((s) => ({
      sensitiveItemsMap: {
        ...s.sensitiveItemsMap,
        [fileId]: s.sensitiveItemsMap[fileId].map((i) =>
          i.id === itemId
            ? { ...i, isDesensitized: true, desensitizedText: newText }
            : i
        ),
      },
      operationLogs: [...s.operationLogs, logEntry],
    }));
  },
}));
