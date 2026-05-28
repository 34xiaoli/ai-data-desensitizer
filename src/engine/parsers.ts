import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import {
  FileType,
  DocumentContent,
  PdfPageContent,
  WordParagraphContent,
  ExcelSheetContent,
  ExcelCell,
} from '../types';

/** 设置 PDF.js Worker */
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/** 根据文件名判断文件类型 */
export function detectFileType(fileName: string): FileType {
  const ext = fileName.toLowerCase().split('.').pop() || '';
  if (ext === 'pdf') return FileType.PDF;
  if (ext === 'docx' || ext === 'doc') return FileType.WORD;
  if (ext === 'xlsx' || ext === 'xls') return FileType.EXCEL;
  return FileType.UNKNOWN;
}

/** 解析 PDF 文件 */
export async function parsePdf(buffer: ArrayBuffer): Promise<DocumentContent> {
  const data = new Uint8Array(buffer);
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pdfPages: PdfPageContent[] = [];
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    pdfPages.push({
      pageIndex: i,
      text: pageText,
    });
    textParts.push(pageText);
  }

  return {
    fileType: FileType.PDF,
    pdfPages,
    plainText: textParts.join('\n'),
  };
}

/** 解析 Word 文件 */
export async function parseWord(buffer: ArrayBuffer): Promise<DocumentContent> {
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const fullText = result.value;
  const paragraphs: WordParagraphContent[] = fullText
    .split('\n')
    .filter((line: string) => line.trim().length > 0)
    .map((text: string, index: number) => ({
      paragraphIndex: index,
      text,
    }));

  return {
    fileType: FileType.WORD,
    wordParagraphs: paragraphs,
    plainText: fullText,
  };
}

/** 解析 Excel 文件 */
export async function parseExcel(buffer: ArrayBuffer): Promise<DocumentContent> {
  const data = new Uint8Array(buffer);
  const workbook = XLSX.read(data, { type: 'array' });
  const sheets: ExcelSheetContent[] = [];
  const textParts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const cells: ExcelCell[] = [];

    if (worksheet['!ref']) {
      const range = XLSX.utils.decode_range(worksheet['!ref']);
      for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cellAddress = XLSX.utils.encode_cell({ r, c });
          const cell = worksheet[cellAddress];
          if (cell && cell.v !== undefined && cell.v !== null) {
            const value = String(cell.v);
            cells.push({ row: r, col: c, value });
          }
        }
      }
    }

    sheets.push({ sheetName, cells });
    const sheetText = cells.map((c) => c.value).join(' ');
    textParts.push(sheetText);
  }

  return {
    fileType: FileType.EXCEL,
    excelSheets: sheets,
    plainText: textParts.join('\n'),
  };
}

/** 统一文档解析入口 */
export async function parseDocument(
  buffer: ArrayBuffer,
  fileType: FileType
): Promise<DocumentContent> {
  switch (fileType) {
    case FileType.PDF:
      return parsePdf(buffer);
    case FileType.WORD:
      return parseWord(buffer);
    case FileType.EXCEL:
      return parseExcel(buffer);
    default:
      throw new Error(`不支持的文件类型: ${fileType}`);
  }
}
