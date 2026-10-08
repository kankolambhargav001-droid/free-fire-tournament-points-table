import { toPng } from 'html-to-image';

export interface ExportPointsTableOptions {
  filename?: string;
  pixelRatio?: number;
  format?: '4:5' | '9:16' | '16:9';
}

/**
 * Returns exact canvas width and height for points table export.
 * 4:5  -> 1080 × 1350 (Social Standings / Instagram Feed - Preferred)
 * 9:16 -> 1080 × 1920 (Vertical Story)
 * 16:9 -> 1920 × 1080 (Broadcast Wide)
 */
export function getExportDimensions(format: '4:5' | '9:16' | '16:9' = '4:5'): {
  width: number;
  height: number;
} {
  switch (format) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '9:16':
      return { width: 1080, height: 1920 };
    case '4:5':
    default:
      return { width: 1080, height: 1350 };
  }
}

/**
 * Sanitizes tournament name to generate a clean, safe filename.
 * Example: "9 PM Practice" -> "9-PM-Practice-Points-Table.png"
 * Unsafe filename characters like / \ : * ? " < > | are stripped.
 */
export function sanitizePointsTableFilename(
  tournamentName?: string,
  _format: '4:5' | '9:16' | '16:9' = '4:5'
): string {
  const rawName = (tournamentName || 'Tournament').trim();

  // Strip unsafe filesystem characters: / \ : * ? " < > |
  const safeName = rawName
    .replace(/[/\\:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const baseName = safeName || 'Tournament';
  return `${baseName}-Points-Table.png`;
}

/**
 * Generates a PNG Blob from the given points table graphic HTML element.
 * Single source of truth for:
 * - Download PNG
 * - Share PNG (File)
 * - Copy Image (ClipboardItem)
 */
export async function generatePointsTablePngBlob(
  element: HTMLElement,
  options: ExportPointsTableOptions = {}
): Promise<Blob> {
  if (!element) {
    throw new Error('No graphic element provided for export.');
  }

  // 1. Wait for document fonts to be ready to avoid fallback fonts
  if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // 2. Wait for any internal images or icons to load
  const images = Array.from(element.querySelectorAll('img'));
  if (images.length > 0) {
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
        });
      })
    );
  }

  // 3. Small pause to ensure full paint of DOM styles
  await new Promise((resolve) => setTimeout(resolve, 150));

  // 4. Determine exact format dimensions
  const format = options.format || '4:5';
  const { width: targetWidth, height: targetHeight } = getExportDimensions(format);

  // 5. Generate PNG using html-to-image with exact target dimensions
  const dataUrl = await toPng(element, {
    width: targetWidth,
    height: targetHeight,
    canvasWidth: targetWidth,
    canvasHeight: targetHeight,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: '#FFFFFF',
  });

  const response = await fetch(dataUrl);
  return await response.blob();
}

/**
 * Exports the given points table graphic HTML element as a high-resolution PNG image.
 * Uses html-to-image with exact target dimensions for the selected format:
 * - 4:5: 1080 × 1350
 * - 9:16: 1080 × 1920
 * - 16:9: 1920 × 1080
 */
export async function exportPointsTableAsPng(
  element: HTMLElement,
  filename: string,
  options: ExportPointsTableOptions = {}
): Promise<void> {
  const blob = await generatePointsTablePngBlob(element, options);
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.download = filename;
  link.href = objectUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

/**
 * Copies the points table graphic directly to clipboard as a PNG image.
 * Uses navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
 */
export async function copyPointsTableToClipboard(
  element: HTMLElement,
  options: ExportPointsTableOptions = {}
): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('Clipboard image copying is not supported in this browser.');
  }

  const blob = await generatePointsTablePngBlob(element, options);
  await navigator.clipboard.write([
    new ClipboardItem({
      'image/png': blob,
    }),
  ]);
}
