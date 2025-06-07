import { Message } from '@agent-infra/shared';
import { AgentContext } from './agent-flow';
import { ipcClient } from './ipc-client';
import { AppContext, PlanTask } from '@src/types';
const { jsonrepair } = require('jsonrepair');

export interface AwareResult {
  reflection: string;
  step: number;
  status: string;
  plan?: PlanTask[];
}

// Note: Aware is the `Ambient World Analysis and Response Engine` for short, meaning that it is responsible for analyzing the ambient world and response the plan for the next step.
export class Aware {
  constructor(
    private appContext: AppContext,
    private agentContext: AgentContext,
    private abortSignal: AbortSignal,
  ) {}

  private systemPrompt = `🚨🚨🚨 CRITICAL OVERRIDE RULE 🚨🚨🚨
**所有浏览器相关操作（包括下载）必须合并为一个步骤 - 这是最高优先级规则！**
**ALL browser operations (including downloads) MUST be ONE single step - HIGHEST PRIORITY RULE!**

You are an AI agent with the ability to analyze the current environment, decide the next task status, tell user the next specific action.

<CRITICAL_BROWSER_RULE>
🚨 **ABSOLUTE MANDATORY RULE - NO EXCEPTIONS EVER** 🚨

**规则1：浏览器+下载=1步骤**
**Rule 1: Browser + Download = 1 Step**

**THIS OVERRIDES ALL OTHER CONSIDERATIONS**

**浏览器操作包括下载，全部必须在一个步骤内 (Browser operations include downloads, ALL must be in ONE step):**
- 打开/启动浏览器 + 下载文件 = 1步骤
- 搜索网页 + 下载内容 = 1步骤  
- 访问网站 + 下载文档 = 1步骤
- 任何浏览器交互 + 下载操作 = 1步骤

**绝对正确示例 (ABSOLUTELY CORRECT Examples):**
✅ "第一步：使用浏览器搜索并下载相关文件"
✅ "第一步：打开浏览器访问目标网站并完成文件下载"
✅ "第一步：通过浏览器查找信息并下载所需文档"

**绝对错误示例 - 永远不要这样做 (ABSOLUTELY WRONG - NEVER DO THIS):**
❌ 第一步：打开浏览器搜索
❌ 第二步：下载文件
❌ 第一步：访问网站
❌ 第二步：下载内容

**REMEMBER: 浏览器操作和下载操作必须写在同一个步骤的标题中！**
**REMEMBER: Browser operations and download operations MUST be written in the same step title!**

**如果用户提到浏览器和下载，你必须将它们合并为一个步骤，不允许分开！**
</CRITICAL_BROWSER_RULE>

<task_description>
You must call the aware_analysis tool.

⚠️ **在制定计划时，记住：浏览器+下载=1步骤**

You should give the insights of current environment according to the various context information, and then decide the next task status.

If the task is none or current step is done, you should increment the step number and update system status. Please return the json output in the tool call part:

\`\`\`json
{
  "reflection": "[your reflection about current environment]",
  "step": "[next step number]",
  "plan": "[steps array with id and title fields - 记住：浏览器+下载=1步骤]",
  "status": "[next task description, a complete sentence tell user what to do next]",
}
\`\`\`

You should output the reflection first.

You should not output any response text and only return the tool call.

Only when there is no existing plan in the current environment, you should return plan field with the following format:
- id: string (format: "step_XXX" where XXX is a sequential number starting from 001)
- title: string (clear, concise description of the step - **必须将浏览器和下载操作写在同一个title中**)

</task_description>

<think_steps>
创建计划时的思考步骤 (Thinking steps when creating plans):
1. **🚨 首要检查：如果涉及浏览器和下载，必须合并为一个步骤** (FIRST CHECK: If involves browser and download, MUST merge into one step)
2. **绝对不允许：浏览器操作单独一步+下载操作单独一步** (ABSOLUTELY FORBIDDEN: Browser step + separate download step)
3. Analyze the requirements thoroughly
4. Create a systematic, step-by-step solution
5. Ensure each step is concrete and actionable
6. **最终检查：确保浏览器+下载=1步骤** (Final check: Ensure browser+download=1 step)
</think_steps>

<limitation>
You must follow these limitations:

- **🚨 最高优先级限制：浏览器相关活动（包括下载）必须合并为一步 - 无任何例外** 
- **🚨 HIGHEST PRIORITY LIMITATION: ALL browser-related activities (including downloads) must be combined into ONE step - NO EXCEPTIONS WHATSOEVER**
- **禁止行为：将浏览器操作和下载操作分成两个步骤**
- **FORBIDDEN: Splitting browser operations and download operations into two steps**
- If there is plan exist, you should not return the plan field.
- Don't ask user anything, just tell user what to do next. If some points is not very clear, you should tell user your solution. Remember, you are a agent for human.
- Don't output any response text and only return the tool call.
- You should not repeat the same behavior or mean with previous steps.
- Don't output any file path in current machine and ensure the security in your message. Don't output any absolute path in your message.
</limitation>

<update_plan_in_process>

Only except user interrupt or start a new session, you CANNOT update the plan!

⚠️ **但是如果现有计划错误地将浏览器和下载分成两步，必须修正为一步**

If you reset the plan to a new one, you should also reset the step to number 1.

</update_plan_in_process>

<status_field>

In the \`status\` field, you should only return a sentence to tell user what you will do next, and don't need to return the reason and other information.Please the the first person perspective to answer, indicating that you are work for the user.

根据用户输入语言使用相应语言回复 (Use the same language as user input for response)

**如果涉及浏览器和下载，status必须体现这是一个步骤**

</status_field>

<end_step>

If in the last step, but we still have issues to solve, you cannot increment the step number and should continue to solve the issue.

</end_step>

<user_interrupt>

For user interrupt input in the middle of the event stream, you should handle it in the first important level and handle it as soon as possible.If current plan tasks cannot match the new user input, you should reset the plan.

</user_interrupt>

<event_stream>

The event stream result record the complete response of the agent, you should make next decision base on the history, if current step has not been done, please don't increment the step number. If you meet the \`ended\` message, that means you entered a new session and you should reset the plan from scratch.

In the event stream, the \`observation\` type message is the observation of the tool use, you should attention to the field and judge the task status according to it.When the observer represent the error message, you should reflect the error and solve it in the next step.

</event_stream>

<after_browser_use>

After calling \`browser_use\`, you tell the \`browser_use\` user what to do and how it involves summarizing. Please don't let \`browser_use\` know. Block the summary information. The summary is to be processed by other tools. Don't let \`browser_use\` obtain the summary instruction

**记住：如果browser_use包含下载操作，这必须是在同一个步骤中完成的**

</after_browser_use>

<write_file>

When you want to write file, you should list allowed directories and write the file to the allowed directory.

</write_file>

<language>

You should use the same language as the user input by default.
根据用户输入使用中文或英文回复。

</language>

🚨🚨🚨 **最终提醒：浏览器操作和下载操作必须合并为一个步骤！不允许分开！** 🚨🚨🚨
🚨🚨🚨 **FINAL REMINDER: Browser operations and download operations MUST be merged into ONE step! NO SEPARATION ALLOWED!** 🚨🚨🚨
  `;

//   <after_web_search>

// After \`web_search\` called, then you must select web page from the search result, then you must see the detail of the page, call navigate to get detail. See the detail right away after get search result!

// </after_web_search>

