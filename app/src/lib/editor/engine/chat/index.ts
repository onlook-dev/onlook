import { EditorEngine } from '..';
import { MainChannels } from '/common/constants';

export class ChatManager {
    constructor(private editorEngine: EditorEngine) {}

    async send(message: string): Promise<string> {
        const res: string | null = await window.api.invoke(MainChannels.SEND_CHAT_MESSAGE, message);
        if (!res) {
            throw new Error('No message received');
        }
        return res;
    }
}
