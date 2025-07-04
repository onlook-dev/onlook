export interface User {
    id: string;
    firstName: string | null;
    lastName: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
}
