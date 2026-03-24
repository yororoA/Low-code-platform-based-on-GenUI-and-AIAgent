export interface ComponentMeta {
  name: string
  description: string
  propsSchema: Record<string, string>
  dslExample: {
    type: string
    props: Record<string, unknown>
  }
}

/**
 * 原子组件元信息，用于提示词构建、DSL 生成与组件检索。
 */
export const componentsMeta: ComponentMeta[] = [
  {
    name: "Card",
    description: "基础卡片容器。必须与其子组件 (CardHeader, CardTitle, CardDescription, CardContent, CardFooter) 组合使用来构建完整的卡片结构。",
    propsSchema: {
      className: "string（控制卡片的外边距、阴影、边框等 Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Card",
      props: { className: "w-full max-w-md shadow-md border" },
    },
  },
  {
    name: "CardHeader",
    description: "卡片的头部区域包裹器。通常在内部放置 CardTitle 和 CardDescription。",
    propsSchema: {
      className: "string（Tailwind CSS 类名，控制内边距、对齐等）",
    },
    dslExample: {
      type: "CardHeader",
      props: { className: "flex flex-col space-y-1.5 p-6" },
    },
  },
  {
    name: "CardTitle",
    description: "卡片的主标题。",
    propsSchema: {
      className: "string（Tailwind CSS 类名，控制字体大小、颜色等）",
    },
    dslExample: {
      type: "CardTitle",
      props: { className: "text-2xl font-bold" },
    },
  },
  {
    name: "CardDescription",
    description: "卡片的次要描述副标题。",
    propsSchema: {
      className: "string（Tailwind CSS 类名，控制字体颜色、大小等）",
    },
    dslExample: {
      type: "CardDescription",
      props: { className: "text-sm text-gray-500" },
    },
  },
  {
    name: "CardContent",
    description: "卡片的核心内容区域包裹器。可以在里面放置任意其他组件（如表单、列表等）。",
    propsSchema: {
      className: "string（Tailwind CSS 类名，控制内边距、布局等）",
    },
    dslExample: {
      type: "CardContent",
      props: { className: "p-6 pt-0" },
    },
  },
  {
    name: "CardFooter",
    description: "卡片的底部操作区域包裹器。通常在内部放置按钮等交互元素。",
    propsSchema: {
      className: "string（Tailwind CSS 类名，控制内边距、对齐等）",
    },
    dslExample: {
      type: "CardFooter",
      props: { className: "flex items-center justify-end p-6 pt-0" },
    },
  },
  {
    name: "Button",
    description: "基础按钮组件。适合作为触控操作入口。",
    propsSchema: {
      variant: '"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"（按钮主要视觉风格）',
      size: '"default" | "sm" | "lg" | "icon"（按钮尺寸类型）',
      className: "string（补充的 Tailwind CSS 类名，用于控制间距、宽度等）",
    },
    dslExample: {
      type: "Button",
      props: { variant: "default", size: "sm", className: "w-full" },
    },
  },
  {
    name: "Badge",
    description: "徽章组件。用于展示状态、标签等短文本。",
    propsSchema: {
      variant: '"default" | "secondary" | "destructive" | "outline"（视觉变体）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Badge",
      props: { variant: "outline", className: "ml-2" },
    },
  },
  {
    name: "Accordion",
    description: "折叠面板父容器。必须与 AccordionItem, AccordionTrigger, AccordionContent 组合使用。",
    propsSchema: {
      type: '"single" | "multiple"（展开模式，single 为互斥单开，multiple 为多开）',
      collapsible: "boolean（single 模式下是否允许全部折叠）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Accordion",
      props: { type: "single", collapsible: true, className: "w-full" },
    },
  },
  {
    name: "AccordionItem",
    description: "折叠面板的单个项目包裹器。放在 Accordion 内部。",
    propsSchema: {
      value: "string（该项的唯一标识值，必需）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AccordionItem",
      props: { value: "item-1" },
    },
  },
  {
    name: "AccordionTrigger",
    description: "折叠面板的触发按钮/标题栏。放在 AccordionItem 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名，控制字体、间距等）",
    },
    dslExample: {
      type: "AccordionTrigger",
      props: { className: "text-lg font-medium" },
    },
  },
  {
    name: "AccordionContent",
    description: "折叠面板展开后的内容区域容器。放在 AccordionItem 内部，与 Trigger 平级。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AccordionContent",
      props: { className: "text-gray-600" },
    },
  },
  {
    name: "Avatar",
    description: "头像最外层容器（提供圆形遮罩）。内部应包含 AvatarImage 和 AvatarFallback。",
    propsSchema: {
      className: "string（Tailwind CSS 类名，主要用于控制宽高，如 h-10 w-10）",
    },
    dslExample: {
      type: "Avatar",
      props: { className: "h-12 w-12" },
    },
  },
  {
    name: "AvatarImage",
    description: "头像所显示的网络图片。放在 Avatar 内部。",
    propsSchema: {
      src: "string（图片地址URL）",
      alt: "string（图片描述文本，用于无障碍）",
    },
    dslExample: {
      type: "AvatarImage",
      props: { src: "https://github.com/shadcn.png", alt: "@shadcn" },
    },
  },
  {
    name: "AvatarFallback",
    description: "当 AvatarImage 图片加载失败或未提供时的默认降级显示（通常展示用户缩写字母）。放在 Avatar 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名，控制背景色、文字颜色等）",
    },
    dslExample: {
      type: "AvatarFallback",
      props: { className: "bg-gray-200 text-gray-800" },
    },
  },
  {
    name: "Separator",
    description: "纯视觉分隔线，用于划分不同内容区域。",
    propsSchema: {
      orientation: '"horizontal" | "vertical"（方向类型）',
      className: "string（Tailwind CSS 类名，控制边距和颜色等）",
    },
    dslExample: {
      type: "Separator",
      props: { orientation: "horizontal", className: "my-4" },
    },
  },
  {
    name: "Label",
    description: "文本标签，通常用于表单项之前的强调说明。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Label",
      props: { className: "text-sm font-medium leading-none focus:outline-none" },
    },
  },
  {
    name: "div",
    description: "最基础也最核心的 HTML 原生布局标签。当你需要使用 Flexbox (flex) 或 Grid (grid) 对其他组件进行排版定位，或者仅仅是包裹几个相邻组件时，使用它。",
    propsSchema: {
      className: "string (Tailwind CSS 布局/样式参数。例如 flex flex-col gap-4, grid grid-cols-2 等等)",
    },
    dslExample: {
      type: "div",
      props: { className: "flex flex-row items-center justify-between p-4 bg-gray-50 rounded-lg" },
    },
  },
  {
    name: "span",
    description: "基础的 HTML 原生行内元素标签。常用于包裹纯文本修改局部文字颜色或大小。",
    propsSchema: {
      className: "string (Tailwind CSS 参数)",
    },
    dslExample: {
      type: "span",
      props: { className: "text-red-500 font-bold" },
    },
  },
  {
    name: "img",
    description: "原生 HTML 图片标签，用于展示外部图片。",
    propsSchema: {
      src: "string（图片地址URL）",
      alt: "string（图片描述文本）",
      className: "string (Tailwind CSS 参数，用于控制宽高等)",
    },
    dslExample: {
      type: "img",
      props: { src: "/placeholder.png", alt: "logo", className: "w-16 h-16 object-cover rounded" },
    },
  },
  {
    name: "text",
    description: "代表无包裹的纯文本节点。仅用于作为其他容器（如 div, Button, CardTitle, span 等）的最内层直接内容。",
    propsSchema: {
      content: "string (需要展示的实际字符串文本内容。注意：此内容需填入 text 节点的 props.content 字段中。)",
    },
    dslExample: {
      type: "text",
      props: { content: "这是纯文本" },
    },
  }
]

export const componentsMetaByName: Record<string, ComponentMeta> = Object.fromEntries(
  componentsMeta.map((meta) => [meta.name, meta])
)
