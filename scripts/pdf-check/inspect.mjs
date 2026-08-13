import { readFileSync } from 'fs';
import pdfjs from 'pdfjs-dist/legacy/build/pdf.js';
const { getDocument } = pdfjs;

const path = process.argv[2];
const data = new Uint8Array(readFileSync(path));
const doc = await getDocument({ data, disableFontFace: true }).promise;
console.log('numPages:', doc.numPages);
const page = await doc.getPage(1);
const viewport = page.getViewport({ scale: 1 });
console.log('page1 size (pt):', viewport.width, 'x', viewport.height);
const ops = await page.getOperatorList();
const imgCount = ops.fnArray.filter((fn) => fn === 85 || fn === 86 || fn === 87 || fn === 88).length;
console.log('image-ish ops on page1:', imgCount);
const textContent = await page.getTextContent();
const text = textContent.items.map((i) => i.str).join(' ').slice(0, 300);
console.log('page1 text sample:', JSON.stringify(text));
