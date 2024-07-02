import localtunnel from "localtunnel";

export async function openTunnel() {
    console.log('Opening localtunnel...')
    const tunnel = await localtunnel({ port: 3000 });
    const password = await getTunnelPassword();
    console.log(tunnel.url)
    console.log(password)

    tunnel.on('close', () => {
        // tunnels are closed
    });
}

export async function getTunnelPassword() {
    try {
        const response = await fetch('https://loca.lt/mytunnelpassword');
        const password = await response.text();
        return password.trim();
    } catch (error) {
        console.error('Error fetching tunnel password:', error);
        return null;
    }
}