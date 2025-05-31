import type { UserMetadata } from '../user';
import type { Frame } from '../project';

export interface RealtimeUser extends UserMetadata {
    position: {
        x: number;
        y: number;
    };
}

export enum RealtimeEventType {
    USER_ADDED = 'user_added',
    USER_REMOVED = 'user_removed',
    USER_UPDATED = 'user_updated',
    FRAME_UPDATED = 'frame_updated',
    FRAME_DELETED = 'frame_deleted',
    FRAME_CREATED = 'frame_created',
}

export interface FrameCreatedEvent {
    event: RealtimeEventType.FRAME_CREATED;
    payload: Frame;
}

export interface FrameUpdatedEvent {
    event: RealtimeEventType.FRAME_UPDATED;
    payload: Frame;
}

export interface FrameDeletedEvent {
    event: RealtimeEventType.FRAME_DELETED;
    payload: Frame;
}

export interface UserAddedEvent {
    event: RealtimeEventType.USER_ADDED;
    payload: RealtimeUser;
}

export interface UserUpdatedEvent {
    event: RealtimeEventType.USER_UPDATED;
    payload: RealtimeUser;
}

export type RealtimeEvent =
    | FrameCreatedEvent
    | FrameUpdatedEvent
    | FrameDeletedEvent
    | UserAddedEvent
    | UserUpdatedEvent;
