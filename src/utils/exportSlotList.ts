import { toPng } from 'html-to-image';

export const SLOT_LIST_EXPORT_WIDTH = 1600;

export function sanitizeSlotListFilename(name?: string): string {
  const safe = (name || 'Tournament')
    .trim()
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return `${safe || 'Tournament'}-Slot-List.png`;
}

/**
 * Exports the complete slot-list poster. The graphic itself owns its height;
 * this function reads that height so html-to-image cannot crop lower rows.
 */
export async function exportSlotListAsPng(element: HTMLElement, filename: string): Promise<void> {
  if (!element) throw new Error('No slot list graphic provided.');
  if (document.fonts?.ready) await document.fonts.ready;
  await new Promise((resolve) => setTimeout(resolve, 120));

  const width = Math.max(
    SLOT_LIST_EXPORT_WIDTH,
    Math.ceil(element.scrollWidth || element.getBoundingClientRect().width || SLOT_LIST_EXPORT_WIDTH)
  );
  const height = Math.ceil(
    element.scrollHeight || element.getBoundingClientRect().height
  );

  if (!height || height < 200) {
    throw new Error('Slot list graphic has no measurable height.');
  }

  const dataUrl = await toPng(element, {
    width,
    height,
    canvasWidth: width,
    canvasHeight: height,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: '#08090C',
  });

  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
