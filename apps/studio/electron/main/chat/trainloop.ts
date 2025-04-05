import {
    BASE_PROXY_ROUTE,
    FUNCTIONS_ROUTE,
    ProxyRoutes,
    TRAINLOOP_COLLECT_ROUTE,
} from '@onlook/models/constants';
import { Client, SampleFeedbackType, type Message } from '@trainloop/sdk';

class TrainLoopManager {
    private static instance: TrainLoopManager;
    private client: Client;

    private constructor() {
        this.client = new Client(
            '',
            `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_PROXY_ROUTE}${ProxyRoutes.TRAINLOOP}${TRAINLOOP_COLLECT_ROUTE}`,
        );
    }

    public static getInstance(): TrainLoopManager {
        if (!TrainLoopManager.instance) {
            TrainLoopManager.instance = new TrainLoopManager();
        }
        return TrainLoopManager.instance;
    }

    public async saveApplyResult(messages: Message[], type: SampleFeedbackType) {
        await this.client.sendData(messages, type as string, 'onlook-apply-set');
    }
}

export default TrainLoopManager.getInstance();
