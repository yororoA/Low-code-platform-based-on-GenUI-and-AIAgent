import { ChatDetailsContext } from "@/contexts";
import { useContext } from "react";
import Link from "next/link";

export default function HistoryPage() {
  const details = useContext(ChatDetailsContext);
  const handleDelete = (id: string) => {
    // 触发删除事件，父组件监听后更新列表
    window.dispatchEvent(new CustomEvent('deleteConversation', { detail: { id } }));
  };

  return (
    <div>
      {details.map(detail=>(
        <Link key={detail.id} href={`/studio/prompts/${detail.id}`}>
          <div>{detail.topic}</div>
          <div>{new Date(detail.timestamp).toLocaleString()}</div>
          <div onClick={()=>handleDelete(detail.id)}>DELETE</div>
        </Link>
      ))}
    </div>
  );
}