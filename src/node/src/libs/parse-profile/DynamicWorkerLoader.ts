import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';

class DynamicWorkerLoader {
  private static workerScript: string | null = null;

  // 获取worker脚本内容
  private static getWorkerScript(): string {
    if (this.workerScript) {
      return this.workerScript;
    }

    // 尝试读取worker文件
    const possiblePaths = [
      path.join(__dirname, 'worker.js'),
      path.join(__dirname, '../parse-profile/worker.js'),
      path.join(process.cwd(), 'dist/libs/parse-profile/worker.js'),
      path.join(process.cwd(), 'worker.js'),
    ];

    for (const workerPath of possiblePaths) {
      if (fs.existsSync(workerPath)) {
        this.workerScript = fs.readFileSync(workerPath, 'utf8');
        return this.workerScript;
      }
    }

    // 如果找不到文件，使用内联代码
    this.workerScript = `
const { parentPort } = require('worker_threads');
// ... worker代码 ...
// (这里可以放置worker的完整代码)
    `;

    return this.workerScript;
  }

  // 创建Worker实例
  public static createWorker(): Worker {
    const script = this.getWorkerScript();
    const tmpPath = this.createTempFile(script);
    return new Worker(tmpPath);
  }

  // 创建临时文件
  private static createTempFile(content: string): string {
    const tmpDir = require('os').tmpdir();
    const tempPath = path.join(tmpDir, `worker-${Date.now()}.js`);
    fs.writeFileSync(tempPath, content);
    return tempPath;
  }
}

export default DynamicWorkerLoader; 