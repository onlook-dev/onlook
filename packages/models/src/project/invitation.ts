import type { ProjectRole } from './role';

export interface Invitation {
    id: string;
    inviteeEmail: string;
    role: ProjectRole;
    expiresAt: Date;
}
