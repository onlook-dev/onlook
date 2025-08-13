import type { Usage } from "@onlook/models";
import { makeAutoObservable } from "mobx";

export class ChatErrorManager {
    message: string | null = null;
    usage: Usage | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    hasError() {
        return this.message !== null || this.usage !== null;
    }

    handleChatError(error: Error) {
        console.error('handleChatError', error);
        // Try to parse error message as JSON
        try {
            const parsed = JSON.parse(error.message) as {
                code: number;
                error: string;
                usage: Usage;
            };
            if (parsed && typeof parsed === 'object') {
                if (parsed.code === 402 && parsed.usage) {
                    this.usage = parsed.usage;
                    this.message = parsed.error || 'Message limit exceeded.';
                } else {
                    this.message = parsed.error || error.toString();
                }
            }
            console.log('message', this.message);
            console.log('usage', this.usage);
        } catch (e) {
            // Not JSON, fallback
            this.message = error.toString();
        }
    }

    clear() {
        console.error('clear error');
        this.message = null;
        this.usage = null;
    }
}