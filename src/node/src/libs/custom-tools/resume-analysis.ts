import { SearchProvider, SearchSettings, ToolCall } from '@agent-infra/shared';
import { SearchClient, SearchResult } from '@agent-infra/search';
import { MCPToolResult } from '@src/types';
import { SettingStore } from '@src/utils/store/setting.js';
import { logger } from '@utils/logger';
import { maskSensitiveData } from '@utils/maskSensitiveData';
import AgentServer from '@src/agent';
import { checkDownloadFilesExist, checkPageFilesExist, cleanupOldSessionDirs, sendExecuteMessage } from '@src/utils/helper';
import parseProfiles, { parseProfilesStream } from '../parse-profile';
import WorkerManager from '../parse-profile/worker-manager'; // 导入WorkerManager
import emitter from '@src/utils/emitter'; // 导入全局emitter
const { jsonrepair } = require('jsonrepair');
import globalData from '@src/global';
import fs from 'fs';
import path from 'path';
import callDeepSeek from '@src/utils/ai-call/deepseek';

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
    sendExecuteMessage('end', '解析已中止');
    // 停止文档解析流程
    workerManager.stop();
  };

  // 监听agent暂停事件
  analysisEventListeners['pause'] = () => {
    console.log('⏸️ Resume-analysis: 收到agent暂停信号');
    sendExecuteMessage('pause', '解析已暂停');
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
  cleanupOldSessionDirs();
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
    let content = "";
    if (checkDownloadFilesExist()) {
      try {
        if (enableStream) {
          // 流式处理：直接开始流式输出，不发送running消息
          console.log('🚀 开始流式解析...');
          let currentContent = '';
          // socket.emit('agent_message', {
          //   data: {
          //     conclusion: "开始解析文件，请稍等...",
          //     status: "start"
          //   }
          // });
          sendExecuteMessage('running', '解析文件中...');
          const result = await parseProfilesStream(args.query, (chunk: string) => {
            currentContent += chunk;
            // 实时发送流式数据到前端
            socket.emit('agent_message', {
              data: {
                conclusion: chunk,
                status: "streaming"
              },
              type: 'streaming'
            });
          });
          sendExecuteMessage('end', '解析已完成');
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
          sendExecuteMessage('running', '解析文件中...');
          const result = await parseProfiles(args.query);
          sendExecuteMessage('end', '解析已完成');
          socket.emit('agent_message', {
            data: {
              conclusion: result,
              status: "end"
            }
          });
        }
        content = "解析完成";
      } catch (error) {
        sendExecuteMessage('error', '解析失败');
        logger.error('Worker执行文档解析失败:', error);
        socket.emit('agent_message', {
          data: {
            conclusion: `文档解析失败: ${(error as Error).message}`,
            status: "error"
          }
        });
      }
    } else if (checkPageFilesExist()) {
      sendExecuteMessage('running', '正在分析中');
      try {
        const pageContent = fs.readFileSync(path.join(globalData.get('temp-page-dir'), globalData.get('session-id') + '.txt'), 'utf-8');
        const prompt = `
          ${pageContent}
          请根据以上内容和用户输入的提示词 "${args.query}" ,推测用户意图，如果涉及浏览器相关操作动作请进行排除，输出结果要严格按照排除后的内容进行输出，不要输出限定词，不要输出任何解释
        `
        const streams = callDeepSeek(prompt)
        let content = ""
        for await (const chunk of streams) {
          content += chunk;
          socket.emit('agent_message', {
            data: {
              conclusion: chunk,
              status: "streaming"
            },
            type: 'streaming'
          });
        }
        socket.emit('agent_message', {
          data: {
            conclusion: content,
            status: "end"
          },
          type: 'streaming'
        });
        isError = false;
        content = "解析完成";
        sendExecuteMessage('end', '执行完成');
      } catch (error) {
        isError = false;
        content = "解析完成";
        sendExecuteMessage('end', '执行失败');
      }
    } else {
      isError = false;
      // content = "未找到待分析的文档文件";
      logger.error('未找到待分析的文档文件');
      content = "执行结束"
      sendExecuteMessage('error', '解析失败');
      // socket.emit('agent_message', {
      //   data: {
      //     conclusion: "未找到待分析的文档文件",
      //     status: "error"
      //   }
      // });
    }
    
    // 执行完成后销毁监听器
    destroyAnalysisEventListeners();
    logger.info('resume-analysis result', content);
    return [
      {
        isError: false,
        content: [content],
      },
    ];
  } catch (e) {
    sendExecuteMessage('error', '解析失败');
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
