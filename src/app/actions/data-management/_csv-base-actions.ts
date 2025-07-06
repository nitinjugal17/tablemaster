
import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';
import CryptoJS from 'crypto-js';

export const dataDir = path.join(process.cwd(), 'src', 'data');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export async function readCsvFile<T>(filePath: string, defaultHeaders: string): Promise<T[]> {
  console.log(`[CSV Base] Attempting to read CSV file: ${path.basename(filePath)}`);
  try {
    let fileContent = await fs.readFile(filePath, 'utf-8');
    let wasDecrypted = false;

    if (fileContent.trim() === '' && ENCRYPTION_KEY && defaultHeaders.trim() !== '') {
        console.warn(`[CSV Base] File ${filePath} is empty. If this is a new encrypted setup, this is normal. Otherwise, data might be lost or file corrupted.`);
    } else if (fileContent.trim() === '' && !ENCRYPTION_KEY && defaultHeaders.trim() !== '') {
        console.warn(`[CSV Base] File ${filePath} is empty (plaintext).`);
    }


    if (ENCRYPTION_KEY) {
      console.log(`[CSV Base] Encryption key found. Attempting to decrypt ${path.basename(filePath)}.`);
      try {
        const decryptedBytes = CryptoJS.AES.decrypt(fileContent, ENCRYPTION_KEY);
        const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);

        if (decryptedText) {
          const looksLikeCsv = decryptedText.includes(',') || decryptedText.trim() === defaultHeaders.trim() || decryptedText.trim() === '';
          if (looksLikeCsv) {
            fileContent = decryptedText;
            wasDecrypted = true;
            console.log(`[CSV Base] Successfully decrypted content from ${path.basename(filePath)}.`);
          } else {
             console.warn(`[CSV Base] Decryption of ${path.basename(filePath)} resulted in non-CSV-like content. Proceeding with original content (likely plaintext or corrupted).`);
          }
        } else if (fileContent.trim() !== '') { 
          console.warn(`[CSV Base] Decryption of ${path.basename(filePath)} resulted in empty content, but original was not. File might be corrupted or not an AES encrypted string. Proceeding with original content.`);
        }
      } catch (decryptionError) {
        console.warn(`[CSV Base] Error during decryption attempt for ${path.basename(filePath)}: ${(decryptionError as Error).message}. Proceeding with original content.`);
      }
    } else {
      console.log(`[CSV Base] No encryption key found. Parsing ${path.basename(filePath)} as plaintext.`);
    }

    if (wasDecrypted) {
      console.log(`[CSV Base] Parsing CSV content for ${path.basename(filePath)} after decryption.`);
    } else {
      console.log(`[CSV Base] Parsing CSV content for ${path.basename(filePath)} (plaintext or decryption failed/not applicable).`);
    }
    
    const parsed = Papa.parse<T>(fileContent, { 
      header: true,
      dynamicTyping: true, 
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      console.error(`[CSV Base] Errors parsing CSV ${path.basename(filePath)}:`, parsed.errors.map(e => `${e.code}: ${e.message} (Row: ${e.row})`).join('; '));
    }
    console.log(`[CSV Base] Parsed ${parsed.data.length} records from ${path.basename(filePath)}.`);
    return parsed.data;

  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(`[CSV Base] CSV file not found: ${path.basename(filePath)}. Attempting to create with headers.`);
      try {
          let contentToSave = defaultHeaders;
          if (ENCRYPTION_KEY && defaultHeaders.trim() !== '') {
            console.log(`[CSV Base] Encrypting headers for new empty file: ${path.basename(filePath)}`);
            contentToSave = CryptoJS.AES.encrypt(defaultHeaders, ENCRYPTION_KEY).toString();
          }
          await fs.writeFile(filePath, contentToSave, 'utf-8');
          console.log(`[CSV Base] Created new ${ENCRYPTION_KEY && defaultHeaders.trim() !== '' ? 'encrypted' : 'plaintext'} CSV file with headers: ${path.basename(filePath)}`);
          return []; 
      } catch (createError) {
        console.error(`[CSV Base] Failed to create empty CSV file ${path.basename(filePath)}:`, (createError as Error).message);
        throw createError; 
      }
    }
    console.error(`[CSV Base] Error reading or parsing CSV file ${path.basename(filePath)}:`, (error as Error).message, (error as Error).stack);
    throw error; 
  }
}

export async function overwriteCsvFile(filePath: string, data: any[], columns: string[]): Promise<{ success: boolean; message: string; count?: number }> {
  try {
    const csvString = Papa.unparse(data, { header: true, columns: columns });
    let contentToSave = csvString;
    let wasEncrypted = false;

    if (ENCRYPTION_KEY && csvString.trim() !== '') { 
      try {
        contentToSave = CryptoJS.AES.encrypt(csvString, ENCRYPTION_KEY).toString();
        wasEncrypted = true;
        console.log(`[CSV Base] Encrypted content for ${path.basename(filePath)}.`);
      } catch (encError) {
        console.error(`[CSV Base] Error encrypting CSV for ${path.basename(filePath)}: ${(encError as Error).message}. File not saved.`);
        return { success: false, message: `Error encrypting CSV for ${path.basename(filePath)}: ${(encError as Error).message}. File not saved.` };
      }
    } else {
        console.log(`[CSV Base] No encryption key found or content is empty. Saving ${path.basename(filePath)} as plaintext.`);
    }
    await fs.writeFile(filePath, contentToSave, 'utf-8');
    const saveMessage = `Successfully saved ${data.length} records to ${path.basename(filePath)} (${wasEncrypted ? 'encrypted' : 'plaintext'}).`;
    console.log(`[CSV Base] ${saveMessage}`);
    return { success: true, message: saveMessage, count: data.length };
  } catch (error) {
    console.error(`[CSV Base] Error writing CSV to ${path.basename(filePath)}: ${(error as Error).message}`);
    return { success: false, message: `Error writing CSV to ${path.basename(filePath)}: ${(error as Error).message}` };
  }
}

export async function getEncryptionKeyStatus(): Promise<{ isActive: boolean }> {
  return { isActive: !!ENCRYPTION_KEY };
}
