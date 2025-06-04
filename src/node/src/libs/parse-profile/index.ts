import WorkerManager from './WorkerManager';
import globalData from '../../global';

// 使用Worker执行简历解析的包装函数
export async function parseProfiles(): Promise<string> {
  const downloadDir = globalData.get('temp-download-dir');
  const sessionId = globalData.get('session-id');

  if (!downloadDir || !sessionId) {
    throw new Error('下载目录或会话ID未配置');
  }

  const workerManager = WorkerManager.getInstance();
  
  try {
    const result = await workerManager.executeTask({
      downloadDir,
      sessionId
    });
    return result;
  } catch (error) {
    console.error('Worker执行失败:', error);
    throw error;
  }
}

export default parseProfiles; 