import { eq } from 'drizzle-orm';
import { getDrizzleClient } from '../client';
import { projects, type NewProject, type Project } from '../schema';

export async function getProjects(userId: string): Promise<Project[]> {
    const db = getDrizzleClient();
    return db.select().from(projects).where(eq(projects.userId, userId));
}

export async function getProject(id: number): Promise<Project | undefined> {
    const db = getDrizzleClient();
    const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
    return result[0];
}

export async function createProject(project: NewProject): Promise<Project> {
    const db = getDrizzleClient();
    const result = await db.insert(projects).values(project).returning();
    return result[0];
}

export async function updateProject(id: number, project: Partial<NewProject>): Promise<Project | undefined> {
    const db = getDrizzleClient();
    const result = await db.update(projects).set(project).where(eq(projects.id, id)).returning();
    return result[0];
}

export async function deleteProject(id: number): Promise<boolean> {
    const db = getDrizzleClient();
    const result = await db.delete(projects).where(eq(projects.id, id)).returning();
    return result.length > 0;
}
