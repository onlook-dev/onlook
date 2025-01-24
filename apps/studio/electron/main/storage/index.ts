import type { ChatConversation } from '@onlook/models/chat';
import type {
    AppState,
    AuthTokens,
    ProjectsCache,
    UserMetadata,
    UserSettings,
} from '@onlook/models/settings';
import { DirectoryPersistentStorage } from './directory';
import { SingleFilePersistentStorage } from './file';

export enum StorageType {
    USER_SETTINGS = 'user-settings',
    APP_STATE = 'app-state',
    USER_METADATA = 'user-metadata',
    AUTH_TOKENS = 'auth-tokens-v1',
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
    // TODO: Remove this in favor of supabase auth sessions
    static readonly AUTH_TOKENS = new SingleFilePersistentStorage<AuthTokens>(
        StorageType.AUTH_TOKENS,
    );
    static readonly CONVERSATIONS = new DirectoryPersistentStorage<ChatConversation>(
        StorageType.CONVERSATIONS,
        false,
        (conversation) => conversation.projectId,
    );
}
