export interface User {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    email: string | null;
    createdAt: Date;
    updatedAt: Date;
}
