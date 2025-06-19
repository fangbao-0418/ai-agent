import emitter from "@src/utils/emitter";
import globalData from "@src/global";
import * as fs from 'fs';
import { logger } from "@src/utils/logger";
export async function checkDownload () {
  const downloadNumber = globalData.get('download-number') + 1;
  globalData.set('download-number', downloadNumber);
  logger.info('checkDownload', downloadNumber);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        let fileCount = 0;
        fs.readdirSync(globalData.get('temp-download-dir')).forEach(file => {
          if (file.endsWith('.pdf')) {
            fileCount++;
          }
        });
        if (fileCount === downloadNumber) {
          resolve(true)
          return;
        } else {
          globalData.set('download-number', downloadNumber - 1);
          logger.error('download number not match', downloadNumber, fileCount);
          reject(new Error('download number not match'))
        }
      } catch (error) {
        globalData.set('download-number', downloadNumber - 1);
        logger.error('checkDownload error', error);
        reject(error)
      }
    }, 5000);
  });
}