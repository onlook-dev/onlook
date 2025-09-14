import { fromDbMessage, messages, toDbMessage } from "@onlook/db";
import { db } from "@onlook/db/src/client";
import type { ChatMessage } from "@onlook/models";
import { eq } from "drizzle-orm";
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
    console.log('upsertMessage', id, conversationId);
    const dbMessage = toDbMessage(message, conversationId);
    const [updatedMessage] = await db
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

    if (!updatedMessage) {
        throw new Error('Message not updated');
    }
    return updatedMessage;
};

export const debouncedUpsertMessage = debounce(upsertMessage, 500);

export const loadChat = async (chatId: string): Promise<ChatMessage[]> => {
    const result = await db.query.messages.findMany({
        where: eq(messages.conversationId, chatId),
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });
    return result.map((message) => fromDbMessage(message));
};