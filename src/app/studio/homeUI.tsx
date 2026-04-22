'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { 
  SparklesIcon, 
  MessageSquareIcon, 
  WorkflowIcon, 
  ArrowRightIcon,
  ZapIcon,
  LayersIcon,
  CodeIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const FEATURES = [
  {
    icon: MessageSquareIcon,
    title: '智能对话',
    description: '与 AI Agent 进行自然语言交互，快速生成 UI 组件和页面布局',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    icon: WorkflowIcon,
    title: '工作流编排',
    description: '可视化拖拽编辑器，轻松构建复杂的业务流程和自动化任务',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    icon: CodeIcon,
    title: '代码生成',
    description: '自动生成高质量的前端代码，支持多种框架和组件库',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
]

const QUICK_ACTIONS = [
  {
    title: '开始新对话',
    description: '创建一个新的 AI 对话会话',
    href: '/studio/prompts',
    icon: MessageSquareIcon,
    variant: 'default' as const,
  },
  {
    title: '浏览工作流',
    description: '查看和管理你的工作流项目',
    href: '/studio/workflows',
    icon: WorkflowIcon,
    variant: 'outline' as const,
  },
]

export default function HomeUI() {
  const router = useRouter()

  return (
    <div className="h-full overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="max-w-6xl mx-auto p-8 space-y-12">
        <div className="text-center space-y-4 py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <SparklesIcon className="w-4 h-4" />
            <span>AI-Powered Development Platform</span>
          </div>
          
          <h1 className="text-5xl font-bold tracking-tight">
            欢迎使用 GenUI Studio
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            通过自然语言对话快速构建用户界面，可视化编排工作流，让开发更高效
          </p>
          
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button 
              size="lg" 
              className="gap-2"
              onClick={() => router.push('/studio/prompts')}
            >
              <MessageSquareIcon className="w-5 h-5" />
              开始对话
              <ArrowRightIcon className="w-4 h-4" />
            </Button>
            
            <Button 
              size="lg" 
              variant="outline"
              className="gap-2"
              onClick={() => router.push('/studio/workflows')}
            >
              <WorkflowIcon className="w-5 h-5" />
              查看工作流
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURES.map((feature, index) => (
            <Card key={index} className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${feature.bgColor} ${feature.color} mb-4`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <ZapIcon className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold">快速开始</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {QUICK_ACTIONS.map((action, index) => (
              <Card 
                key={index}
                className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/30 group"
                onClick={() => router.push(action.href)}
              >
                <CardContent className="flex items-start gap-4 p-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <action.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1 group-hover:text-primary transition-colors">
                      {action.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ArrowRightIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-8">
            <div className="flex items-start gap-6">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
                <LayersIcon className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold mb-2">探索更多功能</h3>
                <p className="text-muted-foreground mb-4">
                  GenUI Studio 提供了丰富的功能来加速你的开发流程。从 AI 对话生成 UI 到可视化工作流编排，一切尽在掌握。
                </p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">React Flow</Badge>
                  <Badge variant="secondary">AI Agent</Badge>
                  <Badge variant="secondary">实时预览</Badge>
                  <Badge variant="secondary">代码导出</Badge>
                  <Badge variant="secondary">团队协作</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
