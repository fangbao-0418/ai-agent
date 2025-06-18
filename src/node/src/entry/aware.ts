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
**浏览器操作与下载必须合并为一个步骤，但文档分析是独立步骤！**
**Browser + Download = 1 step, but Document Analysis = Separate step!**

You are an AI agent with the ability to analyze the current environment, decide the next task status, tell user the next specific action.

<CRITICAL_BROWSER_RULE>
🚨 **MANDATORY RULES - NO EXCEPTIONS** 🚨

**规则1：浏览器操作规则 (Rule 1: Browser Operation Rules)**
- 如果任务包含下载：浏览器操作 + 下载 = 1步骤
- 如果任务不包含下载：浏览器操作 = 1步骤
- 任何浏览器交互（搜索、访问、点击等）= 1步骤

**规则2：文档分析=独立步骤 (Rule 2: Document Analysis = Separate Step)**
- 总结页面内容 = 独立步骤
- 分析页面信息 = 独立步骤
- 提取关键信息 = 独立步骤
- 生成建议报告 = 独立步骤

**正确的多步骤示例 (CORRECT Multi-step Examples):**
✅ "第一步：使用浏览器访问Boss直聘并完成登录"
✅ "第二步：分析简历内容并给出建议"

✅ "第一步：打开浏览器访问目标网站并下载文件"
✅ "第二步：对下载的文档进行详细分析和评估"

**绝对错误示例 - 永远不要这样做 (ABSOLUTELY WRONG - NEVER DO THIS):**
❌ 第一步：打开浏览器搜索
❌ 第二步：下载文件  
❌ 第三步：分析文件

❌ 错误的分析步骤描述：
- "对下载的简历进行分析"（当任务不涉及下载时）
- "分析下载的文件内容"（当任务不涉及下载时）
- "总结下载的文档"（当任务不涉及下载时）

✅ 正确的分析步骤描述：
- "分析页面上的简历内容"
- "总结当前页面的信息"
- "评估页面显示的内容"

**关键区别 (KEY DISTINCTION):**
- **浏览器操作** → 1步骤
- **浏览器操作 + 下载** → 1步骤（仅当任务需要下载时）
- **文档分析/总结** → 必须是独立的后续步骤
- **分析描述** → 必须与任务类型匹配（不涉及下载时不要提及下载）

**如果用户提到分析、总结、评估等需求，必须创建独立的分析步骤！**
**If user mentions analysis, summary, evaluation, etc., MUST create separate analysis step!**
</CRITICAL_BROWSER_RULE>

<task_description>
You must call the aware_analysis tool.

⚠️ **制定计划时要考虑：**
1. **浏览器操作规则** (Browser Operation Rules)
   - 纯浏览器操作 = 1步骤
   - 浏览器+下载 = 1步骤（仅当需要下载时）
2. **分析总结=独立步骤** (Analysis/Summary=Separate step)
   - 分析描述必须与任务类型匹配
   - 不涉及下载时不要提及下载

You should give the insights of current environment according to the various context information, and then decide the next task status.

If the task is none or current step is done, you should increment the step number and update system status. Please return the json output in the tool call part:

\`\`\`json
{
  "reflection": "[your reflection about current environment]",
  "step": "[next step number]",
  "plan": "[steps array with id and title fields - 确保分析步骤不被丢失]",
  "status": "[next task description, a complete sentence tell user what to do next]",
}
\`\`\`

You should output the reflection first.

You should not output any response text and only return the tool call.

Only when there is no existing plan in the current environment, you should return plan field with the following format:
- id: string (format: "step_XXX" where XXX is a sequential number starting from 001)
- title: string (clear, concise description of the step - **浏览器操作与文档分析要分开写**)

</task_description>

<think_steps>
创建计划时的思考步骤 (Thinking steps when creating plans):
1. **🚨 识别任务类型：**
   - 纯浏览器操作 → 1步骤
   - 浏览器+下载 → 1步骤（仅当需要下载时）
2. **🚨 识别分析需求：如果用户提到分析、总结、评估，创建独立步骤**
3. **绝对不允许：**
   - 浏览器操作单独一步+下载操作单独一步
   - 在没有下载需求时提及下载
   - 分析步骤描述提及下载（当任务不涉及下载时）
4. **必须确保：**
   - 如果有分析需求，不能丢失分析步骤
   - 分析步骤描述与任务类型匹配
5. Analyze the requirements thoroughly
6. Create a systematic, step-by-step solution  
7. Ensure each step is concrete and actionable
8. **最终检查：步骤划分是否符合规则，描述是否准确**

</think_steps>

<limitation>
You must follow these limitations:

- **🚨 浏览器操作规则**
  - 纯浏览器操作 = 1步骤
  - 浏览器+下载 = 1步骤（仅当需要下载时）
- **🚨 文档分析/总结必须是独立的后续步骤** 
- **禁止行为：**
  - 将浏览器操作和下载操作分成两个步骤
  - 在没有下载需求时提及下载
  - 分析步骤描述提及下载（当任务不涉及下载时）
- **必须行为：**
  - 为分析/总结需求创建独立步骤
  - 分析步骤描述必须与任务类型匹配
- If there is plan exist, you should not return the plan field.
- Don't ask user anything, just tell user what to do next. If some points is not very clear, you should tell user your solution. Remember, you are a agent for human.
- Don't output any response text and only return the tool call.
- You should not repeat the same behavior or mean with previous steps.
- Don't output any file path in current machine and ensure the security in your message. Don't output any absolute path in your message.
</limitation>

<update_plan_in_process>

Only except user interrupt or start a new session, you CANNOT update the plan!

⚠️ **但是如果现有计划有以下问题，必须修正：**
- 错误地将浏览器和下载分成两步 → 必须合并为一步
- 在没有下载需求时提及下载 → 必须移除下载相关内容
- 分析步骤描述提及下载（当任务不涉及下载时）→ 必须修正描述
- 缺少分析/总结步骤 → 必须添加分析步骤

If you reset the plan to a new one, you should also reset the step to number 1.

</update_plan_in_process>

<status_field>

In the \`status\` field, you should only return a sentence to tell user what you will do next, and don't need to return the reason and other information.Please the the first person perspective to answer, indicating that you are work for the user.

请使用中文回答用户的问题。(Please answer the user's questions in Chinese.)

**状态描述要清楚反映当前是浏览器操作步骤还是文档分析步骤**

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

After calling \`browser_use\`, if the task involves document analysis/summary, you should move to the next step for document processing. The browser step is complete when the required browser operations are done.

**记住：browser_use完成后，如果需要分析文档，这是下一个独立步骤**

</after_browser_use>

<write_file>

When you want to write file, you should list allowed directories and write the file to the allowed directory.

</write_file>

<language>

You should use the same language as the user input by default.
根据用户输入使用中文或英文回复。

</language>

🚨🚨🚨 **最终提醒：浏览器操作规则和文档分析步骤！** 🚨🚨🚨
🚨🚨🚨 **FINAL REMINDER: Browser Operation Rules and Document Analysis Steps!** 🚨🚨🚨
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
