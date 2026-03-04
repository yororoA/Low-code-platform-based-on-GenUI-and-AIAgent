This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

```Text
src/
├── app/                 # 1. 路由与页面 (只有页面文件)
│   ├── (auth)/          # 路由分组（如登录注册）
│   ├── editor/          # 低代码编辑器页面
│   │   └── page.tsx     
│   └── layout.tsx       
│
├── components/          # 2. UI 组件
│   ├── ui/              # 原子组件（Button, Input, 建议用 shadcn/ui）
│   ├── editor/          # 编辑器专用的复杂组件（画布、属性面板）
│   └── shared/          # 跨页面共享的业务组件
│
├── lib/                 # 3. 核心库逻辑
│   ├── utils.ts         # 工具函数（如格式化代码、合并 Tailwind 类）
│   ├── client.ts        # API 客户端配置 (如 Axios/Prisma)
│   └── engine/          # 低代码引擎的核心逻辑（渲染器、解析器）
│
├── hooks/               # 4. 自定义 React Hooks
│   ├── use-editor.ts    # 拖拽状态管理 Hook
│   └── use-api.ts       
│
├── store/               # 5. 状态管理 (Zustand 或 Redux)
│   └── editor-store.ts  # 管理低代码生成的 JSON 配置状态
│
├── types/               # 6. TypeScript 类型定义
│   └── schema.d.ts      # 低代码组件的接口定义
│
└── styles/              # 7. 额外的样式 (如果 globals.css 太大)
```
