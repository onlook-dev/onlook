import { listenForAnalyticsMessages } from './analytics';
import { listenForCodeMessages } from './code';
import { listenForSettingMessages } from './settings';
import { listenForTunnelMessages } from './tunnel';

export function listenForIpcMessages() {
    listenForTunnelMessages();
    listenForAnalyticsMessages();
    listenForCodeMessages();
    listenForSettingMessages();
}
