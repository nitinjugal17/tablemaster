
// src/app/actions/logging-actions.ts
'use server';
import fs from 'fs/promises';
import path from 'path';

// Note: dataDir is simplified as its original file was removed.
// Recreating a simple version here.
const dataDir = path.join(process.cwd(), 'src', 'data');

const serverLogFilePath = path.join(dataDir, 'server-logs.txt');
const clientLogFilePath = path.join(dataDir, 'client-logs.txt');
const MAX_LOG_LINES = 500;

async function ensureLogFileExists(filePath: string, logType: string) {
  try {
    await fs.access(filePath);
  } catch (error) {
    const timestamp = new Date().toISOString();
    try {
      await fs.mkdir(dataDir, { recursive: true });
      await fs.writeFile(filePath, `[${timestamp}] [INFO] ${logType} log file created.\n`, 'utf-8');
      console.log(`[Logging Action] Created new log file: ${path.basename(filePath)}`);
    } catch(mkdirError) {
      console.error(`[Logging Action] Failed to create data directory or log file:`, mkdirError);
    }
  }
}

async function appendToLogFile(filePath: string, logEntry: string, logType: string) {
  await ensureLogFileExists(filePath, logType);
  try {
    await fs.appendFile(filePath, logEntry, 'utf-8');
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    if (lines.length > MAX_LOG_LINES + 50) {
      const trimmedLines = lines.slice(-MAX_LOG_LINES);
      await fs.writeFile(filePath, trimmedLines.join('\n'), 'utf-8');
      console.log(`[Logging Action] ${logType} log file trimmed to last ${MAX_LOG_LINES} lines.`);
    }
  } catch (error) {
    console.error(`[Logging Action] Failed to write to ${logType} log file:`, error);
  }
}

export async function addLogEntry(logMessage: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO'): Promise<void> {
  const timestamp = new Date().toISOString();
  const formattedEntry = `[${timestamp}] [SERVER] [${level}] ${logMessage}\n`;
  await appendToLogFile(serverLogFilePath, formattedEntry, "Server");
}

export async function getLogEntries(limit: number = 500): Promise<string[]> {
  await ensureLogFileExists(serverLogFilePath, "Server");
  try {
    const content = await fs.readFile(serverLogFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    return lines.slice(Math.max(0, lines.length - limit));
  } catch (error) {
    console.error('[Logging Action] Failed to read server log file:', error);
    return [`[ERROR] Failed to read server log file: ${(error as Error).message}`];
  }
}

export async function addClientLogEntry(
  logMessage: string,
  level: 'INFO' | 'WARN' | 'ERROR' = 'INFO',
  details?: Record<string, any>
): Promise<void> {
  const timestamp = new Date().toISOString();
  let detailString = "";
  if (details && Object.keys(details).length > 0) {
    try {
      detailString = ` Details: ${JSON.stringify(details)}`;
    } catch (e) {
      detailString = " Details: (unable to stringify details)";
    }
  }
  const formattedEntry = `[${timestamp}] [CLIENT] [${level}] ${logMessage}${detailString}\n`;
  await appendToLogFile(clientLogFilePath, formattedEntry, "Client");
}

export async function getClientLogEntries(limit: number = 500): Promise<string[]> {
  await ensureLogFileExists(clientLogFilePath, "Client");
  try {
    const content = await fs.readFile(clientLogFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim() !== '');
    return lines.slice(Math.max(0, lines.length - limit));
  } catch (error) {
    console.error('[Logging Action] Failed to read client log file:', error);
    return [`[ERROR] Failed to read client log file: ${(error as Error).message}`];
  }
}
