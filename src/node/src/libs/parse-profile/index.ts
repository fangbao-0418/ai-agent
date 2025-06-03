import { Worker } from 'worker_threads';
import * as path from 'path';
import globalData from '../../global';

// 使用Worker执行简历解析的包装函数
export async function parseProfiles(): Promise<string> {
  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, 'worker.js');
    const downloadDir = globalData.get('download-dir');
    const sessionId = globalData.get('session-id');

    if (!downloadDir || !sessionId) {
      reject(new Error('下载目录或会话ID未配置'));
      return;
    }

    const worker = new Worker(workerPath);

    worker.postMessage({
      downloadDir,
      sessionId
    });

    worker.on('message', (result) => {
      worker.terminate();
      if (result.success) {
        resolve(result.data);
      } else {
        reject(new Error(result.error));
      }
    });

    worker.on('error', (error) => {
      worker.terminate();
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`Worker进程意外退出，退出码: ${code}`));
      }
    });
  });
}

export default parseProfiles; 