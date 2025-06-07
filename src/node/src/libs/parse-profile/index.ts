import WorkerManager from './WorkerManager';
import globalData from '../../global';

// 使用Worker执行文档解析的包装函数（非流式）
export async function parseProfiles(userPrompt?: string): Promise<string> {
  const downloadDir = globalData.get('temp-download-dir');
  const sessionId = globalData.get('session-id');

  if (!downloadDir || !sessionId) {
    throw new Error('下载目录或会话ID未配置');
  }

  const workerManager = WorkerManager.getInstance();
  
  try {
    const result = await workerManager.executeTask({
      downloadDir,
      sessionId,
      userPrompt
    });
    return result;
  } catch (error) {
    console.error('Worker执行失败:', error);
    throw error;
  }
}

// 使用Worker执行文档解析的包装函数（流式）
export async function parseProfilesStream(
  userPrompt?: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const downloadDir = globalData.get('temp-download-dir');
  const sessionId = globalData.get('session-id');

  if (!downloadDir || !sessionId) {
    throw new Error('下载目录或会话ID未配置');
  }

  const workerManager = WorkerManager.getInstance();
  
  try {
    const result = await workerManager.executeStreamTask({
      downloadDir,
      sessionId,
      userPrompt
    }, onChunk || (() => {}));
    return result;
  } catch (error) {
    console.error('Worker流式执行失败:', error);
    throw error;
  }
}

export default parseProfiles; 