import { makeAutoObservable, reaction } from 'mobx';
import { api } from '@/trpc/react';
import { createClient } from '@/utils/supabase/client';

export interface PresenceUser {
    userId: string;
    displayName: string;
    avatarUrl?: string | null;
    lastSeen: Date;
}

export class PresenceManager {
    onlineUsers: PresenceUser[] = [];
    currentUserId: string | null = null;
    currentProjectId: string | null = null;
    isConnected = false;

    isLoading = false;

    private subscription: any = null;

    constructor() {
        makeAutoObservable(this);

        reaction(
            () => this.currentProjectId,
            (projectId) => {
                if (projectId) {
                    this.joinProject(projectId);
                } else {
                    this.leaveProject();
                }
            }
        );
    }

    setContext(userId: string, projectId: string) {
        this.currentUserId = userId;
        this.currentProjectId = projectId;
    }

    async joinProject(projectId: string) {
        if (!this.currentUserId) return;

        try {
            this.isLoading = true;
            this.currentProjectId = projectId;

            await api.presence.joinProject.mutate({ projectId });

            await this.loadProjectPresence(projectId);
            this.subscribeToPresenceUpdates(projectId);

            this.isConnected = true;
        } catch (error) {
            console.error('Error joining project:', error);
        } finally {
            this.isLoading = false;
        }
    }

    async leaveProject() {
        if (!this.currentProjectId || !this.currentUserId) return;

        try {
            await api.presence.leaveProject.mutate({ projectId: this.currentProjectId });

            this.unsubscribeFromPresenceUpdates();
            this.onlineUsers = [];
            this.currentProjectId = null;
            this.isConnected = false;
        } catch (error) {
            console.error('Error leaving project:', error);
        }
    }

    private async loadProjectPresence(projectId: string) {
        try {
            const presenceData = await api.presence.getProjectPresence.query({ projectId });
            this.onlineUsers = presenceData.map(p => ({
                userId: p.userId,
                displayName: p.displayName,
                avatarUrl: p.avatarUrl,
                lastSeen: p.lastSeen,
            }));
        } catch (error) {
            console.error('Error loading project presence:', error);
        }
    }

    private subscribeToPresenceUpdates(projectId: string) {
        this.unsubscribeFromPresenceUpdates();

        const supabase = createClient();
        const channel = supabase
            .channel(`presence:${projectId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_presence',
                    filter: `project_id=eq.${projectId}`,
                },
                (payload) => {
                    this.handlePresenceUpdate(payload);
                }
            )
            .subscribe();

        this.subscription = channel;
    }

    private unsubscribeFromPresenceUpdates() {
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }

    private handlePresenceUpdate(payload: any) {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        switch (eventType) {
            case 'INSERT':
            case 'UPDATE':
                if (newRecord && newRecord.is_online) {
                    const existingIndex = this.onlineUsers.findIndex(u => u.userId === newRecord.user_id);
                    const user: PresenceUser = {
                        userId: newRecord.user_id,
                        displayName: newRecord.user?.display_name || `${newRecord.user?.first_name || ''} ${newRecord.user?.last_name || ''}`.trim(),
                        avatarUrl: newRecord.user?.avatar_url,
                        lastSeen: new Date(newRecord.last_seen),
                    };

                    if (existingIndex >= 0) {
                        this.onlineUsers[existingIndex] = user;
                    } else {
                        this.onlineUsers.push(user);
                    }
                } else {
                    this.onlineUsers = this.onlineUsers.filter(u => u.userId !== newRecord?.user_id);
                }
                break;

            case 'DELETE':
                this.onlineUsers = this.onlineUsers.filter(u => u.userId !== oldRecord?.user_id);
                break;
        }
    }

    get otherOnlineUsers(): PresenceUser[] {
        return this.onlineUsers.filter(u => u.userId !== this.currentUserId);
    }

    isUserOnline(userId: string): boolean {
        return this.onlineUsers.some(u => u.userId === userId);
    }

    dispose() {
        this.leaveProject();
    }
}
