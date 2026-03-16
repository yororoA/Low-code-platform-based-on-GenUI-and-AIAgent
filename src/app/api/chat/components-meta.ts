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
      type: '"single" | "multiple"（展开模式：single 单开 / multiple 多开）',
      items: "{ value: string; trigger: string; content: string }[]（面板数据列表）",
      collapsible: "boolean（仅 single 模式下是否允许全部折叠）",
      defaultValue: "string | string[]（默认展开项；single 传 string，multiple 传 string[]）",
      className: "string（根容器 Tailwind CSS 类名）",
      itemClassName: "string（所有 AccordionItem 的默认 Tailwind CSS 类名）",
      triggerClassName: "string（所有 AccordionTrigger 的默认 Tailwind CSS 类名）",
      contentClassName: "string（所有 AccordionContent 的默认 Tailwind CSS 类名）",
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
      className: "string（根容器 Tailwind CSS 类名，推荐）",
      rootClassName: "string（兼容旧版本的根容器 Tailwind CSS 类名）",
      icon: "ReactNode（提示图标区域内容）",
      title: "ReactNode（标题内容）",
      description: "ReactNode（描述内容）",
      children: "ReactNode（自定义完整内容，传入后覆盖默认结构）",
      alertProps: "React.ComponentProps<typeof Alert>（透传给底层 Alert）",
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
      contentClassName: "string（弹层内容容器 Tailwind CSS 类名）",
      trigger: "ReactNode（自定义触发器；不传时使用默认按钮）",
      triggerText: "ReactNode（默认触发按钮文案）",
      media: "ReactNode（标题上方媒体区内容）",
      title: "ReactNode（对话框标题）",
      description: "ReactNode（对话框说明文案）",
      cancelText: "ReactNode（取消按钮文案）",
      actionText: "ReactNode（确认按钮文案）",
      children: "ReactNode（自定义完整弹层结构，覆盖默认头部与底部）",
      dialogProps: "React.ComponentProps<typeof AlertDialog>（透传根节点参数）",
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
      className: "string（外层容器 Tailwind CSS 类名）",
      singleAvatars: "AvatarCommonProps[]（单头像列表配置：图片、fallback、size、badge 等）",
      groupAvatars: "{ className?: string(Tailwind CSS 类名); countClassName?: string(Tailwind CSS 类名); avatars: AvatarCommonProps[]; count?: number; icon?: ReactNode }（头像组配置）",
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
      className: "string（按钮 Tailwind CSS 类名，推荐）",
      rootClassName: "string（兼容旧版本 Tailwind CSS 类名）",
      label: "ReactNode（默认按钮文案）",
      leftIcon: "ReactNode（左侧图标）",
      rightIcon: "ReactNode（右侧图标）",
      children: "ReactNode（自定义按钮内容，传入后覆盖默认图标+文案结构）",
      buttonProps: "React.ComponentProps<typeof Button>（透传底层按钮参数）",
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
    name: "CalendarSingle",
    description: "单选日历组件。",
    propsSchema: {
      selected: "Date | undefined（当前选中日期，受控模式）",
      onSelect: "(date: Date | undefined) => void（日期变化回调）",
      className: "string（日历容器 Tailwind CSS 类名）",
      captionLayout: "DayPicker captionLayout（月份标题区域布局）",
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
      selected: "DateRange | undefined（当前选中区间，受控模式）",
      onSelect: "(range: DateRange | undefined) => void（区间变化回调）",
      className: "string（日历容器 Tailwind CSS 类名）",
      captionLayout: "DayPicker captionLayout（月份标题区域布局）",
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
      selected: "Date[] | undefined（当前选中日期数组，受控模式）",
      onSelect: "(dates: Date[] | undefined) => void（多选结果变化回调）",
      className: "string（日历容器 Tailwind CSS 类名）",
      captionLayout: "DayPicker captionLayout（月份标题区域布局）",
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
      className: "string（卡片根节点 Tailwind CSS 类名，推荐）",
      rootClassName: "string（兼容旧版本根节点 Tailwind CSS 类名）",
      size: '"default" | "sm"（卡片尺寸）',
      title: "ReactNode（卡片标题）",
      description: "ReactNode（卡片描述）",
      content: "ReactNode（卡片主体内容）",
      footer: "ReactNode（自定义底部内容）",
      children: "ReactNode（完全自定义卡片结构，覆盖默认头/体/尾）",
      showDefaultFooterButton: "boolean（是否显示默认底部按钮）",
      cardProps: "React.ComponentProps<typeof Card>（透传底层 Card 参数）",
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
      className: "string（轮播根容器 Tailwind CSS 类名，推荐）",
      rootClassName: "string（兼容旧版本根容器 Tailwind CSS 类名）",
      slides: "ReactNode[]（轮播项内容数组）",
      carouselProps: "React.ComponentProps<typeof Carousel>（透传根组件参数）",
      contentProps: "React.ComponentProps<typeof CarouselContent>（透传内容容器参数）",
      itemProps: "React.ComponentProps<typeof CarouselItem>（透传轮播项参数）",
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
      className: "string（图表容器 Tailwind CSS 类名）",
      data: "Record<string, string | number>[]（图表数据源）",
      config: "ChartConfig（系列配置：标签、颜色、主题）",
      xAxisDataKey: "string（X 轴字段名）",
      series: "{ type?: 'bar' | 'line' | 'area'; dataKey: string; stackId?: string; strokeWidth?: number }[]（系列渲染配置）",
      showGrid: "boolean（是否显示网格线）",
      showTooltip: "boolean（是否显示 tooltip）",
      showLegend: "boolean（是否显示图例）",
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
      legend: "{ content: ReactNode; description?: ReactNode }（复选框组图例）",
      className: "string（FieldSet 根容器 Tailwind CSS 类名）",
      groupClassName: "string（复选项分组容器 Tailwind CSS 类名）",
      items: "{ id?: string; orientation?: 'horizontal' | 'vertical'; content: ReactNode; description?: ReactNode; checked?: boolean | 'indeterminate'; defaultChecked?: boolean; onCheckedChange?: (checked) => void; disabled?: boolean }[]（复选项数组）",
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
      variant: "React.ComponentProps<typeof Button>['variant']（默认触发按钮样式）",
      triggerText: "ReactNode（默认触发按钮文案）",
      trigger: "ReactNode（自定义触发器节点）",
      triggerAsChild: "boolean（触发器是否按 asChild 方式渲染）",
      contentClassName: "string（菜单内容容器 Tailwind CSS 类名）",
      contentProps: "DropdownMenuContent props（透传参数，如 align、sideOffset）",
      groupClassName: "string（分组容器默认 Tailwind CSS 类名）",
      labelClassName: "string（分组标签默认 Tailwind CSS 类名）",
      itemClassName: "string（普通菜单项默认 Tailwind CSS 类名）",
      checkboxItemClassName: "string（checkbox 菜单项默认 Tailwind CSS 类名）",
      radioGroupClassName: "string（radio group 默认 Tailwind CSS 类名）",
      radioItemClassName: "string（radio item 默认 Tailwind CSS 类名）",
      separatorClassName: "string（分隔线默认 Tailwind CSS 类名）",
      subTriggerClassName: "string（子菜单触发器默认 Tailwind CSS 类名）",
      subContentClassName: "string（子菜单内容默认 Tailwind CSS 类名）",
      groups: "Dropdown4uGroup[]（菜单分组与节点配置数组）",
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
      legend: "ReactNode（字段组标题内容）",
      className: "string（FieldSet 根容器 Tailwind CSS 类名）",
      items: "Field4uItem[]（字段项配置数组，包含 control、label、description、error）",
      setProps: "React.ComponentProps<typeof FieldSet>（透传给 FieldSet 的参数）",
      groupProps: "React.ComponentProps<typeof FieldGroup>（透传给 FieldGroup 的参数）",
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
      className: "string（标签 Tailwind CSS 类名，推荐）",
      rootClassName: "string（兼容旧版本标签 Tailwind CSS 类名）",
      text: "ReactNode（标签文案）",
      required: "boolean（是否显示必填标识）",
      requiredMark: "ReactNode（必填标识内容，默认 *）",
      labelProps: "React.ComponentProps<typeof Label>（透传底层 Label 参数）",
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
      className: "string（外层容器 Tailwind CSS 类名，推荐）",
      rootClassName: "string（兼容旧版本外层 Tailwind CSS 类名）",
      label: "ReactNode（中间文案；不传则渲染单条分割线）",
      labelClassName: "string（文案 Tailwind CSS 类名）",
      separatorProps: "React.ComponentProps<typeof Separator>（单条分割线模式下透传参数）",
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
      className: "string（表格 Tailwind CSS 类名）",
      captionTitle: "ReactNode（表格说明标题 caption）",
      headers: "{ description: ReactNode; className?: string(Tailwind CSS 类名) }[]（表头列配置数组）",
      rows: "{ key?: string; className?: string(Tailwind CSS 类名); cells: { content: ReactNode; className?: string(Tailwind CSS 类名) }[] }[]（表格正文行配置）",
      footer: "{ key?: string; className?: string(Tailwind CSS 类名); cells: { content: ReactNode; className?: string(Tailwind CSS 类名) }[] }（表格底部汇总行配置）",
      tableProps: "React.ComponentProps<typeof Table>（透传底层 Table 参数）",
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
