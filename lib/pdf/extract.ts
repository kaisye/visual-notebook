"use client";

export interface PdfExtract {
  text: string;
  images: string[]; // JPEG data URLs of rendered pages
  pages: number;
}

interface Options {
  maxImagePages?: number; // how many pages to rasterize for the vision model
  maxTextChars?: number; // cap on extracted text length
  imageMaxWidth?: number; // downscale target width in px
  jpegQuality?: number;
}

let workerReady = false;

type PdfDocumentWithCleanup = {
  cleanup?: (keepLoadedFonts?: boolean) => Promise<unknown> | unknown;
  destroy?: () => Promise<void> | void;
};

async function disposePdfDocument(doc: PdfDocumentWithCleanup): Promise<void> {
  if (typeof doc.cleanup === "function") {
    await doc.cleanup();
    return;
  }
  if (typeof doc.destroy === "function") {
    await doc.destroy();
  }
}

/** Extract text + downscaled page images from a PDF File (runs in the browser). */
export async function extractPdf(file: File, opts: Options = {}): Promise<PdfExtract> {
  const {
    maxImagePages = 12,
    maxTextChars = 60000,
    imageMaxWidth = 1100,
    jpegQuality = 0.7,
  } = opts;

  // Lazy-load pdf.js only in the browser, never during SSR/build.
  const pdfjsLib = await import("pdfjs-dist");
  if (!workerReady) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    workerReady = true;
  }

  const data = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data }).promise;
  const pages = doc.numPages;

  const textParts: string[] = [];
  const images: string[] = [];

  for (let i = 1; i <= pages; i++) {
    const page = await doc.getPage(i);

    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
      .normalize("NFC"); // PDF text often comes decomposed; compose Vietnamese diacritics
    if (pageText) textParts.push(`--- Trang ${i} ---\n${pageText}`);

    if (i <= maxImagePages) {
      const baseViewport = page.getViewport({ scale: 1 });
      const scale = Math.min(2, imageMaxWidth / baseViewport.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        await page.render({ canvas, canvasContext: ctx, viewport }).promise;
        images.push(canvas.toDataURL("image/jpeg", jpegQuality));
      }
    }

    if (textParts.join("\n\n").length > maxTextChars) break;
  }

  await disposePdfDocument(doc as PdfDocumentWithCleanup);

  let text = textParts.join("\n\n");
  if (text.length > maxTextChars) text = text.slice(0, maxTextChars) + "\n…(đã cắt bớt)";

  return { text, images, pages };
}
