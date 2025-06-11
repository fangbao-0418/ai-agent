import { SearchProvider, SearchSettings, ToolCall } from '@agent-infra/shared';
import { SearchClient, SearchResult } from '@agent-infra/search';
import { MCPToolResult } from '@src/types';
import { SettingStore } from '@src/utils/store/setting.js';
import { logger } from '@utils/logger';
import { maskSensitiveData } from '@utils/maskSensitiveData';
import AgentServer from '@src/agent';
import { checkDownloadFilesExist } from '@src/utils/helper';
import parseProfiles, { parseProfilesStream } from '../parse-profile';
import WorkerManager from '../parse-profile/WorkerManager'; // 导入WorkerManager
import emitter from '@src/utils/emitter'; // 导入全局emitter
const { jsonrepair } = require('jsonrepair');
import globalData from '@src/global';

// 存储事件监听器的引用，用于后续销毁
let analysisEventListeners: { [key: string]: (...args: any[]) => void } = {};
let isAnalysisListening = false;

// 设置全局事件监听器
function setupAnalysisEventListeners() {
  if (isAnalysisListening) {
    return; // 避免重复设置监听器
  }
  
  console.log('🎧 Resume-analysis: 开始监听agent全局事件');
  isAnalysisListening = true;

  const workerManager = WorkerManager.getInstance();

  // 监听agent停止事件
  analysisEventListeners['stop'] = () => {
    console.log('🛑 Resume-analysis: 收到agent停止信号');
    // 停止文档解析流程
    workerManager.stop();
  };

  // 监听agent暂停事件
  analysisEventListeners['pause'] = () => {
    console.log('⏸️ Resume-analysis: 收到agent暂停信号');
    // 暂停文档解析流程
    workerManager.pause();
  };

  // 监听agent恢复事件
  analysisEventListeners['resume'] = () => {
    console.log('▶️ Resume-analysis: 收到agent恢复信号');
    // 恢复文档解析流程
    workerManager.resume();
  };

  // 监听agent完成事件
  analysisEventListeners['complete'] = () => {
    console.log('✅ Resume-analysis: Agent执行完成，销毁事件监听器');
    destroyAnalysisEventListeners();
  };

  // 监听agent错误事件
  analysisEventListeners['error'] = (error: any) => {
    console.log('❌ Resume-analysis: Agent执行出错，销毁事件监听器', error);
    destroyAnalysisEventListeners();
  };

  // 注册事件监听器
  emitter.on('agent:stop', analysisEventListeners['stop']);
  emitter.on('agent:pause', analysisEventListeners['pause']);
  emitter.on('agent:resume', analysisEventListeners['resume']);
  emitter.on('agent:complete', analysisEventListeners['complete']);
  emitter.on('agent:error', analysisEventListeners['error']);
}

// 销毁事件监听器
function destroyAnalysisEventListeners() {
  if (!isAnalysisListening) {
    return;
  }
  
  console.log('🗑️ Resume-analysis: 销毁agent事件监听器');
  
  // 移除所有事件监听器
  emitter.off('agent:stop', analysisEventListeners['stop']);
  emitter.off('agent:pause', analysisEventListeners['pause']);
  emitter.off('agent:resume', analysisEventListeners['resume']);
  emitter.off('agent:complete', analysisEventListeners['complete']);
  emitter.off('agent:error', analysisEventListeners['error']);
  
  // 清空监听器引用
  analysisEventListeners = {};
  isAnalysisListening = false;
}

/**
 * FIXME: `MCPToolResult` missing explicit type here, we need to refine it later.
 */
export async function run(
  toolCall: ToolCall,
  settings?: SearchSettings,
): Promise<MCPToolResult> {
  // 设置事件监听器
  setupAnalysisEventListeners();
  
  // const currentSearchConfig: any = settings || SettingStore.get('search');
  const args = JSON.parse(jsonrepair(toolCall.function.arguments)) as {
    query: string;
    count?: number;
    stream?: boolean; // 新增：是否启用流式输出
  };
  const count = args?.count ?? 10;
  const enableStream = args?.stream ?? true; // 默认启用流式输出
  
  try {
    // logger.info(
    //   'Search provider: ',
    //   currentSearchConfig.provider,
    //   'Search query:',
    //   maskSensitiveData({ query: args.query, count: args.count }),
    // );

    let results: SearchResult;
    let isError = false;
    // const agent = new AgentServer();
    // await agent.run(args.query);
    const socket = globalData.get('socket');
    let content = "继续";
    if (checkDownloadFilesExist()) {
      try {
        if (enableStream) {
          // 流式处理：直接开始流式输出，不发送running消息
          console.log('🚀 开始流式解析...');
          let currentContent = '';
          socket.emit('agent_message', {
            data: {
              conclusion: "开始解析文件，请稍等...",
              status: "start"
            }
          });
          const result = await parseProfilesStream(args.query, (chunk: string) => {
            currentContent += chunk;
            console.log('📤 发送streaming消息，累计长度:', currentContent.length);
            // 实时发送流式数据到前端
            socket.emit('agent_message', {
              data: {
                conclusion: chunk,
                status: "streaming"
              }
            });
          });
          
          console.log('✅ 流式解析完成，发送end消息');
          // 发送最终完成状态
          socket.emit('agent_message', {
            data: {
              conclusion: result,
              status: "end"
            }
          });
        } else {
          // 非流式处理：发送running状态后处理
          socket.emit('agent_message', {
            data: {
              conclusion: "开始解析文件",
              status: "running"
            }
          });
          
          const result = await parseProfiles(args.query);
          socket.emit('agent_message', {
            data: {
              conclusion: result,
              status: "end"
            }
          });
        }
      } catch (error) {
        console.error('Worker执行文档解析失败:', error);
        socket.emit('agent_message', {
          data: {
            conclusion: `文档解析失败: ${(error as Error).message}`,
            status: "error"
          }
        });
      }
    } else {
      isError = false;
      content = "未找到待分析的文档文件";
      socket.emit('agent_message', {
        data: {
          conclusion: "未找到待分析的文档文件",
          status: "error"
        }
      });
    }
    
    // 执行完成后销毁监听器
    destroyAnalysisEventListeners();
    
    return [
      {
        isError: false,
        content: [content],
      },
    ];
  } catch (e) {
    const rawErrorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    logger.error('[Search] error: ' + rawErrorMessage);
    // 出错时也要销毁监听器
    destroyAnalysisEventListeners();
    return [
      {
        isError: false,
        content: [rawErrorMessage],
      },
    ];
  }
}
