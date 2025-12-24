export interface CommentPosition {
    x: number;
    y: number;
    elementSelector: string;
    pageUrl: string;
}

export interface CommentData {
    id: string;
    projectId: string;
    elementId: string;
    content: string;
    position: CommentPosition;
    userId: string;
    status: 'open' | 'resolved' | 'closed';
    createdAt: Date;
    updatedAt: Date;
    parentId?: string;
    mentions: string[];
}

export interface CommentThread {
    id: string;
    comments: CommentData[];
    status: 'open' | 'resolved' | 'closed';
}

export interface CommentNotification {
    userId: string;
    commentId: string;
    type: 'mention' | 'reply' | 'resolution';
    sent: boolean;
}