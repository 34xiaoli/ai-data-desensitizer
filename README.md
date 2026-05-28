# AI 脱敏工具

> 智能敏感信息检测与脱敏解决方案

一款基于 AI 技术的智能文档脱敏工具，支持 PDF、Word、Excel 三种主流格式，提供智能检测、可视化编辑和批量处理功能。所有处理均在本地完成，确保数据安全。

## 核心特性

**智能识别**
- AI 驱动的敏感信息自动检测
- 支持多种敏感数据类型：身份证号、手机号、银行卡号、邮箱、信用代码等
- 智能人名识别（基于上下文语义分析）
- 支持自定义正则规则扩展

**多格式支持**
- PDF 文档（基于 pdf.js 高精度解析）
- Word 文档（.docx/.doc）
- Excel 表格（.xlsx/.xls）

**灵活脱敏策略**
- **部分遮盖**：智能保留关键位，如身份证保留前3后4位
- **完全遮盖**：全部替换为指定字符
- **占位符替换**：使用自定义文本占位
- 支持按类型配置不同策略

**可视化操作**
- 三栏式专业界面：文件列表 + 工作区 + 检测面板
- 分屏对比视图（原始内容 vs 脱敏内容）
- 实时高亮敏感信息
- 单项/批量操作，一键撤销

**数据安全保障**
- 100% 本地处理，零上传
- 不依赖外部 API 或服务
- 支持离线使用
- 适合涉密文档处理

## 技术栈

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite 5
- **UI 组件**：Material-UI v5
- **样式方案**：Tailwind CSS + Emotion
- **状态管理**：Zustand
- **文档解析**：pdfjs-dist / mammoth / SheetJS
- **测试**：Vitest

## 快速开始

### 环境要求

- Node.js >= 18.0.0
- npm >= 9.0.0 或 pnpm >= 8.0.0

### 安装

```bash
# 克隆仓库
git clone https://github.com/34xiaoli/ai-data-desensitizer.git

# 进入目录
cd ai-data-desensitizer

# 安装依赖（推荐使用 pnpm）
npm install
```

### 开发

```bash
# 启动开发服务器
npm run dev

# 访问 http://localhost:5173
```

### 构建

```bash
# 生产构建
npm run build

# 预览构建结果
npm run preview
```

## 使用指南

### 1. 上传文档

- 点击左侧"上传文件"按钮
- 支持拖拽上传
- 支持批量上传（PDF、Word、Excel）

### 2. AI 智能检测

文档上传后自动启动 AI 检测：
- 自动识别敏感信息类型
- 高亮标记所有敏感项
- 右侧面板显示检测结果
- 支持按类型筛选查看

### 3. 脱敏操作

**自动脱敏**
- 点击"一键脱敏"按钮
- AI 自动应用最优脱敏策略

**手动脱敏**
- 单击敏感项的脱敏按钮
- 右键菜单选择"脱敏此项"
- 勾选多项后批量脱敏

**撤销操作**
- 单项撤销脱敏
- 一键撤销所有操作
- 操作日志支持回溯

### 4. 规则配置

在"规则"面板中：
- 启用/禁用特定检测类型
- 调整脱敏策略参数
- 自定义遮盖字符和占位符
- 添加自定义正则规则

### 5. 导出结果

支持多种导出格式：
- **原格式导出**：PDF/Word/Excel 保持原格式
- **Markdown 报告**：包含脱敏统计和完整内容
- **规则配置**：导出当前配置为 JSON

## 默认脱敏规则

| 敏感类型 | 策略 | 示例 |
|---------|------|------|
| 身份证号 | 保留前3后4位 | `110***********1234` |
| 手机号 | 保留前3后4位 | `138****5678` |
| 银行卡号 | 保留前4后4位 | `6222************3456` |
| 邮箱 | 保留前2位 | `ab***@example.com` |
| 统一信用代码 | 保留前4后4位 | `9111**********5678` |
| 金额 | 占位符替换 | `[已脱敏]` |
| 人名 | 保留首字 | `张**` |
| 自定义 | 完全遮盖 | `********` |

## 自定义规则

支持添加自定义正则规则：

```json
{
  "name": "员工工号",
  "pattern": "EMP\\d{6}",
  "sensitiveType": "CUSTOM",
  "enabled": true
}
```

## 项目结构

```
ai-data-desensitizer/
├── src/
│   ├── components/       # UI 组件
│   │   ├── Layout.tsx
│   │   ├── FileUpload.tsx
│   │   ├── FileList.tsx
│   │   ├── DocumentViewer.tsx
│   │   ├── CompareView.tsx
│   │   ├── DetectionPanel.tsx
│   │   ├── RuleConfig.tsx
│   │   ├── DesensitizeToolbar.tsx
│   │   ├── ExportDialog.tsx
│   │   └── OperationLog.tsx
│   ├── engine/           # 核心引擎
│   │   ├── detector.ts   # AI 检测引擎
│   │   ├── desensitizer.ts
│   │   ├── parsers.ts
│   │   └── rules.ts
│   ├── store/            # 状态管理
│   ├── types/            # TypeScript 类型
│   ├── utils/            # 工具函数
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 开发命令

```bash
npm run dev      # 启动开发服务器
npm run build    # 类型检查 + 构建
npm run test     # 运行测试
npm run preview  # 预览构建结果
```

## 注意事项

1. **文件大小**：建议单个文件 < 50MB
2. **格式支持**：
   - PDF：标准 PDF（扫描件需 OCR 预处理）
   - Word：优先 .docx
   - Excel：.xlsx/.xls（不支持加密文件）
3. **浏览器**：推荐 Chrome 90+ / Firefox 88+ / Safari 14+
4. **性能**：处理大型文件时建议关闭其他标签页

## 隐私与安全

- 所有文档解析和脱敏均在浏览器本地完成
- 不依赖任何外部服务或 API
- 不收集、上传、存储任何用户数据
- 完全离线可用
- 适合处理涉密或敏感文档

## 许可证

MIT License

## 联系方式

QQ: 2726539212

## 贡献

欢迎提交 Issue 和 Pull Request！

提交前请确保：
1. 代码通过 TypeScript 类型检查
2. 新功能有对应测试
3. 遵循现有代码风格

---

**AI 脱敏工具** - 让敏感信息处理更智能、更安全
