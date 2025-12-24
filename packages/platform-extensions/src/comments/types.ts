export interface CommentPosition {
    x: number;
    y: number;
    elementSelector: string;
    pageUrl: string;
}

export interface CommentThread {
    id: string;
    comments: Comment[];
    status: 'open' | 'resolved' | 'closed';
}

export interface CommentNotification {
    userId: string;
    commentId: string;
    type: 'mention' | 'reply' | 'resolution';
    sent: boolean;
}