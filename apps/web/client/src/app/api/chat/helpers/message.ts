import { fromDbMessage, messages, toDbMessage } from "@onlook/db";
import { db } from "@onlook/db/src/client";
import type { ChatMessage } from "@onlook/models";
import { eq } from "drizzle-orm";

export const upsertMessage = async ({
    conversationId,
    message,
}: {
    conversationId: string;
    message: ChatMessage;
}) => {
    const dbMessage = toDbMessage(message, conversationId);
    await db.transaction(async (tx) => {
        await tx
            .insert(messages)
            .values(dbMessage)
            .onConflictDoUpdate({
                target: messages.id,
                set: {
                    conversationId,
                },
            });
    });
};

export const loadChat = async (chatId: string): Promise<ChatMessage[]> => {
    const result = await db.query.messages.findMany({
        where: eq(messages.conversationId, chatId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });
    return result.map((message) => fromDbMessage(message));
};