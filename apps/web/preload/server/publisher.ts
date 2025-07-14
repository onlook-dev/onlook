import fs from "fs";
import { preloadScriptPath } from "./index";

const localWebhookUrl = "http://localhost:3000/webhook/dev/preload";
const currentProjectId = "05e37ed0-77f0-45e3-a750-344c7d3c1e46";

// Function to call webhook when file changes
async function notifyWebhook() {
    try {
        const response = await fetch(localWebhookUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                message: "index.js file changed",
                timestamp: new Date().toISOString(),
                file: preloadScriptPath,
                projectId: currentProjectId
            }),
        });

        if (response.ok) {
            console.log("Webhook notification sent successfully");
        } else {
            console.error("Failed to send webhook notification:", response.status);
        }
    } catch (error) {
        console.error("Error sending webhook notification:", error);
    }
}

let watcher: fs.FSWatcher | null = null;

export const startListeningForChanges = () => {
    if (watcher) {
        watcher.close();
    }
    // Set up file watcher
    if (fs.existsSync(preloadScriptPath)) {
        watcher = fs.watch(preloadScriptPath, (eventType, filename) => {
            if (eventType === 'change') {
                console.log(`File ${filename} changed, notifying webhook...`);
                notifyWebhook();
            }
        });
        console.log(`Watching for changes to: ${preloadScriptPath}`);
    } else {
        console.log(`File not found for watching: ${preloadScriptPath}`);
    }
}