import globalData from '../global';
import { ChatCompletionTool } from 'openai/resources/index.mjs';
import { logger } from './logger';

const fs = require('fs');

export function checkDownloadFilesExist () {
  const downloadDir = globalData.get('temp-download-dir');
  try {
    const files = fs.readdirSync(downloadDir);
    const pdfFiles = files.filter((file: any) => file.toLowerCase().endsWith('.pdf'));
    logger.info('checkDownloadFilesExist:', downloadDir, pdfFiles);
    return pdfFiles.length > 0
  } catch (error) {
    return false;
  }
}

export function createUniqueID () {
  return new Date().getTime().toString() + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Extract tool name list from tool object to avoid redundant logging
 */
export function extractToolNames(tools: ChatCompletionTool[]): string[] {
  return tools.map((tool) => {
    if (tool.type === 'function' && tool.function?.name) {
      return tool.function.name;
    }
    return 'unknown_tool';
  });
}
