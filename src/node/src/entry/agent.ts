import { createLLM } from "@src/libs/llm";
import { LLMConfig } from "@src/libs/llm/interfaces/LLMProvider";
import {
  MCPServerName,
  Message,
  MessageData,
  ModelSettings,
} from '@agent-infra/shared';

const config: LLMConfig = {
  // model: "gpt-4o-mini",
  model: "deepseek",
  apiKey: process.env.OPENAI_API_KEY,
};

async function main () {
  const llm = createLLM(config);

  const response = await llm.askTool({
    messages: [
      // Message.userMessage('What model are you using now?')
      // Message.userMessage('帮我打开boss直聘并登录')
      Message.userMessage('帮我浏览器打开boss直聘并登录后下载已沟通人选前三份简历并进行下载后分析')
    ],
    mcpServerKeys: ['browser', 'filesystem', 'commands'],
    requestId: 'test',
    toolChoice: 'required',
    tools: [
      // {
      //   type: 'function',
      //   function: {
      //     name: 'get_model_name',
      //     description: 'Get the name of the current model',
      //     parameters: {
      //       type: 'object',
      //       properties: {
      //         model: {
      //           type: 'string',
      //           description: 'The name of the model',
      //         },
      //       },
      //     },
      //   },
      // },
    ],
  });

  console.log(response);

}

main()