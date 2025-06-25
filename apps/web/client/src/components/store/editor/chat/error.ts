import type { Usage } from "@onlook/models";
import { makeAutoObservable } from "mobx";

export class ChatErrorManager {
    message: string | null = null;
    usage: Usage | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    handleChatError(error: Error) {
        // Try to parse error message as JSON
        try {
            const parsed = JSON.parse(error.message) as {
                code: number;
                error: string;
                usage: Usage;
            };
            if (parsed && typeof parsed === 'object') {
                if (parsed.code === 402 && parsed.usage) {
                    this.usage = parsed.usage as Usage;
                    this.message = parsed.error || 'Message limit exceeded.';
                } else {
                    this.message = parsed.error || error.toString();
                }
                return;
            }
        } catch (e) {
            // Not JSON, fallback
            this.message = error.toString();
        }
    }

    clear() {
        this.message = null;
        this.usage = null;
    }
}