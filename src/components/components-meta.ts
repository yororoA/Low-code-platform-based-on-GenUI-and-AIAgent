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
  },

  // ─── Input ───
  {
    name: "Input",
    description: "单行文本输入框。支持所有原生 input 属性（type, placeholder, disabled 等）。",
    propsSchema: {
      type: 'string（原生 input type，如 "text" | "password" | "email" | "number" 等）',
      placeholder: "string（占位提示文本）",
      disabled: "boolean（是否禁用）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Input",
      props: { type: "text", placeholder: "请输入内容...", className: "w-full" },
    },
  },

  // ─── Textarea ───
  {
    name: "Textarea",
    description: "多行文本输入框。支持所有原生 textarea 属性。",
    propsSchema: {
      placeholder: "string（占位提示文本）",
      disabled: "boolean（是否禁用）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Textarea",
      props: { placeholder: "请输入详细描述...", className: "w-full min-h-24" },
    },
  },

  // ─── Checkbox ───
  {
    name: "Checkbox",
    description: "复选框组件。可单独使用或在 Field 中配合 Label 使用。",
    propsSchema: {
      checked: 'boolean | "indeterminate"（选中状态）',
      disabled: "boolean（是否禁用）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Checkbox",
      props: { checked: true },
    },
  },

  // ─── Alert 系列 ───
  {
    name: "Alert",
    description: "提示/警告容器。内部应组合 AlertTitle 和 AlertDescription。可以在最前面放置一个 svg 图标。",
    propsSchema: {
      variant: '"default" | "destructive"（视觉风格）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Alert",
      props: { variant: "default" },
    },
  },
  {
    name: "AlertTitle",
    description: "Alert 的标题文本。放在 Alert 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AlertTitle",
      props: {},
    },
  },
  {
    name: "AlertDescription",
    description: "Alert 的描述文本。放在 Alert 内部，与 AlertTitle 平级。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AlertDescription",
      props: {},
    },
  },

  // ─── AlertDialog 系列 ───
  {
    name: "AlertDialog",
    description: "警告确认弹窗的根容器。必须与 AlertDialogTrigger、AlertDialogContent 等子组件组合使用。用于需要用户确认的破坏性操作。",
    propsSchema: {
      open: "boolean（受控的打开状态）",
      onOpenChange: "function（打开状态变化回调）",
    },
    dslExample: {
      type: "AlertDialog",
      props: {},
    },
  },
  {
    name: "AlertDialogTrigger",
    description: "触发 AlertDialog 打开的按钮包裹器。放在 AlertDialog 内部。",
    propsSchema: {
      asChild: "boolean（是否使用子元素作为触发器）",
    },
    dslExample: {
      type: "AlertDialogTrigger",
      props: { asChild: true },
    },
  },
  {
    name: "AlertDialogContent",
    description: "AlertDialog 的弹窗内容面板。内部放置 Header、Footer 等。",
    propsSchema: {
      size: '"default" | "sm"（弹窗尺寸）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AlertDialogContent",
      props: { size: "default" },
    },
  },
  {
    name: "AlertDialogHeader",
    description: "AlertDialog 内容区的头部包裹器。内部放置 AlertDialogTitle 和 AlertDialogDescription。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AlertDialogHeader",
      props: {},
    },
  },
  {
    name: "AlertDialogTitle",
    description: "AlertDialog 的标题。放在 AlertDialogHeader 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AlertDialogTitle",
      props: {},
    },
  },
  {
    name: "AlertDialogDescription",
    description: "AlertDialog 的描述文本。放在 AlertDialogHeader 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AlertDialogDescription",
      props: {},
    },
  },
  {
    name: "AlertDialogFooter",
    description: "AlertDialog 底部操作按钮区域。内部放置 AlertDialogCancel 和 AlertDialogAction。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AlertDialogFooter",
      props: {},
    },
  },
  {
    name: "AlertDialogAction",
    description: "AlertDialog 的确认操作按钮。放在 AlertDialogFooter 内部。",
    propsSchema: {
      variant: '"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"（按钮风格）',
      size: '"default" | "sm" | "lg" | "icon"（按钮尺寸）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AlertDialogAction",
      props: { variant: "destructive" },
    },
  },
  {
    name: "AlertDialogCancel",
    description: "AlertDialog 的取消按钮。放在 AlertDialogFooter 内部。",
    propsSchema: {
      variant: '"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"（按钮风格，默认 outline）',
      size: '"default" | "sm" | "lg" | "icon"（按钮尺寸）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AlertDialogCancel",
      props: { variant: "outline" },
    },
  },

  // ─── Dialog 系列 ───
  {
    name: "Dialog",
    description: "通用对话框/模态框根容器。必须与 DialogTrigger、DialogContent 等子组件组合使用。",
    propsSchema: {
      open: "boolean（受控的打开状态）",
      onOpenChange: "function（打开状态变化回调）",
    },
    dslExample: {
      type: "Dialog",
      props: {},
    },
  },
  {
    name: "DialogTrigger",
    description: "触发 Dialog 打开的元素包裹器。放在 Dialog 内部。",
    propsSchema: {
      asChild: "boolean（是否使用子元素作为触发器）",
    },
    dslExample: {
      type: "DialogTrigger",
      props: { asChild: true },
    },
  },
  {
    name: "DialogContent",
    description: "Dialog 的弹窗内容面板，自带遮罩层和关闭按钮。",
    propsSchema: {
      showCloseButton: "boolean（是否显示右上角关闭按钮，默认 true）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DialogContent",
      props: { className: "sm:max-w-md" },
    },
  },
  {
    name: "DialogHeader",
    description: "Dialog 内容区的头部包裹器。内部放置 DialogTitle 和 DialogDescription。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DialogHeader",
      props: {},
    },
  },
  {
    name: "DialogTitle",
    description: "Dialog 的标题。放在 DialogHeader 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DialogTitle",
      props: {},
    },
  },
  {
    name: "DialogDescription",
    description: "Dialog 的描述文本。放在 DialogHeader 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DialogDescription",
      props: {},
    },
  },
  {
    name: "DialogFooter",
    description: "Dialog 底部操作区域。通常放置按钮。",
    propsSchema: {
      showCloseButton: "boolean（是否显示一个关闭按钮，默认 false）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DialogFooter",
      props: {},
    },
  },
  {
    name: "DialogClose",
    description: "点击后关闭 Dialog 的包裹组件。可以包裹 Button 等。",
    propsSchema: {
      asChild: "boolean（是否使用子元素作为关闭触发器）",
    },
    dslExample: {
      type: "DialogClose",
      props: { asChild: true },
    },
  },

  // ─── Table 系列 ───
  {
    name: "Table",
    description: "表格根容器。自带水平滚动溢出处理。内部组合 TableHeader、TableBody 等子组件。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Table",
      props: { className: "w-full" },
    },
  },
  {
    name: "TableHeader",
    description: "表格的 thead 区域。内部放置 TableRow。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "TableHeader",
      props: {},
    },
  },
  {
    name: "TableBody",
    description: "表格的 tbody 区域。内部放置多个 TableRow。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "TableBody",
      props: {},
    },
  },
  {
    name: "TableFooter",
    description: "表格的 tfoot 区域。内部放置 TableRow。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "TableFooter",
      props: {},
    },
  },
  {
    name: "TableRow",
    description: "表格的一行 (tr)。放在 TableHeader、TableBody 或 TableFooter 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "TableRow",
      props: {},
    },
  },
  {
    name: "TableHead",
    description: "表头单元格 (th)。放在 TableHeader 内的 TableRow 中。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "TableHead",
      props: {},
    },
  },
  {
    name: "TableCell",
    description: "表格数据单元格 (td)。放在 TableBody 内的 TableRow 中。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "TableCell",
      props: {},
    },
  },
  {
    name: "TableCaption",
    description: "表格的标题说明 (caption)。放在 Table 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "TableCaption",
      props: {},
    },
  },

  // ─── DropdownMenu 系列 ───
  {
    name: "DropdownMenu",
    description: "下拉菜单根容器。必须与 DropdownMenuTrigger 和 DropdownMenuContent 组合使用。",
    propsSchema: {
      open: "boolean（受控的打开状态）",
      onOpenChange: "function（打开状态变化回调）",
    },
    dslExample: {
      type: "DropdownMenu",
      props: {},
    },
  },
  {
    name: "DropdownMenuTrigger",
    description: "触发下拉菜单打开的元素。放在 DropdownMenu 内部。",
    propsSchema: {
      asChild: "boolean（是否使用子元素作为触发器）",
    },
    dslExample: {
      type: "DropdownMenuTrigger",
      props: { asChild: true },
    },
  },
  {
    name: "DropdownMenuContent",
    description: "下拉菜单的内容面板。内部放置 DropdownMenuItem 等。",
    propsSchema: {
      sideOffset: "number（距离触发器的偏移量，默认 4）",
      align: '"start" | "center" | "end"（对齐方式）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DropdownMenuContent",
      props: { align: "end" },
    },
  },
  {
    name: "DropdownMenuItem",
    description: "下拉菜单中的一个可点击选项。放在 DropdownMenuContent 内部。",
    propsSchema: {
      inset: "boolean（是否缩进，用于无图标时对齐）",
      variant: '"default" | "destructive"（视觉变体）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DropdownMenuItem",
      props: {},
    },
  },
  {
    name: "DropdownMenuLabel",
    description: "下拉菜单中的分组标签文本。放在 DropdownMenuContent 内部。",
    propsSchema: {
      inset: "boolean（是否缩进）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DropdownMenuLabel",
      props: {},
    },
  },
  {
    name: "DropdownMenuSeparator",
    description: "下拉菜单中的分隔线。放在 DropdownMenuContent 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DropdownMenuSeparator",
      props: {},
    },
  },
  {
    name: "DropdownMenuGroup",
    description: "下拉菜单的分组容器。内部放置多个 DropdownMenuItem。",
    propsSchema: {},
    dslExample: {
      type: "DropdownMenuGroup",
      props: {},
    },
  },
  {
    name: "DropdownMenuCheckboxItem",
    description: "带复选框的下拉菜单选项。放在 DropdownMenuContent 内部。",
    propsSchema: {
      checked: "boolean（是否选中）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DropdownMenuCheckboxItem",
      props: { checked: true },
    },
  },
  {
    name: "DropdownMenuRadioGroup",
    description: "下拉菜单中的单选分组。内部放置 DropdownMenuRadioItem。",
    propsSchema: {
      value: "string（当前选中值）",
    },
    dslExample: {
      type: "DropdownMenuRadioGroup",
      props: { value: "option1" },
    },
  },
  {
    name: "DropdownMenuRadioItem",
    description: "下拉菜单中的单选选项。放在 DropdownMenuRadioGroup 内部。",
    propsSchema: {
      value: "string（选项值）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DropdownMenuRadioItem",
      props: { value: "option1" },
    },
  },
  {
    name: "DropdownMenuSub",
    description: "下拉菜单的子菜单容器。内部放置 DropdownMenuSubTrigger 和 DropdownMenuSubContent。",
    propsSchema: {},
    dslExample: {
      type: "DropdownMenuSub",
      props: {},
    },
  },
  {
    name: "DropdownMenuSubTrigger",
    description: "触发子菜单展开的选项。放在 DropdownMenuSub 内部。",
    propsSchema: {
      inset: "boolean（是否缩进）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DropdownMenuSubTrigger",
      props: {},
    },
  },
  {
    name: "DropdownMenuSubContent",
    description: "子菜单的内容面板。放在 DropdownMenuSub 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DropdownMenuSubContent",
      props: {},
    },
  },
  {
    name: "DropdownMenuShortcut",
    description: "下拉菜单选项右侧的快捷键文本提示。放在 DropdownMenuItem 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "DropdownMenuShortcut",
      props: {},
    },
  },

  // ─── ContextMenu 系列 ───
  {
    name: "ContextMenu",
    description: "右键上下文菜单根容器。必须与 ContextMenuTrigger 和 ContextMenuContent 组合。",
    propsSchema: {},
    dslExample: {
      type: "ContextMenu",
      props: {},
    },
  },
  {
    name: "ContextMenuTrigger",
    description: "触发右键菜单的区域。用户在此区域右键点击即弹出菜单。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ContextMenuTrigger",
      props: { className: "flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed" },
    },
  },
  {
    name: "ContextMenuContent",
    description: "右键菜单的内容面板。内部放置 ContextMenuItem 等。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ContextMenuContent",
      props: { className: "w-64" },
    },
  },
  {
    name: "ContextMenuItem",
    description: "右键菜单中的一个可点击选项。",
    propsSchema: {
      inset: "boolean（是否缩进）",
      variant: '"default" | "destructive"（视觉变体）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ContextMenuItem",
      props: {},
    },
  },
  {
    name: "ContextMenuLabel",
    description: "右键菜单中的分组标签。",
    propsSchema: {
      inset: "boolean（是否缩进）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ContextMenuLabel",
      props: {},
    },
  },
  {
    name: "ContextMenuSeparator",
    description: "右键菜单中的分隔线。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ContextMenuSeparator",
      props: {},
    },
  },
  {
    name: "ContextMenuCheckboxItem",
    description: "右键菜单中带复选框的选项。",
    propsSchema: {
      checked: "boolean（是否选中）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ContextMenuCheckboxItem",
      props: { checked: true },
    },
  },
  {
    name: "ContextMenuRadioGroup",
    description: "右键菜单中的单选分组。",
    propsSchema: {
      value: "string（当前选中值）",
    },
    dslExample: {
      type: "ContextMenuRadioGroup",
      props: { value: "option1" },
    },
  },
  {
    name: "ContextMenuRadioItem",
    description: "右键菜单中的单选选项。放在 ContextMenuRadioGroup 内部。",
    propsSchema: {
      value: "string（选项值）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ContextMenuRadioItem",
      props: { value: "option1" },
    },
  },
  {
    name: "ContextMenuSub",
    description: "右键菜单的子菜单容器。内部放置 ContextMenuSubTrigger 和 ContextMenuSubContent。",
    propsSchema: {},
    dslExample: {
      type: "ContextMenuSub",
      props: {},
    },
  },
  {
    name: "ContextMenuSubTrigger",
    description: "触发右键子菜单展开的选项。放在 ContextMenuSub 内部。",
    propsSchema: {
      inset: "boolean（是否缩进）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ContextMenuSubTrigger",
      props: {},
    },
  },
  {
    name: "ContextMenuSubContent",
    description: "右键子菜单的内容面板。放在 ContextMenuSub 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ContextMenuSubContent",
      props: {},
    },
  },
  {
    name: "ContextMenuShortcut",
    description: "右键菜单选项右侧的快捷键文本提示。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ContextMenuShortcut",
      props: {},
    },
  },

  // ─── Breadcrumb 系列 ───
  {
    name: "Breadcrumb",
    description: "面包屑导航根容器。内部放置 BreadcrumbList。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Breadcrumb",
      props: {},
    },
  },
  {
    name: "BreadcrumbList",
    description: "面包屑的有序列表容器。放在 Breadcrumb 内部，内部放置 BreadcrumbItem。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "BreadcrumbList",
      props: {},
    },
  },
  {
    name: "BreadcrumbItem",
    description: "面包屑的单个条目容器。放在 BreadcrumbList 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "BreadcrumbItem",
      props: {},
    },
  },
  {
    name: "BreadcrumbLink",
    description: "面包屑中的可点击链接。放在 BreadcrumbItem 内部。",
    propsSchema: {
      href: "string（链接地址）",
      asChild: "boolean（是否使用子元素渲染）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "BreadcrumbLink",
      props: { href: "/" },
    },
  },
  {
    name: "BreadcrumbPage",
    description: "面包屑中的当前页面（不可点击）。放在 BreadcrumbItem 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "BreadcrumbPage",
      props: {},
    },
  },
  {
    name: "BreadcrumbSeparator",
    description: "面包屑之间的分隔符（默认为箭头图标）。放在 BreadcrumbList 内部，BreadcrumbItem 之间。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "BreadcrumbSeparator",
      props: {},
    },
  },
  {
    name: "BreadcrumbEllipsis",
    description: "面包屑中的省略号，用于表示隐藏的中间层级。放在 BreadcrumbItem 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "BreadcrumbEllipsis",
      props: {},
    },
  },

  // ─── Collapsible 系列 ───
  {
    name: "Collapsible",
    description: "可折叠区域根容器。与 CollapsibleTrigger 和 CollapsibleContent 组合使用。",
    propsSchema: {
      open: "boolean（受控的展开状态）",
      onOpenChange: "function（展开状态变化回调）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Collapsible",
      props: {},
    },
  },
  {
    name: "CollapsibleTrigger",
    description: "触发折叠/展开的元素。放在 Collapsible 内部。",
    propsSchema: {
      asChild: "boolean（是否使用子元素作为触发器）",
    },
    dslExample: {
      type: "CollapsibleTrigger",
      props: { asChild: true },
    },
  },
  {
    name: "CollapsibleContent",
    description: "折叠区域的内容。展开时显示，折叠时隐藏。放在 Collapsible 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "CollapsibleContent",
      props: {},
    },
  },

  // ─── AspectRatio ───
  {
    name: "AspectRatio",
    description: "保持固定宽高比的容器。常用于图片或视频的包裹。",
    propsSchema: {
      ratio: "number（宽高比，如 16/9、4/3、1 等）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "AspectRatio",
      props: { ratio: 16 / 9 },
    },
  },

  // ─── ButtonGroup 系列 ───
  {
    name: "ButtonGroup",
    description: "按钮组容器，将多个按钮组合为一个连续的操作区。",
    propsSchema: {
      orientation: '"horizontal" | "vertical"（排列方向，默认 horizontal）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ButtonGroup",
      props: { orientation: "horizontal" },
    },
  },
  {
    name: "ButtonGroupSeparator",
    description: "按钮组内的分隔线。放在 ButtonGroup 内部的按钮之间。",
    propsSchema: {
      orientation: '"horizontal" | "vertical"（默认 vertical）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ButtonGroupSeparator",
      props: {},
    },
  },
  {
    name: "ButtonGroupText",
    description: "按钮组内的静态文本区块（如前缀标签）。放在 ButtonGroup 内部。",
    propsSchema: {
      asChild: "boolean（是否使用子元素渲染）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ButtonGroupText",
      props: {},
    },
  },

  // ─── Carousel 系列 ───
  {
    name: "Carousel",
    description: "轮播图根容器。内部组合 CarouselContent、CarouselPrevious、CarouselNext。",
    propsSchema: {
      orientation: '"horizontal" | "vertical"（滚动方向）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Carousel",
      props: { className: "w-full max-w-xs" },
    },
  },
  {
    name: "CarouselContent",
    description: "轮播图的滑动内容容器。内部放置多个 CarouselItem。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "CarouselContent",
      props: {},
    },
  },
  {
    name: "CarouselItem",
    description: "轮播图的单个幻灯片。放在 CarouselContent 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名，可用 basis-* 控制每页显示数量）",
    },
    dslExample: {
      type: "CarouselItem",
      props: { className: "basis-1/3" },
    },
  },
  {
    name: "CarouselPrevious",
    description: "轮播图的「上一张」按钮。放在 Carousel 内部。",
    propsSchema: {
      variant: '"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"（按钮风格，默认 outline）',
      size: '"default" | "sm" | "lg" | "icon"（按钮尺寸，默认 icon）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "CarouselPrevious",
      props: {},
    },
  },
  {
    name: "CarouselNext",
    description: "轮播图的「下一张」按钮。放在 Carousel 内部。",
    propsSchema: {
      variant: '"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"（按钮风格，默认 outline）',
      size: '"default" | "sm" | "lg" | "icon"（按钮尺寸，默认 icon）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "CarouselNext",
      props: {},
    },
  },

  // ─── Calendar ───
  {
    name: "Calendar",
    description: "日历选择器组件。基于 react-day-picker，支持单选、多选、范围选择。",
    propsSchema: {
      mode: '"single" | "multiple" | "range"（选择模式）',
      selected: "Date | Date[] | DateRange（当前选中日期）",
      onSelect: "function（日期选择回调）",
      showOutsideDays: "boolean（是否显示月份外的日期，默认 true）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Calendar",
      props: { mode: "single", className: "rounded-md border" },
    },
  },

  // ─── Field 系列（表单布局） ───
  {
    name: "FieldSet",
    description: "表单字段集根容器 (fieldset)。内部放置多个 Field 或 FieldGroup。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "FieldSet",
      props: {},
    },
  },
  {
    name: "FieldGroup",
    description: "表单字段分组容器。内部放置多个 Field。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "FieldGroup",
      props: {},
    },
  },
  {
    name: "Field",
    description: "单个表单字段容器。内部组合 FieldLabel、Input/Textarea/Checkbox 及 FieldDescription/FieldError。",
    propsSchema: {
      orientation: '"vertical" | "horizontal" | "responsive"（标签与输入框的排列方向，默认 vertical）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Field",
      props: { orientation: "vertical" },
    },
  },
  {
    name: "FieldLabel",
    description: "表单字段的标签。放在 Field 内部。基于 Label 组件。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "FieldLabel",
      props: {},
    },
  },
  {
    name: "FieldDescription",
    description: "表单字段的辅助描述文本。放在 Field 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "FieldDescription",
      props: {},
    },
  },
  {
    name: "FieldError",
    description: "表单字段的错误提示信息。放在 Field 内部。",
    propsSchema: {
      errors: "Array<{ message?: string }>（错误对象数组）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "FieldError",
      props: {},
    },
  },
  {
    name: "FieldLegend",
    description: "字段集的图例标题 (legend)。放在 FieldSet 内部最顶部。",
    propsSchema: {
      variant: '"legend" | "label"（文字大小风格）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "FieldLegend",
      props: { variant: "legend" },
    },
  },
  {
    name: "FieldSeparator",
    description: "表单字段之间的分隔线。放在 FieldGroup 内部的 Field 之间。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "FieldSeparator",
      props: {},
    },
  },
  {
    name: "FieldContent",
    description: "表单字段内容包裹器，用于 horizontal 布局中组合输入框和描述/错误信息。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "FieldContent",
      props: {},
    },
  },
  {
    name: "FieldTitle",
    description: "表单字段标题（非 label 语义）。当不需要 label-for 关联时使用。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "FieldTitle",
      props: {},
    },
  },

  // ─── InputGroup 系列 ───
  {
    name: "InputGroup",
    description: "输入框组合容器。将 Input/Textarea 与前后缀附件（图标、按钮、文本）组合为统一的输入区域。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "InputGroup",
      props: { className: "w-full" },
    },
  },
  {
    name: "InputGroupAddon",
    description: "输入框组的附件区域。可放置图标、文本、按钮。通过 align 控制位置。",
    propsSchema: {
      align: '"inline-start" | "inline-end" | "block-start" | "block-end"（附件位置，默认 inline-start）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "InputGroupAddon",
      props: { align: "inline-start" },
    },
  },
  {
    name: "InputGroupInput",
    description: "InputGroup 内部的输入框。已去除独立边框和阴影。",
    propsSchema: {
      placeholder: "string（占位文本）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "InputGroupInput",
      props: { placeholder: "请输入..." },
    },
  },
  {
    name: "InputGroupTextarea",
    description: "InputGroup 内部的多行文本框。已去除独立边框和阴影。",
    propsSchema: {
      placeholder: "string（占位文本）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "InputGroupTextarea",
      props: { placeholder: "请输入..." },
    },
  },
  {
    name: "InputGroupButton",
    description: "InputGroup 内部的按钮。尺寸更小以适配输入框高度。",
    propsSchema: {
      variant: '"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"（按钮风格，默认 ghost）',
      size: '"xs" | "sm" | "icon-xs" | "icon-sm"（按钮尺寸，默认 xs）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "InputGroupButton",
      props: { variant: "ghost", size: "icon-xs" },
    },
  },
  {
    name: "InputGroupText",
    description: "InputGroup 内部的静态文本/图标展示元素。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "InputGroupText",
      props: {},
    },
  },

  // ─── Combobox 系列 ───
  {
    name: "Combobox",
    description: "可搜索下拉选择器根容器。内部组合 ComboboxInput、ComboboxContent 等子组件。",
    propsSchema: {
      value: "string | string[]（当前选中值）",
      onValueChange: "function（选中值变化回调）",
      open: "boolean（受控打开状态）",
      onOpenChange: "function（打开状态变化回调）",
    },
    dslExample: {
      type: "Combobox",
      props: {},
    },
  },
  {
    name: "ComboboxInput",
    description: "Combobox 的搜索输入框。自带触发按钮和清除按钮。",
    propsSchema: {
      placeholder: "string（占位文本）",
      showTrigger: "boolean（是否显示下拉箭头，默认 true）",
      showClear: "boolean（是否显示清除按钮，默认 false）",
      disabled: "boolean（是否禁用）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ComboboxInput",
      props: { placeholder: "搜索..." },
    },
  },
  {
    name: "ComboboxContent",
    description: "Combobox 的下拉面板。内部放置 ComboboxList。",
    propsSchema: {
      side: '"top" | "bottom" | "left" | "right"（弹出方向，默认 bottom）',
      align: '"start" | "center" | "end"（对齐方式，默认 start）',
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ComboboxContent",
      props: {},
    },
  },
  {
    name: "ComboboxList",
    description: "Combobox 选项的列表容器。放在 ComboboxContent 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ComboboxList",
      props: {},
    },
  },
  {
    name: "ComboboxItem",
    description: "Combobox 的单个选项。放在 ComboboxList 内部。选中时显示勾选图标。",
    propsSchema: {
      value: "string（选项值）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ComboboxItem",
      props: { value: "option1" },
    },
  },
  {
    name: "ComboboxGroup",
    description: "Combobox 选项的分组容器。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ComboboxGroup",
      props: {},
    },
  },
  {
    name: "ComboboxLabel",
    description: "Combobox 分组的标签文本。放在 ComboboxGroup 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ComboboxLabel",
      props: {},
    },
  },
  {
    name: "ComboboxEmpty",
    description: "Combobox 搜索无结果时的提示。放在 ComboboxContent 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ComboboxEmpty",
      props: {},
    },
  },
  {
    name: "ComboboxSeparator",
    description: "Combobox 选项之间的分隔线。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ComboboxSeparator",
      props: {},
    },
  },

  // ─── Command 系列 ───
  {
    name: "Command",
    description: "命令面板/命令菜单根容器。提供搜索过滤的列表交互。通常配合 Dialog 使用。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "Command",
      props: { className: "rounded-lg border shadow-md" },
    },
  },
  {
    name: "CommandInput",
    description: "Command 的搜索输入框。自带搜索图标。",
    propsSchema: {
      placeholder: "string（占位文本）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "CommandInput",
      props: { placeholder: "搜索..." },
    },
  },
  {
    name: "CommandList",
    description: "Command 的选项列表容器。支持滚动。内部放置 CommandGroup 或 CommandItem。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "CommandList",
      props: {},
    },
  },
  {
    name: "CommandEmpty",
    description: "Command 搜索无结果时的提示。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "CommandEmpty",
      props: {},
    },
  },
  {
    name: "CommandGroup",
    description: "Command 选项的分组容器。自带分组标题。",
    propsSchema: {
      heading: "string（分组标题文本）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "CommandGroup",
      props: { heading: "建议" },
    },
  },
  {
    name: "CommandItem",
    description: "Command 的单个可选择项。支持键盘导航和搜索过滤。",
    propsSchema: {
      value: "string（用于搜索匹配的值）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "CommandItem",
      props: { value: "calendar" },
    },
  },
  {
    name: "CommandSeparator",
    description: "Command 中的分隔线。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "CommandSeparator",
      props: {},
    },
  },
  {
    name: "CommandShortcut",
    description: "Command 选项右侧的快捷键文本提示。放在 CommandItem 内部。",
    propsSchema: {
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "CommandShortcut",
      props: {},
    },
  },

  // ─── Chart 系列 ───
  {
    name: "ChartContainer",
    description: "图表根容器。包裹 Recharts 图表组件，提供响应式容器和主题色配置。",
    propsSchema: {
      config: "ChartConfig（图表数据系列的颜色和标签配置对象）",
      className: "string（Tailwind CSS 类名）",
    },
    dslExample: {
      type: "ChartContainer",
      props: { config: {}, className: "min-h-[200px] w-full" },
    },
  },
  {
    name: "ChartTooltip",
    description: "图表的 Tooltip 组件。直接使用 Recharts Tooltip，通常配合 ChartTooltipContent 使用。",
    propsSchema: {
      content: "ReactElement（tooltip 内容渲染组件，通常传入 <ChartTooltipContent />）",
    },
    dslExample: {
      type: "ChartTooltip",
      props: {},
    },
  },
  {
    name: "ChartTooltipContent",
    description: "图表 Tooltip 的默认内容渲染组件。自动从 ChartConfig 读取标签和颜色。",
    propsSchema: {
      indicator: '"dot" | "line" | "dashed"（指示器样式，默认 dot）',
      hideLabel: "boolean（是否隐藏标签）",
      hideIndicator: "boolean（是否隐藏颜色指示器）",
      nameKey: "string（自定义数据名称字段）",
      labelKey: "string（自定义标签字段）",
    },
    dslExample: {
      type: "ChartTooltipContent",
      props: { indicator: "dot" },
    },
  },
  {
    name: "ChartLegend",
    description: "图表的图例组件。直接使用 Recharts Legend，通常配合 ChartLegendContent 使用。",
    propsSchema: {
      content: "ReactElement（图例内容渲染组件，通常传入 <ChartLegendContent />）",
    },
    dslExample: {
      type: "ChartLegend",
      props: {},
    },
  },
  {
    name: "ChartLegendContent",
    description: "图表图例的默认内容渲染组件。自动从 ChartConfig 读取标签和颜色。",
    propsSchema: {
      hideIcon: "boolean（是否隐藏颜色图标）",
      nameKey: "string（自定义数据名称字段）",
    },
    dslExample: {
      type: "ChartLegendContent",
      props: {},
    },
  },
]

export const componentsMetaByName: Record<string, ComponentMeta> = Object.fromEntries(
  componentsMeta.map((meta) => [meta.name, meta])
)
