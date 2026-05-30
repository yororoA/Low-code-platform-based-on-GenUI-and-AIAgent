'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, LayoutGridIcon, ClockIcon, MoreVerticalIcon, TrashIcon, EditIcon, CopyIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { generateHexId } from '@/lib/hexStr';
import { useWorkflowStore } from '@/store/workflowStore';
import { WorkflowProjectSummary } from '@/types';

const WorkflowsHome = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [projects, setProjects] = useState<WorkflowProjectSummary[]>([]);
  const { loadAllFromDB, deleteFromDB, duplicateToDB } = useWorkflowStore();

  useEffect(() => {
    const loadProjects = async () => {
      setIsLoading(true);
      const allProjects = await loadAllFromDB();
      setProjects(allProjects);
      setIsLoading(false);
    };
    loadProjects();
  }, [loadAllFromDB]);

  const handleNewProject = () => {
    const newId = generateHexId();
    router.push(`/studio/workflows/project/${newId}`);
  };

  const handleOpenProject = (id: string) => {
    router.push(`/studio/workflows/project/${id}`);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteFromDB(id);
    setProjects(prev => prev.filter(p => p.id !== id));
  };

  const handleDuplicateProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newId = await duplicateToDB(id);
    if (newId) {
      const source = projects.find(p => p.id === id);
      if (source) {
        const newProject: WorkflowProjectSummary = {
          id: newId,
          topic: source.topic + ' (副本)',
          timestamp: new Date(),
        };
        setProjects(prev => [newProject, ...prev]);
      }
    }
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <ScrollArea className="h-full [&>div[data-slot=scroll-area-viewport]>div]:[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="p-8 max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">工作流</h1>
            <p className="text-muted-foreground mt-1">管理和创建你的自动化业务流程管线</p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleNewProject} className="gap-2">
                <PlusIcon className="w-4 h-4" />
                新建项目
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>创建新的工作流项目</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {!isLoading && projects.length === 0 ? (
          <Empty className="min-h-[400px] border rounded-lg">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <LayoutGridIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>暂无工作流</EmptyTitle>
              <EmptyDescription>
                创建你的第一个工作流项目，轻松实现业务流程自动化
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={handleNewProject} className="gap-2">
                <PlusIcon className="w-4 h-4" />
                创建首个工作流
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-3/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-3 w-40" />
                  </CardContent>
                </Card>
              ))
            ) : (
              projects.map((project) => (
                <Card 
                  key={project.id} 
                  className="group hover:shadow-lg transition-all duration-200 cursor-pointer border-muted-foreground/20 hover:border-primary/30" 
                  onClick={() => handleOpenProject(project.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl group-hover:text-primary transition-colors">
                        {project.topic}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <MoreVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenProject(project.id)}>
                              <EditIcon className="mr-2 h-4 w-4" />
                              编辑
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDuplicateProject(project.id, e)}>
                              <CopyIcon className="mr-2 h-4 w-4" />
                              复制
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={(e) => handleDeleteProject(project.id, e)}
                            >
                              <TrashIcon className="mr-2 h-4 w-4" />
                              删除
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2 mt-2">
                      工作流项目
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-xs text-muted-foreground gap-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>最后修改：{formatDate(project.timestamp)}</span>
                    </div>
                  </CardContent>
                  <CardFooter className="pt-0 flex justify-end">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                          打开编辑器 →
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>打开工作流编辑器</p>
                      </TooltipContent>
                    </Tooltip>
                  </CardFooter>
                </Card>
              ))
            )}

            <Card 
              className="border-dashed flex flex-col items-center justify-center p-6 hover:bg-accent/50 transition-colors cursor-pointer min-h-[200px] hover:border-primary/30"
              onClick={handleNewProject}
            >
              <div className="bg-muted rounded-full p-3 mb-4">
                <LayoutGridIcon className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">或从零开始</p>
              <Button variant="link" size="sm" className="mt-1">创建工作流</Button>
            </Card>
          </div>
        )}
      </div>
    </ScrollArea>
  );
};

export default WorkflowsHome;
