import localtunnel from 'localtunnel';
import { TunnelResult } from '/common/models';

export class TunnelService {
    tunnel: localtunnel.Tunnel | null = null;
    async open(port: number): Promise<TunnelResult> {
        this.tunnel = await localtunnel({ port });
        const password = await this.getPassword();
        return { url: this.tunnel.url, password };
    }

    async close() {
        if (this.tunnel) {
            await this.tunnel.close();
        }
    }

    async getPassword() {
        const response = await fetch('https://loca.lt/mytunnelpassword');
        const password = await response.text();
        return password ? password.trim() : '';
    }
}
