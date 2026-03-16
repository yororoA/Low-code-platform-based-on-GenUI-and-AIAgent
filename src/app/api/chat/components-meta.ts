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
 * 已完成参数适配的组件元信息，用于提示词构建、DSL 生成与组件检索。
 */
export const componentsMeta: ComponentMeta[] = [
  {
    name: "Accordion4u",
    description: "折叠面板组件，支持 single/multiple 两种展开模式。",
    propsSchema: {
      type: '"single" | "multiple"',
      items: "{ value: string; trigger: string; content: string }[]",
      collapsible: "boolean（仅 single 模式）",
      defaultValue: "string | string[]",
      className: "string",
    },
    dslExample: {
      type: "Accordion4u",
      props: {
        type: "single",
        collapsible: true,
        defaultValue: "item-1",
        items: [
          { value: "item-1", trigger: "What is this?", content: "This is Accordion4u." },
          { value: "item-2", trigger: "Can it collapse?", content: "Yes, in single mode." },
        ],
      },
    },
  },
  {
    name: "Alert4u",
    description: "提示信息组件，支持图标、标题、描述与自定义 children。",
    propsSchema: {
      rootClassName: "string",
      icon: "ReactNode",
      title: "ReactNode",
      description: "ReactNode",
      children: "ReactNode（覆盖默认结构）",
      alertProps: "React.ComponentProps<typeof Alert>",
    },
    dslExample: {
      type: "Alert4u",
      props: {
        title: "Heads up!",
        description: "This is an important message.",
      },
    },
  },
  {
    name: "AlertDialog4u",
    description: "确认对话框组件，支持触发器、媒体区、操作按钮文案及全量透传。",
    propsSchema: {
      trigger: "ReactNode",
      triggerText: "ReactNode",
      title: "ReactNode",
      description: "ReactNode",
      cancelText: "ReactNode",
      actionText: "ReactNode",
      children: "ReactNode（覆盖默认结构）",
      dialogProps: "React.ComponentProps<typeof AlertDialog>",
    },
    dslExample: {
      type: "AlertDialog4u",
      props: {
        triggerText: "Delete",
        title: "Are you sure?",
        description: "This action cannot be undone.",
        cancelText: "Cancel",
        actionText: "Confirm",
      },
    },
  },
  {
    name: "Avatar4u",
    description: "头像展示组件，支持单头像列表与头像组（含角标/计数）。",
    propsSchema: {
      className: "string",
      singleAvatars: "AvatarItem[]",
      groupAvatars: "{ className?: string; avatars: AvatarItem[]; count?: number; icon?: ReactNode }",
    },
    dslExample: {
      type: "Avatar4u",
      props: {
        singleAvatars: [
          {
            src: "/placeholder-user.jpg",
            alt: "User",
            fallback: "U",
            size: "lg",
            hasBadge: true,
            badge: { icon: "3" },
          },
        ],
      },
    },
  },
  {
    name: "Button4u",
    description: "按钮组件，支持左/右图标、默认标签和 children 自定义。",
    propsSchema: {
      label: "ReactNode",
      leftIcon: "ReactNode",
      rightIcon: "ReactNode",
      children: "ReactNode（覆盖默认结构）",
      buttonProps: "React.ComponentProps<typeof Button>",
      rootClassName: "string",
    },
    dslExample: {
      type: "Button4u",
      props: {
        label: "Save",
        buttonProps: { variant: "default" },
      },
    },
  },
  {
    name: "CalendarClassifier",
    description: "日历分类组件，根据 mode 自动分发到 single/range/multiple 组件。",
    propsSchema: {
      mode: '"single" | "range" | "multiple"',
      className: "string",
      captionLayout: "DayPicker captionLayout",
      showOutsideDays: "boolean",
    },
    dslExample: {
      type: "CalendarClassifier",
      props: {
        mode: "single",
        captionLayout: "dropdown-months",
      },
    },
  },
  {
    name: "CalendarSingle",
    description: "单选日历组件。",
    propsSchema: {
      selected: "Date",
      onSelect: "(date) => void",
      className: "string",
      captionLayout: "DayPicker captionLayout",
    },
    dslExample: {
      type: "CalendarSingle",
      props: {
        captionLayout: "dropdown-months",
      },
    },
  },
  {
    name: "CalendarRange",
    description: "区间选择日历组件。",
    propsSchema: {
      selected: "DateRange",
      onSelect: "(range) => void",
      className: "string",
      captionLayout: "DayPicker captionLayout",
    },
    dslExample: {
      type: "CalendarRange",
      props: {
        showOutsideDays: true,
      },
    },
  },
  {
    name: "CalendarMultiple",
    description: "多选日历组件。",
    propsSchema: {
      selected: "Date[]",
      onSelect: "(dates) => void",
      className: "string",
      captionLayout: "DayPicker captionLayout",
    },
    dslExample: {
      type: "CalendarMultiple",
      props: {
        showWeekNumber: true,
      },
    },
  },
  {
    name: "Card4u",
    description: "卡片容器组件，支持默认结构与 children 自定义，适合嵌套其他组件。",
    propsSchema: {
      size: '"default" | "sm"',
      title: "ReactNode",
      description: "ReactNode",
      content: "ReactNode",
      footer: "ReactNode",
      children: "ReactNode（完全自定义卡片结构）",
      showDefaultFooterButton: "boolean",
      cardProps: "React.ComponentProps<typeof Card>",
    },
    dslExample: {
      type: "Card4u",
      props: {
        title: "User Summary",
        description: "Nested component demo",
        content: {
          type: "Avatar4u",
          props: {
            singleAvatars: [
              { src: "/placeholder-user.jpg", alt: "User", fallback: "U" },
            ],
          },
        },
      },
    },
  },
  {
    name: "Carousel4u",
    description: "轮播组件，支持自定义 slide 内容和前后切换按钮透传。",
    propsSchema: {
      slides: "ReactNode[]",
      rootClassName: "string",
      carouselProps: "React.ComponentProps<typeof Carousel>",
      contentProps: "React.ComponentProps<typeof CarouselContent>",
      itemProps: "React.ComponentProps<typeof CarouselItem>",
    },
    dslExample: {
      type: "Carousel4u",
      props: {
        slides: ["Slide 1", "Slide 2", "Slide 3"],
      },
    },
  },
  {
    name: "Chart4u",
    description: "图表组件，支持 bar/line/area 混合序列配置。",
    propsSchema: {
      data: "Record<string, string | number>[]",
      config: "ChartConfig",
      xAxisDataKey: "string",
      series: "{ type?: 'bar' | 'line' | 'area'; dataKey: string }[]",
      showGrid: "boolean",
      showTooltip: "boolean",
      showLegend: "boolean",
    },
    dslExample: {
      type: "Chart4u",
      props: {
        xAxisDataKey: "month",
        data: [
          { month: "Jan", desktop: 186, mobile: 80 },
          { month: "Feb", desktop: 305, mobile: 200 },
        ],
        config: {
          desktop: { label: "Desktop", color: "hsl(var(--chart-1))" },
          mobile: { label: "Mobile", color: "hsl(var(--chart-2))" },
        },
        series: [
          { type: "bar", dataKey: "desktop" },
          { type: "line", dataKey: "mobile" },
        ],
      },
    },
  },
  {
    name: "Checkbox4u",
    description: "复选框组组件，支持图例、描述、受控/非受控项。",
    propsSchema: {
      legend: "{ content: ReactNode; description?: ReactNode }",
      className: "string",
      groupClassName: "string",
      items: "{ id?: string; content: ReactNode; checked?: boolean | 'indeterminate'; defaultChecked?: boolean }[]",
    },
    dslExample: {
      type: "Checkbox4u",
      props: {
        legend: { content: "Display options", description: "Toggle items" },
        items: [
          { content: "Status Bar", defaultChecked: true },
          { content: "Activity Bar", disabled: true },
        ],
      },
    },
  },
  {
    name: "Dropdown4u",
    description: "下拉菜单组件，支持普通项、子菜单、checkbox、radio-group、快捷键和 destructive。",
    propsSchema: {
      variant: "Button variant",
      triggerText: "ReactNode",
      trigger: "ReactNode",
      triggerAsChild: "boolean",
      contentClassName: "string",
      contentProps: "DropdownMenuContent props",
      groups: "Dropdown4uGroup[]",
    },
    dslExample: {
      type: "Dropdown4u",
      props: {
        triggerText: "Open",
        groups: [
          {
            label: "Actions",
            items: [
              { type: "item", label: "Profile" },
              { type: "item", label: "Delete", variant: "destructive" },
            ],
          },
        ],
      },
    },
  },
  {
    name: "Field4u",
    description: "表单字段编排组件，支持 label/description/error 与任意控制器节点。",
    propsSchema: {
      legend: "ReactNode",
      className: "string",
      items: "Field4uItem[]（包含 control、label、description、error）",
      setProps: "React.ComponentProps<typeof FieldSet>",
      groupProps: "React.ComponentProps<typeof FieldGroup>",
    },
    dslExample: {
      type: "Field4u",
      props: {
        legend: "Profile",
        items: [
          {
            id: "username",
            label: "Username",
            control: { type: "input", props: { id: "username", placeholder: "Enter username" } },
          },
        ],
      },
    },
  },
  {
    name: "Label4u",
    description: "标签组件，支持必填标识与自定义文本。",
    propsSchema: {
      text: "ReactNode",
      required: "boolean",
      requiredMark: "ReactNode",
      labelProps: "React.ComponentProps<typeof Label>",
    },
    dslExample: {
      type: "Label4u",
      props: {
        text: "Email",
        required: true,
      },
    },
  },
  {
    name: "Separator4u",
    description: "分割线组件，支持纯线或中间带文案的双分割线。",
    propsSchema: {
      label: "ReactNode",
      rootClassName: "string",
      labelClassName: "string",
      separatorProps: "React.ComponentProps<typeof Separator>",
    },
    dslExample: {
      type: "Separator4u",
      props: {
        label: "OR",
      },
    },
  },
  {
    name: "Table4u",
    description: "表格组件，支持 caption、表头、行数据和 footer 汇总。",
    propsSchema: {
      captionTitle: "ReactNode",
      headers: "{ description: ReactNode; className?: string }[]",
      rows: "{ key?: string; className?: string; cells: { content: ReactNode; className?: string }[] }[]",
      footer: "同 rows 的单行结构",
      tableProps: "React.ComponentProps<typeof Table>",
    },
    dslExample: {
      type: "Table4u",
      props: {
        captionTitle: "Recent invoices",
        headers: [
          { description: "Invoice" },
          { description: "Status" },
          { description: "Amount", className: "text-right" },
        ],
        rows: [
          { cells: [{ content: "INV001" }, { content: "Paid" }, { content: "$250.00", className: "text-right" }] },
        ],
      },
    },
  },
]

export const componentsMetaByName: Record<string, ComponentMeta> = Object.fromEntries(
  componentsMeta.map((meta) => [meta.name, meta])
)
