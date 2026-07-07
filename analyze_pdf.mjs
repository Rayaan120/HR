import { PDFDocument } from 'pdf-lib';
import fs from 'fs';

async function main() {
  const buf = fs.readFileSync('./public/PDF.pdf');
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = doc.getPages();
  
  // Extract text content from each page to understand what fields exist where
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const { width, height } = page.getSize();
    console.log(`\n=== PAGE ${i+1} (${width.toFixed(0)} x ${height.toFixed(0)} pt) ===`);
    
    // Get page content stream operators to find text
    try {
      const rawContent = await page.doc.context.lookupMaybe(page.node.Contents());
      if (rawContent) {
        const bytes = rawContent.asUint8Array ? rawContent.asUint8Array() : new Uint8Array();
        const text = new TextDecoder().decode(bytes);
        // Print relevant parts
        const lines = text.split('\n').filter(l => l.includes('Tf') || l.includes('Td') || l.includes('Tm') || (l.includes('(') && l.includes(')')));
        lines.slice(0, 100).forEach(l => console.log('  ', l.trim()));
      }
    } catch(e) {
      console.log('  Cannot extract content:', e.message);
    }
  }
}
main().catch(console.error);
