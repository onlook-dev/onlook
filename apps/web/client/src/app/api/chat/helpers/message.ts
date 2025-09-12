import { fromDbPart, messages, parts, toDbParts } from "@onlook/db";
import { db } from "@onlook/db/src/client";
import type { ChatMessage } from "@onlook/models";
import { eq } from "drizzle-orm";

export const upsertMessage = async ({
    id,
    conversationId,
    message,
}: {
    id: string;
    conversationId: string;
    message: ChatMessage;
}) => {
    const mappedDBUIParts = toDbParts(message.parts, id);

    await db.transaction(async (tx) => {
        await tx
            .insert(messages)
            .values({
                conversationId,
                role: message.role,
                id,
            })
            .onConflictDoUpdate({
                target: messages.id,
                set: {
                    conversationId,
                },
            });

        await tx.delete(parts).where(eq(parts.messageId, id));
        if (mappedDBUIParts.length > 0) {
            await tx.insert(parts).values(mappedDBUIParts);
        }
    });
};

export const loadChat = async (chatId: string): Promise<ChatMessage[]> => {
    const result = await db.query.messages.findMany({
        where: eq(messages.conversationId, chatId),
        with: {
            parts: {
                orderBy: (parts, { asc }) => [asc(parts.order)],
            },
        },
        orderBy: (messages, { asc }) => [asc(messages.createdAt)],
    });

    return result.map((message) => ({
        id: message.id,
        role: message.role,
        parts: message.parts.map((part) => fromDbPart(part)),
    }));
};