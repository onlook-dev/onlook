/** Formats without canvas storage support enter as PNG pixels. SVG keeps its original bytes. */
export async function rasterBytes(dataUrl: string): Promise<Uint8Array> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();
  const scale = Math.min(1, 4096 / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (context === null) throw new Error('Image rasterization unavailable');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (blob === null) throw new Error('Image rasterization failed');
  return new Uint8Array(await blob.arrayBuffer());
}

