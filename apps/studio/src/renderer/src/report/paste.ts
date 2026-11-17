export function pasteReportImage(
  event: Pick<ClipboardEvent, 'clipboardData' | 'preventDefault'>,
  onImage: (file: File) => void,
): void {
  for (const item of Array.from(event.clipboardData?.items ?? [])) {
    if (item.kind !== 'file' || !item.type.startsWith('image/')) continue;
    const file = item.getAsFile();
    if (file === null) continue;
    event.preventDefault();
    onImage(file);
    return;
  }
}
