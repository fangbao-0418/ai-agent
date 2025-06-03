import globalData from '../global';
const fs = require('fs');

export function checkDownloadFilesExist () {
  const downloadDir = globalData.get('temp-download-dir');
  try {
    const files = fs.readdirSync(downloadDir);
    const pdfFiles = files.filter((file: any) => file.toLowerCase().endsWith('.pdf'));
    return pdfFiles.length > 0
  } catch (error) {
    return false;
  }
}

export function createUniqueID () {
  return new Date().getTime().toString() + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}