'use client';
import React from 'react';
import {useState} from 'react';
import { ReactFlow, Background, Controls } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { useParams } from 'next/navigation';
import { todo } from 'node:test';

const ProjectPage = () => {
  const params = useParams<{ projectId: string }>();
  console.log(params);

  const [initialNodes, setInitialNodes] = useState<{
    id: string;
    type?: string;
    data: { label: string };
    position: { x: number; y: number };
  }[]>([]);

  const AddNodes = ()=>{
    const label = todo("Add Nodes");
    const newNode = {
      id: `${Date.now()}`,
      type: 'default',
      data: { label: label.toString() },
      position: { x: 250, y: 5 },
    };
    setInitialNodes((prevNodes) => [...prevNodes, newNode]);
  };
  const DeleteNodes = ()=>{

  };
  const Back = ()=>{

  };
  const Forward = ()=>{

  };


  return (
    <div className='h-[100vh] w-full'>
      <h1>Project</h1>
      <ContextMenu>
        <ContextMenuTrigger className="w-full h-full">
          <ReactFlow nodes={initialNodes}>
            <Background />
            <Controls />
          </ReactFlow>
        </ContextMenuTrigger>

        <ContextMenuContent>
          <ContextMenuItem onClick={AddNodes}>Add Nodes</ContextMenuItem>
          <ContextMenuItem onClick={DeleteNodes}>Delete Nodes</ContextMenuItem>
          <ContextMenuItem onClick={Back}>Back</ContextMenuItem>
          <ContextMenuItem onClick={Forward}>Forward</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </div>
  );
};

export default ProjectPage;