export function getScreenshotPath(projectId: string, mimeType: string) {
    const extension = mimeType.split('/')[1];
    return `public/${projectId}/${Date.now()}.${extension}`;
}
