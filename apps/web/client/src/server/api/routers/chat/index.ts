import { createTRPCRouter } from "../../trpc";
import { conversationRouter } from "./conversation";
import { messageRouter } from "./message";
import { suggestionsRouter } from "./suggestion";

export const chatRouter = createTRPCRouter({
    conversation: conversationRouter,
    message: messageRouter,
    suggestions: suggestionsRouter,
});
