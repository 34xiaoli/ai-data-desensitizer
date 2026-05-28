# 审计文档智能脱敏可视化工具

一个专业的审计文档敏感信息脱敏工具，支持 PDF、Word、Excel 三种格式，提供智能检测、可视化编辑和批量处理功能。

## 核心特性

**多格式支持**
- PDF 文档（基于 pdf.js 解析）
- Word 文档（.docx/.doc，基于 mammoth）
- Excel 表格（.xlsx/.xls，基于 SheetJS）

**智能敏感信息检测**
- 身份证号（15位/18位）
- 手机号码（中国大陆）
- 银行卡号（16-19位）
- 邮箱地址
- 统一社会信用代码
- 金额/财务数据
- 人名（基于称谓识别）
- 自定义正则规则

**灵活的脱敏策略**
- **部分遮盖**：保留前后N位，中间用指定字符遮盖
- **完全遮盖**：全部替换为遮盖字符
- **占位符替换**：使用自定义占位符文本

**可视化操作界面**
- 左侧文件列表，中间工作区，右侧检测面板
- 支持分屏对比视图（原始内容 vs 脱敏内容）
- 实时高亮标记敏感信息
- 单项/批量脱敏操作
- 操作日志追踪

**本地处理，数据安全**
- 所有解析和脱敏操作均在浏览器本地完成
- 数据不会上传至任何服务器
- 支持离线使用

## 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **UI 组件库**：Material-UI (MUI) v5
- **样式方案**：Tailwind CSS + Emotion
- **状态管理**：Zustand
- **文档解析**：
  - PDF: pdfjs-dist
  - Word: mammoth
  - Excel: xlsx (SheetJS)
- **测试框架**：Vitest

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm >= 8.0.0

### 安装依赖

```bash
# 使用 npm
npm install

# 或使用 pnpm（推荐）
pnpm install
```

### 开发模式

```bash
npm run dev
```

访问 http://localhost:5173 即可使用。

### 生产构建

```bash
npm run build
```

构建产物位于 `dist/` 目录。

### 预览构建结果

```bash
npm run preview
```

## 使用指南

### 1. 上传文档

点击左侧面板的"上传文件"按钮，或拖拽文件到上传区域。支持批量上传多个文档。

### 2. 查看检测结果

文档上传后，系统自动解析并检测敏感信息：
- 右侧"检测"面板显示所有检测到的敏感项
- 中间工作区高亮标记敏感内容
- 支持按类型筛选查看

### 3. 执行脱敏

**自动脱敏**
点击顶部工具栏的"一键脱敏"按钮，自动对所有检测到的敏感信息应用默认规则。

**手动脱敏**
- 单击敏感项右侧的脱敏按钮
- 右键菜单选择"脱敏此项"
- 在检测面板中勾选多项，点击"批量脱敏"

**撤销操作**
- 单击"撤销"按钮恢复最近一次操作
- 点击敏感项的"撤销脱敏"恢复原始内容
- 使用"撤销所有"一键恢复全部

### 4. 配置规则

切换到右侧"规则"面板：
- 启用/禁用特定类型的检测
- 调整脱敏策略（部分遮盖、完全遮盖、占位符）
- 自定义遮盖字符和占位符文本
- 添加自定义正则规则

### 5. 导出结果

点击"导出"按钮，选择导出格式：
- **脱敏后文档**：PDF/Word/Excel 原格式导出
- **Markdown 报告**：包含脱敏统计和完整内容
- **规则配置**：导出当前规则为 JSON，方便复用

### 6. 查看日志

"日志"面板记录所有操作：
- 脱敏/撤销操作
- 忽略/取消忽略
- 批量操作记录
- 支持按时间、类型筛选

## 默认脱敏规则

| 敏感类型 | 默认策略 | 示例 |
|---------|---------|------|
| 身份证号 | 保留前3后4位 | 110***********1234 |
| 手机号 | 保留前3后4位 | 138****5678 |
| 银行卡号 | 保留前4后4位 | 6222************3456 |
| 邮箱 | 保留前2位 | ab***@example.com |
| 信用代码 | 保留前4后4位 | 9111**********5678 |
| 金额 | 占位符替换 | [已脱敏] |
| 人名 | 保留首字 | 张** |
| 自定义 | 完全遮盖 | ******** |

## 自定义规则示例

在规则面板中添加自定义正则规则：

```json
{
  "name": "工号检测",
  "pattern": "EMP\\d{6}",
  "sensitiveType": "CUSTOM",
  "enabled": true
}
```

## 项目结构

```
audit-desensitizer/
├── src/
│   ├── components/          # UI 组件
│   │   ├── Layout.tsx       # 主布局
│   │   ├── FileUpload.tsx   # 文件上传
│   │   ├── FileList.tsx     # 文件列表
│   │   ├── DocumentViewer.tsx # 文档查看器
│   │   ├── CompareView.tsx  # 对比视图
│   │   ├── DetectionPanel.tsx # 检测面板
│   │   ├── RuleConfig.tsx   # 规则配置
│   │   ├── DesensitizeToolbar.tsx # 脱敏工具栏
│   │   ├── ExportDialog.tsx # 导出对话框
│   │   └── OperationLog.tsx # 操作日志
│   ├── engine/              # 核心引擎
│   │   ├── detector.ts      # 敏感信息检测
│   │   ├── desensitizer.ts  # 脱敏处理
│   │   ├── parsers.ts       # 文档解析
│   │   └── rules.ts         # 默认规则
│   ├── store/               # 状态管理
│   │   └── useAppStore.ts   # Zustand store
│   ├── types/               # 类型定义
│   │   └── index.ts         # TypeScript 类型
│   ├── utils/               # 工具函数
│   │   └── helpers.ts       # 辅助函数
│   ├── App.tsx              # 应用入口
│   ├── main.tsx             # 渲染入口
│   └── index.css            # 全局样式
├── package.json
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 配置
└── tailwind.config.js       # Tailwind 配置
```

## 开发命令

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 类型检查
npm run build

# 运行测试
npm run test

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 注意事项

1. **文件大小限制**：建议单个文件不超过 50MB，大文件可能导致浏览器卡顿
2. **格式兼容性**：
   - PDF：支持标准 PDF，扫描件需 OCR 预处理
   - Word：优先支持 .docx，.doc 格式支持有限
   - Excel：支持 .xlsx/.xls，不支持加密文件
3. **浏览器兼容**：推荐使用 Chrome 90+、Firefox 88+、Safari 14+
4. **性能优化**：处理大型 Excel 文件时建议关闭其他浏览器标签页

## 隐私与安全

- 所有文档解析和脱敏操作均在浏览器本地完成
- 不依赖任何外部 API 或服务
- 不收集、上传、存储任何用户数据
- 适合处理涉密或敏感文档

## 许可证

MIT License

## 贡献指南

欢迎提交 Issue 和 Pull Request。在提交 PR 前，请确保：

1. 代码通过 TypeScript 类型检查
2. 新功能有对应的单元测试
3. 遵循现有代码风格

## 联系方式

如有问题或建议，请在 GitHub Issues 中反馈。
