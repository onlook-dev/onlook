import type { CommentPosition, CommentThread, CommentNotification } from './types';

export class CommentService {
    private comments: Map<string, any> = new Map();
    private threads: Map<string, CommentThread> = new Map();

    async createComment(
        projectId: string,
        elementId: string,
        content: string,
        position: CommentPosition,
        userId: string
    ): Promise<string> {
        const commentId = `comment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const comment = {
            id: commentId,
            projectId,
            elementId,
            content,
            position,
            userId,
            status: 'open',
            createdAt: new Date(),
            updatedAt: new Date(),
            mentions: this.extractMentions(content),
        };

        // Store comment
        this.comments.set(commentId, comment);
        
        // Create or update thread
        const threadId = `thread-${elementId}`;
        if (!this.threads.has(threadId)) {
            this.threads.set(threadId, {
                id: threadId,
                comments: [],
                status: 'open',
            });
        }
        
        const thread = this.threads.get(threadId)!;
        thread.comments.push(comment);
        
        // Send notifications for mentions
        await this.processMentions(commentId, comment.mentions);
        
        // Save to database (simulated)
        await this.saveComment(comment);
        
        return commentId;
    }

    async resolveComment(commentId: string): Promise<void> {
        const comment = this.comments.get(commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }

        comment.status = 'resolved';
        comment.updatedAt = new Date();
        
        // Update thread status if all comments are resolved
        const threadId = `thread-${comment.elementId}`;
        const thread = this.threads.get(threadId);
        if (thread) {
            const allResolved = thread.comments.every(c => c.status === 'resolved');
            if (allResolved) {
                thread.status = 'resolved';
            }
        }
        
        // Save to database (simulated)
        await this.persistCommentUpdate(comment);
    }

    async addReply(commentId: string, content: string, userId: string): Promise<string> {
        const parentComment = this.comments.get(commentId);
        if (!parentComment) {
            throw new Error('Parent comment not found');
        }

        const replyId = `reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const reply = {
            id: replyId,
            parentId: commentId,
            projectId: parentComment.projectId,
            elementId: parentComment.elementId,
            content,
            position: parentComment.position,
            userId,
            status: 'open',
            createdAt: new Date(),
            updatedAt: new Date(),
            mentions: this.extractMentions(content),
        };

        // Store reply
        this.comments.set(replyId, reply);
        
        // Add to thread
        const threadId = `thread-${parentComment.elementId}`;
        const thread = this.threads.get(threadId);
        if (thread) {
            thread.comments.push(reply);
        }
        
        // Send notifications for mentions
        await this.processMentions(replyId, reply.mentions);
        
        // Save to database (simulated)
        await this.saveComment(reply);
        
        return replyId;
    }

    async mentionUser(commentId: string, userId: string): Promise<CommentNotification> {
        const comment = this.comments.get(commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }

        const notification: CommentNotification = {
            userId,
            commentId,
            type: 'mention',
            sent: false,
        };

        // Send notification (simulated)
        await this.sendNotification(notification);
        notification.sent = true;

        return notification;
    }

    async getCommentThread(threadId: string): Promise<CommentThread> {
        const thread = this.threads.get(threadId);
        if (!thread) {
            throw new Error('Thread not found');
        }
        return thread;
    }

    /**
     * Get comments for a specific element
     */
    async getCommentsForElement(elementId: string): Promise<any[]> {
        const comments = Array.from(this.comments.values())
            .filter(comment => comment.elementId === elementId && !comment.parentId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        
        return comments;
    }

    /**
     * Get all comments for a project
     */
    async getProjectComments(projectId: string): Promise<any[]> {
        const comments = Array.from(this.comments.values())
            .filter(comment => comment.projectId === projectId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        
        return comments;
    }

    /**
     * Update comment content
     */
    async updateComment(commentId: string, content: string): Promise<void> {
        const comment = this.comments.get(commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }

        comment.content = content;
        comment.updatedAt = new Date();
        comment.mentions = this.extractMentions(content);
        
        // Process new mentions
        await this.processMentions(commentId, comment.mentions);
        
        // Save to database (simulated)
        await this.persistCommentUpdate(comment);
    }

    /**
     * Delete comment
     */
    async deleteComment(commentId: string): Promise<void> {
        const comment = this.comments.get(commentId);
        if (!comment) {
            throw new Error('Comment not found');
        }

        // Remove from thread
        const threadId = `thread-${comment.elementId}`;
        const thread = this.threads.get(threadId);
        if (thread) {
            thread.comments = thread.comments.filter(c => c.id !== commentId);
        }

        // Recursively remove child replies
        const childComments = this.getChildComments(commentId);
        for (const child of childComments) {
            await this.deleteComment(child.id);
        }

        // Remove comment
        this.comments.delete(commentId);
        
        // Save to database (simulated)
        await this.deleteCommentFromStorage(commentId);
    }

    /**
     * Extract @mentions from comment content
     */
    private extractMentions(content: string): string[] {
        const mentionRegex = /@(\w+)/g;
        const mentions: string[] = [];
        let match;
        
        while ((match = mentionRegex.exec(content)) !== null) {
            mentions.push(match[1]);
        }
        
        return mentions;
    }

    /**
     * Process mentions and send notifications
     */
    private async processMentions(commentId: string, mentions: string[]): Promise<void> {
        for (const username of mentions) {
            try {
                await this.mentionUser(commentId, username);
            } catch (error) {
                console.error(`Failed to mention user ${username}:`, error);
            }
        }
    }

    /**
     * Send notification (simulated)
     */
    private async sendNotification(notification: CommentNotification): Promise<void> {
        // This would integrate with a notification system
        console.log(`Sending ${notification.type} notification to ${notification.userId} for comment ${notification.commentId}`);
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    /**
     * Save comment to database (simulated)
     */
    private async saveComment(comment: any): Promise<void> {
        // This would save to the database
        console.log(`Saving comment ${comment.id} to database`);
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    /**
     * Update comment in database (simulated)
     */
    private async persistCommentUpdate(comment: any): Promise<void> {
        // This would update the database
        console.log(`Updating comment ${comment.id} in database`);
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 50));
    }

    /**
     * Delete comment from database (simulated)
     */
    private async deleteCommentFromStorage(commentId: string): Promise<void> {
        // This would delete from the database
        console.log(`Deleting comment ${commentId} from database`);
        
        // Simulate async operation
        await new Promise(resolve => setTimeout(resolve, 50));
    }
}