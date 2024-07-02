import localtunnel from "localtunnel";

export async function openTunnel(port: number): Promise<{ url: string, password: string }> {
    console.log('Opening localtunnel...')
    const tunnel = await localtunnel({ port });
    const password = await getTunnelPassword();
    tunnel.on('close', () => {
        // tunnels are closed
    });
    return { url: tunnel.url, password };
}

export async function getTunnelPassword() {
    const response = await fetch('https://loca.lt/mytunnelpassword');
    const password = await response.text();
    return password ? password.trim() : '';
}