import { IdeType } from '../ide';

export interface UserSettings {
    id?: string;
    enableAnalytics?: boolean;
    ideType?: IdeType;
}
