import { makeAutoObservable } from 'mobx';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ProjectManager } from '../../project/manager';
import { createClient } from '@/utils/supabase/client';
import type { RealtimeEvent, RealtimeUser } from '@onlook/models';
import type { UserManager } from '../../user/manager';

export class RealtimeManager {
    readonly supabase = createClient();
    private _channel: RealtimeChannel | null = null;
    private _users: Record<string, RealtimeUser> = {};
    private _isSubscribed = false;

    constructor(
        private projectManager: ProjectManager,
        private userManager: UserManager,
    ) {
        makeAutoObservable(this);

        this.init();
    }

    private init() {
        if (!this.projectManager.project?.id) {
            console.error('Project ID is not set');
            return;
        }

        // Clean up any existing subscriptions
        this.clean();

        this._channel = this.supabase.channel(this.projectManager.project.id);
        this._channel
            .on('broadcast', { event: '*' }, (payload) => {
                //console.log('payload', payload);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    this._isSubscribed = true;
                }
            });
    }

    private add(user: RealtimeUser) {
        this._users[user.id] = user;
    }

    private remove(id: string) {
        delete this._users[id];
    }

    private update(user: RealtimeUser) {
        this._users[user.id] = user;
    }

    private getUsers() {
        return this._users;
    }

    clean() {
        this._channel?.unsubscribe();
        this._channel = null;
        this._users = {};
        this._isSubscribed = false;
    }

    send(event: RealtimeEvent) {
        if (!this._isSubscribed || !this._channel) {
            console.error('Not subscribed to realtime channel');
            return;
        }

        this._channel.send({
            type: 'broadcast',
            event: event.event,
            payload: event,
        });
    }
}
