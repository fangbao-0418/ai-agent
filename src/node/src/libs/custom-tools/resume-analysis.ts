import { SearchProvider, SearchSettings, ToolCall } from '@agent-infra/shared';
import { SearchClient, SearchResult } from '@agent-infra/search';
import { MCPToolResult } from '@src/types';
import { SettingStore } from '@src/utils/store/setting.js';
import { logger } from '@utils/logger';
import { maskSensitiveData } from '@utils/maskSensitiveData';
import AgentServer from '@src/agent';
import { checkDownloadFilesExist } from '@src/utils/helper';
import parseProfiles, { parseProfilesStream } from '../parse-profile';
const { jsonrepair } = require('jsonrepair');
import globalData from '@src/global';
/**
 * FIXME: `MCPToolResult` missing explicit type here, we need to refine it later.
 */
export async function run(
  toolCall: ToolCall,
  settings?: SearchSettings,
): Promise<MCPToolResult> {
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
    // const agent = new AgentServer();
    // await agent.run(args.query);
    const socket = globalData.get('socket');
    if (checkDownloadFilesExist()) {
      try {
        if (enableStream) {
          // 流式处理：直接开始流式输出，不发送running消息
          console.log('🚀 开始流式解析...');
          let currentContent = '';
          
          const result = await parseProfilesStream(args.query, (chunk: string) => {
            currentContent += chunk;
            console.log('📤 发送streaming消息，累计长度:', currentContent.length);
            // 实时发送流式数据到前端
            socket.emit('agent_message', {
              data: {
                conclusion: currentContent,
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
      socket.emit('agent_message', {
        data: {
          conclusion: "未找到待分析的文档文件",
          status: "error"
        }
      });
    }
    
    return [
      {
        isError: false,
        content: '继续',
      },
    ];
  } catch (e) {
    const rawErrorMessage = e instanceof Error ? e.message : JSON.stringify(e);
    logger.error('[Search] error: ' + rawErrorMessage);
    return [
      {
        isError: true,
        content: [rawErrorMessage],
      },
    ];
  }
}
