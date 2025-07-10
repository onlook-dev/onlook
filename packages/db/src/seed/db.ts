import {
    canvases,
    conversations,
    createDefaultCanvas, createDefaultFrame, createDefaultUserCanvas,
    deployments,
    frames,
    messages,
    previewDomains,
    prices,
    products,
    projects,
    publishedDomains,
    subscriptions,
    usageRecords,
    userCanvases,
    userProjects,
    users,
    type Conversation,
    type Message,
    type Price,
    type Product,
    type Project,
    type Subscription,
    type User,
} from '@onlook/db';
import { db } from '@onlook/db/src/client';
import {
    ChatMessageRole,
    MessageContextType,
    ProjectRole,
    type ChatMessageContext,
} from '@onlook/models';
import { PriceKey, ProductType } from '@onlook/stripe';
import { v4 as uuidv4 } from 'uuid';
import { SEED_USER } from './constants';

const user0 = {
    id: SEED_USER.ID,
    email: SEED_USER.EMAIL,
    firstName: SEED_USER.FIRST_NAME,
    lastName: SEED_USER.LAST_NAME,
    displayName: SEED_USER.DISPLAY_NAME,
    avatarUrl: SEED_USER.AVATAR_URL,
    createdAt: new Date(),
    updatedAt: new Date(),
} satisfies User;

const project0 = {
    id: uuidv4(),
    name: 'Preload Script Test',
    sandboxId: '3f5rf6',
    sandboxUrl: 'http://localhost:8084',
    previewImgUrl: null,
    previewImgPath: null,
    previewImgBucket: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    description: 'Test Project Description',
} satisfies Project;

const canvas0 = createDefaultCanvas(project0.id);
const frame0 = createDefaultFrame(canvas0.id, project0.sandboxUrl);
const userCanvas0 = createDefaultUserCanvas(user0.id, canvas0.id);

const conversation0 = {
    id: uuidv4(),
    projectId: project0.id,
    displayName: 'Test Conversation',
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
    commitOid: null,
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
    commitOid: null,
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
    commitOid: null,
    createdAt: new Date(),
    applied: false,
    context: contexts,
    parts: [{ type: 'text', text: 'Test message 2' }],
    snapshots: {},
} satisfies Message;

const message3 = {
    id: uuidv4(),
    conversationId: conversation0.id,
    role: ChatMessageRole.USER,
    content: 'Test message 3',
    commitOid: null,
    createdAt: new Date(),
    applied: false,
    context: contexts,
    parts: [{ type: 'text', text: 'Test message 3' }],
    snapshots: {},
} satisfies Message;

const message4 = {
    id: uuidv4(),
    conversationId: conversation0.id,
    role: ChatMessageRole.ASSISTANT,
    content: 'Test message 4',
    createdAt: new Date(),
    applied: false,
    context: contexts,
    parts: [{ type: 'text', text: 'Test message 4' }],
    snapshots: {},
    commitOid: null,
} satisfies Message;

const product0 = {
    id: uuidv4(),
    name: 'Test Pro Product',
    type: ProductType.PRO,
    stripeProductId: 'prod_1234567890',
} satisfies Product;

const price0 = {
    id: uuidv4(),
    productId: product0.id,
    key: PriceKey.PRO_MONTHLY_TIER_1,
    monthlyMessageLimit: 100,
    stripePriceId: 'price_1234567890',
} satisfies Price;

const subscription0 = {
    id: uuidv4(),
    userId: user0.id,
    productId: product0.id,
    priceId: price0.id,
    startedAt: new Date(),
    updatedAt: new Date(),
    status: 'active',
    stripeCustomerId: 'cus_1234567890',
    stripeSubscriptionId: 'sub_1234567890',
    stripeSubscriptionScheduleId: null,
    stripeSubscriptionItemId: 'si_1234567890',
    scheduledAction: null,
    scheduledPriceId: null,
    scheduledChangeAt: null,
    endedAt: null,
} satisfies Subscription;

export const seedDb = async () => {
    console.log('Seeding the database...');

    await db.transaction(async (tx) => {
        await tx.insert(users).values(user0);
        await tx.insert(products).values([product0]);
        await tx.insert(prices).values([price0]);
        await tx.insert(subscriptions).values([subscription0]);
        await tx.insert(projects).values([project0]);
        await tx.insert(userProjects).values([
            {
                userId: user0.id,
                projectId: project0.id,
                role: ProjectRole.OWNER,
            },
        ]);
        await tx.insert(canvases).values([canvas0]);
        await tx.insert(userCanvases).values([userCanvas0]);
        await tx.insert(frames).values([frame0]);
        await tx.insert(conversations).values([conversation0]);
        await tx.insert(messages).values([message0, message1, message2, message3, message4]);
    });

    console.log('Database seeded!');
};

export const resetDb = async () => {
    console.log('Resetting the database...');
    await db.transaction(async (tx) => {
        await tx.delete(deployments);
        await tx.delete(previewDomains);
        await tx.delete(publishedDomains);
        await tx.delete(userCanvases);
        await tx.delete(userProjects);
        await tx.delete(usageRecords);
        await tx.delete(subscriptions);
        await tx.delete(prices);
        await tx.delete(products);
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
