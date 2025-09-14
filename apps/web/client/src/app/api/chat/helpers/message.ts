import { fromDbMessage, messages, toDbMessage } from "@onlook/db";
import { db } from "@onlook/db/src/client";
import type { ChatMessage } from "@onlook/models";
import { and, eq, gt } from "drizzle-orm";
import debounce from "lodash/debounce";

const upsertMessage = async ({
    id,
    conversationId,
    message,
}: {
    id: string;
    conversationId: string;
    message: ChatMessage;
}) => {
    const dbMessage = toDbMessage(message, conversationId);
    return await db.transaction(async (tx) => {
        // Remove messages newer than the updated message
        await tx.delete(messages).where(and(
            eq(messages.conversationId, conversationId),
            gt(messages.createdAt, dbMessage?.createdAt ?? new Date()),
        ));
        const [updatedMessage] = await tx
            .insert(messages)
            .values({
                ...dbMessage,
                id,
            })
            .onConflictDoUpdate({
                target: [messages.id],
                set: {
                    ...dbMessage,
                    id,
                },
            }).returning();
        return updatedMessage;
    });
};

export const debouncedUpsertMessage = debounce(upsertMessage, 500);

export const loadChat = async (chatId: string): Promise<ChatMessage[]> => {
    const result = await db.query.messages.findMany({
        where: eq(messages.conversationId, chatId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });
    return result.map((message) => fromDbMessage(message));
};