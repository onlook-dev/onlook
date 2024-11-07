import type { StreamResponse } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { DeepPartial } from 'ai';
import { makeAutoObservable } from 'mobx';

export class StreamResolver {
    current: DeepPartial<StreamResponse> | null = null;
    requestId: string | null = null;
    errorMessage: string | null = null;

    constructor() {
        makeAutoObservable(this);
        this.listen();
    }

    clear() {
        this.current = null;
        this.requestId = null;
        this.errorMessage = null;
    }

    listen() {
        window.api.on(MainChannels.CHAT_STREAM_PARTIAL, (args) => {
            const { requestId, object } = args as {
                requestId: string;
                object: DeepPartial<StreamResponse>;
            };
            this.current = object;
        });

        window.api.on(MainChannels.CHAT_STREAM_FINAL_MESSAGE, (args) => {
            const { requestId, object } = args as {
                requestId: string;
                object: StreamResponse;
            };
            this.current = object;
        });

        window.api.on(MainChannels.CHAT_STREAM_ERROR, (args) => {
            const { requestId, message } = args as {
                requestId: string;
                message: string;
            };

            this.errorMessage = message;
            this.requestId = null;
            this.current = null;
        });
    }
}
