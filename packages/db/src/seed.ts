import { DefaultSettings } from '@onlook/constants';
import { ChatMessageRole, FrameType, MessageContextType, type ChatMessageContext } from '@onlook/models';
import { v4 as uuidv4 } from 'uuid';
import { db } from './client';
import { canvas, conversations, frames, messages, projects, userProjects, users, type Canvas, type Conversation, type Frame, type Message, type Project, type User } from './schema';

const user0 = {
    id: '5c62ba72-1f4a-4293-aa89-07b99b164353'
} satisfies User;

const project0 = {
    id: uuidv4(),
    name: 'Test Project',
    sandboxId: '123',
    sandboxUrl: 'http://localhost:8084',
    previewImg: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date(),
    updatedAt: new Date(),
} satisfies Project;

const project1 = {
    id: uuidv4(),
    name: 'Test Project 1',
    sandboxId: '3f5rf6',
    sandboxUrl: 'https://3f5rf6-8084.csb.app',
    previewImg: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
    createdAt: new Date(),
    updatedAt: new Date(),
} satisfies Project;

const canvas0 = {
    id: uuidv4(),
    scale: DefaultSettings.SCALE.toString(),
    x: DefaultSettings.PAN_POSITION.x.toString(),
    y: DefaultSettings.PAN_POSITION.y.toString(),
    projectId: project0.id,
} satisfies Canvas;

const canvas1 = {
    id: uuidv4(),
    scale: DefaultSettings.SCALE.toString(),
    x: DefaultSettings.PAN_POSITION.x.toString(),
    y: DefaultSettings.PAN_POSITION.y.toString(),
    projectId: project1.id,
} satisfies Canvas;

const frame0 = {
    id: uuidv4(),
    canvasId: canvas0.id,
    type: FrameType.WEB,
    url: project0.sandboxUrl,
    x: DefaultSettings.FRAME_POSITION.x.toString(),
    y: DefaultSettings.FRAME_POSITION.y.toString(),
    width: DefaultSettings.FRAME_DIMENSION.width.toString(),
    height: DefaultSettings.FRAME_DIMENSION.height.toString(),
} satisfies Frame;

const frame1 = {
    id: uuidv4(),
    canvasId: canvas1.id,
    type: FrameType.WEB,
    url: project1.sandboxUrl,
    x: DefaultSettings.FRAME_POSITION.x.toString(),
    y: DefaultSettings.FRAME_POSITION.y.toString(),
    width: DefaultSettings.FRAME_DIMENSION.width.toString(),
    height: DefaultSettings.FRAME_DIMENSION.height.toString(),
} satisfies Frame;

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

const context2 = {
    type: MessageContextType.IMAGE,
    displayName: 'index.ts',
    content: 'console.log("Hello, world!");',
    mimeType: 'image/png',
} satisfies ChatMessageContext;

const contexts = [
    context0,
    context1,
    context2,
];

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
    console.log('Seeding the database..');

    await db.transaction(async (tx) => {
        await tx.insert(users).values(user0);
        await tx.insert(projects).values([
            project0,
            project1,
        ]);
        await tx.insert(userProjects).values([{
            userId: user0.id,
            projectId: project0.id,
        }, {
            userId: user0.id,
            projectId: project1.id,
        }]);
        await tx.insert(canvas).values([
            canvas0,
            canvas1,
        ]);
        await tx.insert(frames).values([
            frame0,
            frame1,
        ]);
        await tx.insert(conversations).values([
            conversation0,
            conversation1,
        ]);
        await tx.insert(messages).values([
            message0,
            message1,
            message2,
            message3,
            message4,
        ]);
    });

    console.log('Database seeded!');
};

const resetDb = async () => {
    console.log('Resetting the database..');
    await db.transaction(async (tx) => {
        await tx.delete(messages);
        await tx.delete(conversations);
        await tx.delete(frames);
        await tx.delete(canvas);
        await tx.delete(userProjects);
        await tx.delete(projects);
        await tx.delete(users);
    });

    console.log('Database reset!');
};

(async () => {
    try {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('Resetting the database in production is not allowed');
        }
        await resetDb();
        await seedDb();
        process.exit(0);
    } catch (error) {
        console.error('Error seeding database:', error);
        process.exit(1);
    }
})();