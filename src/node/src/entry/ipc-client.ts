import { 
  MCPServerName,
  Message,
  MessageData,
  ModelSettings,
  ToolCall,
} from "@src/libs/agent-infra/shared";
import { logger } from "@src/utils/logger";
import { maskSensitiveData } from "@src/utils/maskSensitiveData";
import { ChatCompletionTool } from 'openai/resources/index.mjs';
import { createLLM, LLMConfig } from '@src/libs/llm';
import { SettingStore } from "@src/utils/store/setting";
import { extractToolNames } from "@src/utils/helper";
import { getActiveMcpSettings } from "@src/libs/mcp/tools";
import { EventManager } from "./event-manager";
import EventEmitter from 'events';
import { executeCustomTool, listCustomTools } from "@src/libs/custom-tools";
import { createMcpClient, getOmegaDir } from "@src/libs/mcp/client";
import path from "path";
import fs, { readFile } from 'fs-extra';
import { MCPToolResult } from "@src/types";
import { MCPTool } from "@src/libs/agent-infra/mcp-client";

/**
 * Get the current provider configuration based on settings
 */
function getLLMProviderConfig(settings: ModelSettings): LLMConfig {
  const { provider, model, apiKey, apiVersion, endpoint } = settings;
  return {
    configName: provider,
    model,
    apiKey,
    apiVersion,
    // TODO: baseURL || endpoint
    baseURL: endpoint,
  };
}

export const currentLLMConfigRef: {
  current: LLMConfig;
} = {
  current: getLLMProviderConfig(SettingStore.get('model') || {}),
};

function toolUseToMcpTool(
  mcpTools: MCPTool[] | undefined,
  toolUse: ToolCall,
): MCPTool | undefined {
  if (!mcpTools) return undefined;
  const tool = mcpTools.find((tool) => tool.name === toolUse.function.name);
  if (!tool) return undefined;
  tool.inputSchema = JSON.parse(toolUse.function.arguments);
  return tool;
}

class IPCClient {
  async executeTool (input: { toolCalls: ToolCall[] }) {
    const mcpClient = await createMcpClient();
    const tools = await mcpClient.listTools();
    const results: MCPToolResult = [];
    for (const toolCall of input.toolCalls) {
      const mcpTool = toolUseToMcpTool(tools, toolCall);
      if (mcpTool) {
        logger.info(
          '[actionRoute.executeTool] i will execute mcp tool',
          mcpTool.name,
          mcpTool.inputSchema || {},
        );
        try {
          const result = await mcpClient.callTool({
            // client: mcpTool.serverName as MCPServerName,
            client: mcpTool.serverName as any,
            name: mcpTool.name as string,
            args: mcpTool.inputSchema || {},
          });
          logger.info(
            '[actionRoute.executeTool] execute tool result',
            JSON.stringify(result),
          );
          results.push(result);
        } catch (error) {
          const rawErrorMessage =
            error instanceof Error ? error.message : JSON.stringify(error);
          const errorMessage = `Failed to execute tool "${mcpTool.name}": ${rawErrorMessage}`;
          logger.error(`[actionRoute.executeTool] ${errorMessage}`);
          results.push({
            isError: true,
            content: [errorMessage],
          });
        }
      } else {
        logger.info(
          '[actionRoute.executeTool] executeCustomTool_toolCall',
          toolCall,
        );
        const result = await executeCustomTool(toolCall);
        logger.info(
          '[actionRoute.executeTool] executeCustomTool_result',
          result,
        );
        if (result) {
          results.push(...result);
        }
      }
    }
    return results;
  }
  async saveBrowserSnapshot () {
    // logger.info('[actionRoute.saveBrowserSnapshot] start');
    // const mcpClient = await createMcpClient();
    // try {
    //   const result = await mcpClient.callTool({
    //     client: MCPServerName.Browser,
    //     name: 'browser_screenshot',
    //     args: {
    //       highlight: true,
    //     },
    //   });
    //   const screenshotMeta = (
    //     result.content as [
    //       { type: 'text'; text: string },
    //       { type: 'image'; data: string; mimeType: string },
    //     ]
    //   )[1];
    //   const omegaDir = await getOmegaDir();
    //   const screenshotPath = path.join(omegaDir, 'screenshots');
    //   await fs.mkdirSync(screenshotPath, { recursive: true });

    //   const ext = screenshotMeta.mimeType.split('/')[1] || 'png';
    //   const timestamp = new Date().getTime();
    //   const filename = `screenshot_${timestamp}.${ext}`;
    //   const filepath = path.join(screenshotPath, filename);

    //   const imageBuffer = Buffer.from(screenshotMeta.data, 'base64');
    //   await fs.writeFile(filepath, imageBuffer);
    //   return { filepath };
    // } catch (e) {
    //   logger.error(
    //     '[actionRoute.saveBrowserSnapshot] Failed to save screenshot:',
    //     e,
    //   );
    //   throw e;
    // }
  }
  getFileSystemSettings () {
    const settings = SettingStore.get('fileSystem');
    logger.info(
      '[settingsRoute.getFileSystemSettings] result',
      maskSensitiveData(settings),
    );
    return settings;
  }
  listCustomTools (): any {
    const customTools = listCustomTools();
    return customTools;
  }
  listMcpTools (): any[] {
    return []
  }
  listTools () {
    return [
      // 'browser',
      // 'filesystem',
      // 'commands'
    ];
  }

