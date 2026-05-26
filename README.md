# Low-Code GenUI

基于 AI Agent 的低代码 UI 生成平台。通过自然语言对话快速构建用户界面，可视化编排工作流，让开发更高效。

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Next.js 16 (App Router) + React 19 + TypeScript |
| AI 编排 | LangChain + LangGraph |
| 模型提供商 | OpenAI / DeepSeek / Qwen / 智谱 / MiniMax / Anthropic / Google |
| 状态管理 | Zustand + Immer |
| UI 组件 | shadcn/ui (Radix UI) + Tailwind CSS v4 |
| 工作流可视化 | @xyflow/react (React Flow) |
| 数据存储 | IndexedDB (浏览器本地) |
| 流式通信 | SSE (Server-Sent Events) + Web Worker |

## 核心功能

### AI 对话生成 UI

通过自然语言描述需求，AI Agent 自动完成三阶段流水线：

1. **Admin Agent** — 分析用户意图，判断是否需要生成 UI，提取 UI 组件需求
2. **Structure Agent** — 生成 UI 树结构（uiTree JSON），定义组件层级和交互槽位
3. **Style Agent** — 为每个组件节点生成 Tailwind CSS 样式

中间经过 **Alignment Agent** 校验结构输出与需求的对齐度，不达标则自动重试。

### 工作流编排

基于 React Flow 的可视化拖拽编辑器，支持 5 种节点类型：

- **Input** — 用户输入节点
- **Requirement** — 需求注入节点
- **Agent** — AI 处理节点（设计/构建/审查三种类型）
- **Branch** — 条件分支节点（LLM 评估条件，动态路由）
- **Output** — 输出收集节点

工作流通过 LangGraph 动态构建执行图，支持流式执行和实时状态追踪。

### 交互式 UI

生成的 UI 支持六种交互模式：

- **Navigation** — 页面导航跳转
- **StateChange** — 状态变更（显示/隐藏/切换样式/替换内容）
- **FormSubmit** — 表单提交
- **ModalOpen** — 弹窗打开（Dialog/Sheet/Drawer/Popover）
- **DataFetch** — 数据获取
- **Custom** — 自定义交互

### 模型配置

前端设置页面支持动态配置模型厂商和 API Key，无需修改环境变量即可切换提供商。API Key 仅存储在浏览器本地，通过请求头传递给后端。

## 项目结构

```
src/
├── app/
│   ├── api/
│   │   ├── chat/
│   │   │   ├── route.ts          # 聊天 API（LangGraph 流式执行）
│   │   │   ├── config/route.ts   # 模型配置 API
│   │   │   ├── interaction/      # 交互事件 API
│   │   │   ├── style-edit/       # 样式编辑 API
│   │   │   ├── state.ts          # LangGraph 状态定义
│   │   │   ├── nodes.ts          # 图节点函数
│   │   │   ├── graph.ts          # 图构建器
│   │   │   ├── llm.ts            # 模型工厂
│   │   │   ├── sse.ts            # SSE 事件编码
│   │   │   ├── prompt.ts         # System Prompt 模板
│   │   │   ├── model.ts          # 类型重导出
│   │   │   ├── schema.ts         # （已迁移）
│   │   │   └── tools.ts          # （已迁移）
│   │   └── workflow/
│   │       ├── route.ts          # 工作流执行 API
│   │       └── graph.ts          # 动态工作流图构建器
│   └── studio/
│       ├── layout.tsx            # Studio 布局（侧边栏+预览面板）
│       ├── page.tsx              # 主页
│       ├── basicUI.tsx           # 聊天界面
│       ├── homeUI.tsx            # 首页
│       ├── settings/page.tsx     # 设置页面
│       ├── prompts/              # 对话历史
│       └── workflows/            # 工作流管理
├── components/
│   ├── ui/                       # shadcn/ui 组件库
│   ├── components-meta.ts        # 组件元数据注册表
│   └── workflow/
│       └── WorkflowNodes.tsx     # 工作流节点定义
├── lib/
│   ├── renderByAST.tsx           # AST 渲染引擎（JSON → React 组件）
│   ├── interactionResolver.ts    # 交互解析器
│   ├── pageManager.ts            # 多页面管理
│   ├── dispatchEvent.ts          # 自定义事件系统
│   ├── dbtest.ts                 # IndexedDB 管理器
│   ├── chatMessagesProcessing.ts # 消息去重
│   ├── getShowResponsePayload.ts # 提取 UI 渲染数据
│   ├── hexStr.ts                 # ID 生成
│   └── utils.ts                  # 工具函数
├── store/
│   ├── chatStreamingStore.ts     # 聊天流式状态（Zustand）
│   └── workflowStore.ts          # 工作流状态（Zustand）
├── types/
│   ├── chatStreamingTypes.ts     # AgentMessage 类型
│   ├── dbAbout.ts                # 数据库类型
│   ├── workflow.ts               # 工作流类型
│   └── interaction.ts            # 交互类型
└── workers/
    ├── chatStreamingWorker.ts    # SSE 流式解析 Web Worker
    └── chatDBWorker.ts           # IndexedDB 操作 Web Worker
```

## 快速开始

### 环境要求

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 配置环境变量

创建 `.env.local` 文件：

```env
# 模型提供商（可选，默认 openai）
# 可选值：openai | google | anthropic | deepseek | qwen | zai | minimax
GENUI_MODEL_PROVIDER=openai

# API Key（按使用的提供商配置对应的 Key）
OPENAI_API_KEY=sk-your-openai-api-key
# ANTHROPIC_API_KEY=your-anthropic-key
# GOOGLE_GENERATIVE_AI_API_KEY=your-google-key

# 自定义 Base URL（可选，用于代理或自建服务）
# OPENAI_BASE_URL=https://your-proxy.example.com/v1

# 通用备用 Key（可选，当上述特定 Key 未配置时使用）
# GENUI_API_KEY=your-fallback-key
# GENUI_BASE_URL=your-fallback-base-url
```

> 也可以不配置环境变量，直接在前端设置页面（`/studio/settings`）配置模型厂商和 API Key。

### 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 即可使用。

### 构建生产版本

```bash
npm run build
npm run start
```

## 支持的模型提供商

| 提供商 | provider 值 | 默认模型 | 需要 Base URL |
|--------|-------------|----------|--------------|
| OpenAI | `openai` | gpt-4o | 否 |
| Google | `google` | gemini-2.0-flash | 否 |
| Anthropic | `anthropic` | claude-sonnet-4-20250514 | 否 |
| DeepSeek | `deepseek` | deepseek-chat | 自动填充 |
| 通义千问 | `qwen` | qwen-max | 自动填充 |
| 智谱 | `zai` | glm-4-plus | 自动填充 |
| MiniMax | `minimax` | minimax-01 | 自动填充 |

所有提供商均通过 OpenAI 兼容 API 接入，支持自定义 Base URL。

## 架构说明

### Agent 图架构

```
用户消息 → [Admin] → 是否需要UI？
                         ├─ 否 → 返回文本
                         └─ 是 → [Structure] → [Alignment] → 对齐度≥85？
                                                        ├─ 是 → [Style] → 返回UI
                                                        └─ 否 → 重试Structure（最多10次）
```

### 数据流

```
前端输入 → chatStreamingWorker (Web Worker)
         → fetch /api/chat (附带 LLM 配置头)
         → LangGraph 图执行
         → SSE 流式事件
         → chatStreamingWorker 解析
         → Zustand Store 更新
         → React UI 重渲染
```

## 开发

### 代码检查

```bash
npm run lint
```

### 类型检查

```bash
npx tsc --noEmit
```

## License

Private
