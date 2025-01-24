import type { ChatConversation } from '@onlook/models/chat';
import type { AppState, ProjectsCache, UserMetadata, UserSettings } from '@onlook/models/settings';
import { DirectoryPersistentStorage } from './directory';
import { SingleFilePersistentStorage } from './file';

export enum StorageType {
    USER_SETTINGS = 'user-settings',
    APP_STATE = 'app-state',
    USER_METADATA = 'user-metadata',
    PROJECTS = 'projects',
    CONVERSATIONS = 'conversations-v1',
}

export class PersistentStorage {
    static readonly APP_STATE = new SingleFilePersistentStorage<AppState>(StorageType.APP_STATE);
    static readonly PROJECTS = new SingleFilePersistentStorage<ProjectsCache>(StorageType.PROJECTS);
    static readonly USER_SETTINGS = new SingleFilePersistentStorage<UserSettings>(
        StorageType.USER_SETTINGS,
    );
    static readonly USER_METADATA = new SingleFilePersistentStorage<UserMetadata>(
        StorageType.USER_METADATA,
    );
    static readonly CONVERSATIONS = new DirectoryPersistentStorage<ChatConversation>(
        StorageType.CONVERSATIONS,
        false,
        (conversation) => conversation.projectId,
    );
}
