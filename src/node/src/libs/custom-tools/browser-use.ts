import { SearchProvider, SearchSettings, ToolCall } from '@agent-infra/shared';
import { SearchClient, SearchResult } from '@agent-infra/search';
import { MCPToolResult } from '@src/types';
import { SettingStore } from '@src/utils/store/setting.js';
import { logger } from '@utils/logger';
import { maskSensitiveData } from '@utils/maskSensitiveData';
import AgentServer from '@src/agent';
const { jsonrepair } = require('jsonrepair');
import globalData from '@src/global';

/**
 * FIXME: `MCPToolResult` missing explicit type here, we need to refine it later.
 */
export async function search(
  toolCall: ToolCall,
  settings?: SearchSettings,
): Promise<MCPToolResult> {
  // const currentSearchConfig: any = settings || SettingStore.get('search');
  const args = JSON.parse(jsonrepair(toolCall.function.arguments)) as {
    query: string;
    count?: number;
  };
  const count = args?.count ?? 10;
  try {
    // logger.info(
    //   'Search provider: ',
    //   currentSearchConfig.provider,
    //   'Search query:',
    //   maskSensitiveData({ query: args.query, count: args.count }),
    // );

    let results: SearchResult;
    const socket = globalData.get('socket');
    const agent = new AgentServer({
      onData: (e) => {
        socket.emit('agent_message', e)
      },
      onError: (e) => {
        socket.emit('agent_error', e)
      }
    });
    await agent.run(args.query);
    
    // if (!currentSearchConfig) {
    //   const client = new SearchClient({
    //     logger,
    //     provider: SearchProvider.DuckduckgoSearch,
    //     providerConfig: {},
    //   });
    //   results = await client.search({
    //     query: args.query,
    //     count,
    //   });
    //   return [
    //     {
    //       isError: false,
    //       content: results,
    //     },
    //   ];
    // }

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
