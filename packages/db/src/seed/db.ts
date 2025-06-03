import {
    canvases,
    conversations,
    frames,
    messages,
    projects,
    userCanvases,
    userProjects,
    users,
    type Conversation,
    type Message,
    type Project,
    type User,
} from '@onlook/db';
import { db } from '@onlook/db/src/client';
import {
    ChatMessageRole,
    MessageContextType,
    ProjectRole,
    type ChatMessageContext,
} from '@onlook/models';
import { createDefaultCanvas, createDefaultFrame, createDefaultUserCanvas } from '@onlook/utility';
import { v4 as uuidv4 } from 'uuid';

const user0 = {
    id: '2585ea6b-6303-4f21-977c-62af2f5a21f5',
} satisfies User;

const project0 = {
    id: uuidv4(),
    name: 'Test Project',
    sandboxId: '3f5rf6',
    sandboxUrl: 'http://localhost:8084',
    previewImgUrl: null,
    previewImgPath: null,
    previewImgBucket: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'Test Project Description',
} satisfies Project;

const project1 = {
    id: uuidv4(),
    name: 'Test Project 1',
    sandboxId: '3f5rf6',
    sandboxUrl: 'https://3f5rf6-8084.csb.app',
    previewImgUrl: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'Test Project 1 Description',
    previewImgPath: null,
    previewImgBucket: null,
} satisfies Project;

const canvas0 = createDefaultCanvas(project0.id);
const canvas1 = createDefaultCanvas(project1.id);
const frame0 = createDefaultFrame(canvas0.id, project0.sandboxUrl);
const frame1 = createDefaultFrame(canvas1.id, project1.sandboxUrl);
const userCanvas0 = createDefaultUserCanvas(user0.id, canvas0.id);
const userCanvas1 = createDefaultUserCanvas(user0.id, canvas1.id);

const conversation0 = {
    id: uuidv4(),
    projectId: project0.id,
    displayName: 'Test Conversation',
    createdAt: new Date(),
    updatedAt: new Date(),
} satisfies Conversation;

const conversation1 = {
    id: uuidv4(),
    projectId: project1.id,
    displayName: 'Test Conversation 1',
    createdAt: new Date(),
    updatedAt: new Date(),
} satisfies Conversation;

const context0 = {
    type: MessageContextType.FILE,
    path: 'src/index.ts',
    displayName: 'index.ts',
    content: 'console.log("Hello, world!");',
} satisfies ChatMessageContext;

const context1 = {
    type: MessageContextType.HIGHLIGHT,
    path: 'src/index.ts',
    displayName: 'index.ts',
    content: 'console.log("Hello, world!");',
    start: 0,
    end: 10,
} satisfies ChatMessageContext;

const contexts = [context0, context1];

const message0 = {
    id: uuidv4(),
    conversationId: conversation0.id,
    role: ChatMessageRole.USER,
    content: 'Test message 0',
    createdAt: new Date(),
    applied: false,
    context: contexts,
    snapshots: {},
    parts: [{ type: 'text', text: 'Test message 0' }],
} satisfies Message;

const message1 = {
    id: uuidv4(),
    conversationId: conversation0.id,
    role: ChatMessageRole.ASSISTANT,
    content: 'Test message 1',
    createdAt: new Date(),
    applied: false,
    context: contexts,
    parts: [{ type: 'text', text: 'Test message 1' }],
    snapshots: {},
} satisfies Message;

const message2 = {
    id: uuidv4(),
    conversationId: conversation0.id,
    role: ChatMessageRole.ASSISTANT,
    content: 'Test message 2',
    createdAt: new Date(),
    applied: false,
    context: contexts,
    parts: [{ type: 'text', text: 'Test message 2' }],
    snapshots: {},
} satisfies Message;

const message3 = {
    id: uuidv4(),
    conversationId: conversation1.id,
    role: ChatMessageRole.USER,
    content: 'Test message 3',
    createdAt: new Date(),
    applied: false,
    context: contexts,
    parts: [{ type: 'text', text: 'Test message 3' }],
    snapshots: {},
} satisfies Message;

const message4 = {
    id: uuidv4(),
    conversationId: conversation1.id,
    role: ChatMessageRole.ASSISTANT,
    content: 'Test message 4',
    createdAt: new Date(),
    applied: false,
    context: contexts,
    parts: [{ type: 'text', text: 'Test message 4' }],
    snapshots: {},
} satisfies Message;

export const seedDb = async () => {
    console.log('Seeding the database...');

    await db.transaction(async (tx) => {
        await tx.insert(users).values(user0);
        await tx.insert(projects).values([project0, project1]);
        await tx.insert(userProjects).values([
            {
                userId: user0.id,
                projectId: project0.id,
                role: ProjectRole.OWNER,
            },
            {
                userId: user0.id,
                projectId: project1.id,
                role: ProjectRole.OWNER,
            },
        ]);
        await tx.insert(canvases).values([canvas0, canvas1]);
        await tx.insert(userCanvases).values([userCanvas0, userCanvas1]);
        await tx.insert(frames).values([frame0, frame1]);
        await tx.insert(conversations).values([conversation0, conversation1]);
        await tx.insert(messages).values([message0, message1, message2, message3, message4]);
    });

    console.log('Database seeded!');
};

export const resetDb = async () => {
    console.log('Resetting the database...');
    await db.transaction(async (tx) => {
        await tx.delete(messages);
        await tx.delete(conversations);
        await tx.delete(frames);
        await tx.delete(canvases);
        await tx.delete(userProjects);
        await tx.delete(projects);
        await tx.delete(users);
    });

    console.log('Database reset!');
};
