"use client"

import { useEffect, useState } from "react"
import { useChat } from "@ai-sdk/react"
// import { CalendarSingle } from "@/components/calendar/calendarSingle"
import { Avatar4uProps, Avatar4u } from "@/components/avtar/avatar4u";



const demoAvatarProps: Avatar4uProps = {
  singleAvatars: [
    {
      src: "/placeholder-user.jpg",
      alt: "User",
      fallback: "U",
      size: "lg",
      hasBadge: true,
      badge: {
        icon: <span className="text-xs text-white">3</span>,
        // className: ""
      }
    }
  ]
};

export default function TestPage() {
  const { messages, sendMessage } = useChat();
  const [text, setText] = useState("");
  const [sv, setSv] = useState("");

  useEffect(() => {
    const assistantMessage = [...messages].reverse().find(msg => msg.role === "assistant");

    // console.log("All messages:", messages);

    if (assistantMessage) {
      const textParts: string = assistantMessage.parts.find(part => part.type === "text")?.text as string;

      if (textParts) {
        try {
          // 1. 尝试完整解析 JSON（适用于流式输出结束时的完整字符串）
          const parsed = JSON.parse(textParts);
          setText(parsed.text || "");
        } catch (e) {
          // 2. 如果 JSON 还不完整（在流式输出中），使用正则安全提取 "text" 字段
          // 这个正则会匹配 "text": " 然后一直获取内容，直到碰到下一个未转义的双引号
          const match = textParts.match(/"text"\s*:\s*"((?:[^"\\]|\\.)*)/);

          if (match) {
            const extracted = match[1];
            try {
              // 用双引号包裹起来当作 JSON 解析，这样能完美还原模型输出的 \n 和 \" 等转义字符
              setText(JSON.parse(`"${extracted}"`));
            } catch {
              // 极端边缘情况：正好截断在转义符上(比如最后只有一个 "\")，做个简单的降级替换
              setText(extracted.replace(/\\"/g, '"').replace(/\\n/g, '\n'));
            }
          } else {
            // "text" 字段还没开始输出（比如模型正在先输出 toolCalled）
            setText("Loading...");
          }
        }
      }
    }
  }, [messages]);




  return (
    <div className="flex-col min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-white">
      {/* <h1>Test Page</h1> */}
      <p>{text}</p>
      <form action="" onSubmit={(e) => {
        e.preventDefault();
        setText("");
        sendMessage({ text: sv });
        setSv("");
      }}>
        <input className="bg-blue-500 text-white placeholder:text-blue-300" type="text" name="input" id="" value={sv} onChange={(e) => setSv(e.target.value)} />
        <button>{'Send'}</button>
      </form>

      <br />
      <line className="w-full border-t border-gray-300 dark:border-gray-600" />
      {/* <CalendarSingle className="rounded-lg border" captionLayout="dropdown-months" /> */}
      <Avatar4u {...demoAvatarProps} />






    </div>
  )
}