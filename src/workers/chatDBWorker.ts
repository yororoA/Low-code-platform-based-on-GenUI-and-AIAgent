import { DBManager } from "@/lib/dbtest";
import { ExecuteOptions } from "@/types";

onmessage = async (event: MessageEvent<ExecuteOptions>) => {
  try{
    const res = await DBManager.execute(event.data);
    postMessage(res);
  }catch(error){
    postMessage({ error });
  }
}