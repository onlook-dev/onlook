import { api } from "@/trpc/client";
import { makeAutoObservable } from "mobx";
import type { EditorEngine } from "../engine";

export class ApiManager {
    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async webSearch(input: {
        query: string,
        allowed_domains: string[] | undefined,
        blocked_domains: string[] | undefined
    }) {
        const result = await api.utils.webSearch.mutate(input);
        return result;
    }

    async applyDiff(input: {
        originalCode: string,
        updateSnippet: string,
        instruction: string,
        metadata: {
            projectId: string;
            conversationId: string | undefined;
        }
    }) {
        return await api.utils.applyDiff.mutate(input);
    }

    async scrapeUrl(input: {
        url: string;
        formats?: ("json" | "markdown" | "html")[] | undefined;
        onlyMainContent?: boolean | undefined;
        includeTags?: string[] | undefined;
        excludeTags?: string[] | undefined;
        waitFor?: number | undefined;
    }) {
        return await api.utils.scrapeUrl.mutate(input);
    }
}