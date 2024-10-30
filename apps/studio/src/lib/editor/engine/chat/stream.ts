import { makeAutoObservable } from 'mobx';
import { MainChannels } from '/common/constants';
import { StreamResponse } from '/common/models/chat/message/response';

export class StreamResolver {
    current: Partial<StreamResponse> | null = null;
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
                object: Partial<StreamResponse>;
            };
            console.log('Partial', object);
            this.current = object;
        });

        window.api.on(MainChannels.CHAT_STREAM_FINAL_MESSAGE, (args) => {
            const { requestId, object } = args as {
                requestId: string;
                object: StreamResponse;
            };
            this.requestId = null;
            this.current = null;
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
