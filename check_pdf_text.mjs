import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import * as pako from 'pako';

async function main() {
  const buf = fs.readFileSync('./public/PDF.pdf');
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  const pages = doc.getPages();
  
  console.log('Extracting text from page 1...');
  const page = pages[0];
  
  try {
    const rawContent = await page.doc.context.lookupMaybe(page.node.Contents());
    if (rawContent) {
      let compressedBytes;
      if (rawContent.asUint8Array) {
        compressedBytes = rawContent.asUint8Array();
      } else {
        if (Array.isArray(rawContent)) {
            console.log("It's an array of streams");
            return;
        }
      }
      
      const uncompressed = pako.inflate(compressedBytes);
      const text = new TextDecoder().decode(uncompressed);
      
      const lines = text.split('\n');
      console.log('Successfully decompressed stream. Showing first 50 lines:');
      lines.slice(0, 50).forEach(l => console.log(l));
    }
  } catch (e) {
    console.error('Error decompressing:', e.message);
  }
}

main().catch(console.error);
