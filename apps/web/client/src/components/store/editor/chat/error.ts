import type { MessageLimitCheckResult } from "@onlook/models/usage";
import { makeAutoObservable } from "mobx";

export class ChatErrorManager {
    message: string | null = null;
    limitInfo: MessageLimitCheckResult | null = null;

    constructor() {
        makeAutoObservable(this);
    }

    handleChatError(error: Error) {
        // Try to parse error message as JSON
        try {
            const parsed = JSON.parse(error.message);
            if (parsed && typeof parsed === 'object') {
                if (parsed.code === 402 && parsed.limitInfo) {
                    this.limitInfo = parsed.limitInfo as MessageLimitCheckResult;
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
        this.limitInfo = null;
    }
}