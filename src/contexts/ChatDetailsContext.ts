import {createContext} from "react";
import {DataItemSummary} from "@/types";

export const ChatDetailsContext = createContext<DataItemSummary[]>([]);