  getActiveMcpSettings () {
    return getActiveMcpSettings();
  }

  abortRequest (input: { requestId: string}) {
    logger.info('[llmRoute.abortRequest] requestId', input.requestId);
  }
  async askLLMTool (input: {
      messages: MessageData[];
      tools: ChatCompletionTool[];
      mcpServerKeys?: (MCPServerName | string)[];
      requestId: string;
    }) {
      // const input = '';
      try {
        logger.info('[llmRoute.askLLMTool] input', input);
        const messages = input.messages.map((msg) => new Message(msg));
        logger.info(
          '[llmRoute.askLLMTool] Current LLM Config',
          maskSensitiveData(currentLLMConfigRef.current),
        );
        logger.info(
          '[llmRoute.askLLMTool] Current Search Config',
          maskSensitiveData(SettingStore.get('search')),
        );
        const llm = createLLM(currentLLMConfigRef.current);
        logger.info(
          '[llmRoute.askLLMTool] tools',
          extractToolNames(input.tools),
        );
        const response = await llm.askTool({
          messages,
          tools: input.tools,
          mcpServerKeys: input.mcpServerKeys as any,
          requestId: input.requestId,
        });
        logger.info(
          '[llmRoute.askLLMTool] response',
          JSON.stringify(response, null, 2),
        );
        return response;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? `[llmRoute.askLLMTool] Failed to get tool response from LLM: ${error.message}`
            : JSON.stringify(error);
        logger.error(errorMessage);
        throw new Error(errorMessage);
      }
    }

  askLLMTextStream (
    input: {
      messages: MessageData[];
      // tools: ChatCompletionTool[];
      // mcpServerKeys?: (MCPServerName | string)[];
      requestId: string;
    }
  ) {
    logger.info('[llmRoute.askLLMTextStream] input', input);
    const messages = input.messages.map((msg) => new Message(msg));
    const { requestId } = input;
    logger.info(
      '[llmRoute.askLLMTextStream] Current LLM Config',
      maskSensitiveData(currentLLMConfigRef.current),
    );
    const llm = createLLM(currentLLMConfigRef.current);

    (async () => {
      // const windows = BrowserWindow.getAllWindows();
      try {
        const stream = llm.askLLMTextStream({ messages, requestId });
        logger.info('[llmRoute.askLLMTextStream] stream', !!stream);

        for await (const chunk of stream) {
          console.log(chunk, 'chunk')
          emitter.emit(`llm:stream:${requestId}:data`, chunk);
        }

        emitter.emit(`llm:stream:${requestId}:end`);
      } catch (error) {
        emitter.emit(`llm:stream:${requestId}:error`);
      }
    })();

    return requestId;
  }
}


class MyEmitter extends EventEmitter {}
const emitter = new MyEmitter();

export const onMainStreamEvent = (
  streamId: string,
  handlers: {
    onData: (chunk: string) => void;
    onError: (error: Error) => void;
    onEnd: () => void;
  },
) => {
  const dataListener = (data: string) => handlers.onData(data);
  const errorListener = (error: Error) => handlers.onError(error);
  const endListener = () => handlers.onEnd();

  emitter.on(`llm:stream:${streamId}:data`, dataListener);
  emitter.on(`llm:stream:${streamId}:error`, errorListener);
  emitter.on(`llm:stream:${streamId}:end`, endListener);

  return () => {
    emitter.off(`llm:stream:${streamId}:data`, dataListener);
    emitter.off(`llm:stream:${streamId}:error`, errorListener);
    emitter.off(`llm:stream:${streamId}:end`, endListener);
  };

};

export const ipcClient = new IPCClient();