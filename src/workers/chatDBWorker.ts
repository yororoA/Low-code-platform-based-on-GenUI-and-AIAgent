import { DBManager } from "@/lib/dbtest";
import { AdminAgentMessage } from "@/app/api/chat/model";
import { DataItemSummary, DataItem, ExecuteOptions } from "@/types";

onmessage = async (event: MessageEvent<ExecuteOptions>) => {
  try{
    const res = await DBManager.execute(event.data);
    postMessage(res);
  }catch(error){
    postMessage({ error });
  }
}