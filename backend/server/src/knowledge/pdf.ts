import { PDFParse } from "pdf-parse";

// Extracts plain text from an uploaded PDF (e.g. an owner's manual or a
// service bulletin) so it can go through the same chunk-and-embed pipeline
// as pasted text. Table/image structure is discarded — only running text.
export async function extractPdfText(data: Uint8Array): Promise<string> {
  const parser = new PDFParse({ data });
  try {
    const result = await parser.getText();
    return result.text;
  } finally {
    await parser.destroy();
  }
}
