import { AdminAgentMessage } from "@/app/api/chat/model";


// worker event
export type StreamMessageEvent = {
  type: "send";
  id: string; // taskId
  messages: AdminAgentMessage[];
  apiBaseUrl: string;
} | {
  // 会话切换、页面关闭等导致的取消事件
  type: "cancel" | "offline" | "online";
  id: string; // taskId
};
 
export type StreamMessageResponse = {
  type: "message" | "error" | "complete";
  id: string; // taskId
  data?: AdminAgentMessage[];
  error?: string;
};