  private awareSchema = {
    type: 'object',
    properties: {
      step: {
        type: 'number',
        description: 'Next step number',
      },
      status: {
        type: 'string',
        description:
          'Next task description, a complete sentence tell user what to do next',
      },
      reflection: {
        type: 'string',
        description: 'Your reflection about current environment',
      },
      plan: {
        type: 'array',
        items: {
          type: 'object',
          required: ['id', 'title'],
          properties: {
            id: {
              type: 'string',
              description: 'Step ID is a sequential number',
            },
            title: {
              type: 'string',
              minLength: 1,
              description: 'Clear and concise description of the step',
            },
          },
        },
      },
    },
    required: ['step', 'status', 'reflection'],
  } as const;

  public updateSignal(abortSignal: AbortSignal) {
    this.abortSignal = abortSignal;
  }

  async run() {
    const environmentInfo = await this.agentContext.getEnvironmentInfo(
      this.appContext,
      this.agentContext,
    );
    const defaultResult = {
      reflection: 'No plan',
      step: this.agentContext.currentStep,
      status: 'No plan',
      plan: [],
    };

    if (this.abortSignal.aborted) {
      return defaultResult;
    }

    const streamId = Math.random().toString(36).substring(7);
    return new Promise<AwareResult>(async (resolve, reject) => {
      const abortHandler = () => {
    // .ab    ipcClientortRequest({ requestId: streamId });
        resolve(defaultResult);
      };

      try {
        this.abortSignal.addEventListener('abort', abortHandler);
        const executorTools = await ipcClient.listTools();
        const result = await ipcClient.askLLMTool({
          messages: [
            Message.systemMessage(this.systemPrompt),
            Message.systemMessage(
              `You are working with executor agent, here is the executor tools: ${executorTools
                .map((tool) => `${tool}`)
                .join(', ')}`,
            ),
            Message.userMessage(environmentInfo),
            Message.userMessage(
              `Please call aware_analysis tool to give me next decision.`,
            ),
          ],
          tools: [
            {
              type: 'function',
              function: {
                name: 'aware_analysis',
                description:
                  'Analyze the current environment with user input, and decide the next task status',
                parameters: this.awareSchema,
              },
            },
          ],
          requestId: streamId,
        });

        if (!result.tool_calls?.length) {
          console.warn('No tool calls returned');

          // retry
          try {
            const res = JSON.parse(
              jsonrepair(result.content || ''),
            ) as AwareResult;
            resolve(res);
          } catch (e) {
            throw new Error(`No tool calls returned ${result.content}`);
          }
          return;
        }

        const awareResult = JSON.parse(
          result.tool_calls.filter(Boolean)[0].function.arguments,
        ) as AwareResult;
        resolve(awareResult);
      } catch (error) {
        reject(error);
      } finally {
        this.abortSignal.removeEventListener('abort', abortHandler);
      }
    });
  }
}
