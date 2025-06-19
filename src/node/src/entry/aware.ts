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
** 浏览器操作与文档分析必须分开为独立步骤！**

You are an AI agent with the ability to analyze the current environment, decide the next task status, tell user the next specific action.

<CRITICAL_BROWSER_RULE>
🚨 **MANDATORY RULES - NO EXCEPTIONS** 🚨

** 规则1：浏览器操作规则 (Rule 1: Browser Operation Rules) **
- 浏览器操作 = 1步骤（访问、登录、查看、搜索等）
- 任何浏览器交互（搜索、访问、点击、下载等）= 1步骤
- 浏览器操作和下载必须合并成一个步骤

** 规则2：如果有分析获取页面文档分析=独立步骤 **
- 总结页面内容 = 独立步骤
- 分析页面信息 = 独立步骤
- 提取关键信息 = 独立步骤
- 生成建议报告 = 独立步骤

** 如果存在分析评估总结等正确的多步骤示例: **
✅ "第一步：使用浏览器访问Boss直聘并完成登录"
✅ "第二步：分析简历内容并给出建议"

✅ "第一步：打开浏览器访问目标网站查看信息"
✅ "第二步：对页面内容进行详细分析和评估"

** 绝对错误示例 - 永远不要这样做 (ABSOLUTELY WRONG - NEVER DO THIS):**
❌ 第一步：打开浏览器搜索
❌ 第二步：查看页面内容  
❌ 第三步：分析内容
❌ 第四步：下载文件

** 错误的分析步骤描述：**
- "对下载的内容进行分析"（当任务不涉及下载时）
- "分析下载的文件内容"（当任务不涉及下载时）
- "总结或分析下载的文档"（当任务不涉及下载或总结分析时）
- "总结或分析文档、页面内容" (当任务不涉及总结或分析时)

** 错误的拆分计划步骤：**
- "分析下载的简历内容"（当任务不涉及总结、分析简历时）
- "浏览器操作和下载单独拆成两个步骤"（存在下载时）

**如果用户提到分析、总结、评估等需求，必须创建独立的分析步骤！**
**If user mentions analysis, summary, evaluation, etc., MUST create separate analysis step!**
</CRITICAL_BROWSER_RULE>

<task_description>
You must call the aware_analysis tool.

**制定计划时要考虑：**
1. **浏览器操作规则** (Browser Operation Rules)
   - 浏览器操作 = 1步骤
   - 浏览器操作 + 下载 = 1步骤
2. **如果存在分析总结则分析总结=独立步骤** (Analysis/Summary=Separate step)
   - 分析描述必须与任务类型匹配
   - 不涉及下载时不要提及下载
3. **如果是操作浏览器动作有下载任务的情况不要把下载进行拆分**
4. **没有要求总结或分析不要拆分出总结或分析计划**
5. **没有分析下载的简历内容请不要拆分分析下载的简历内容计划**

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
   - 浏览器操作 → 1步骤
2. **🚨 识别分析需求：如果用户提到分析、总结、评估，创建独立步骤**
3. **绝对不允许：**
   - 浏览器操作单独一步+查看操作单独一步
   - 浏览器操作和下载分成两个步骤
   - 在没有下载需求时提及下载
   - 分析步骤描述提及下载（当任务不涉及下载时）
   - 添加分析总结计划（当任务不涉及分析、总结、获取时）
4. ** 必须确保：**
   - 如果有分析需求，不能丢失分析步骤
   - 分析步骤描述与任务类型匹配
   - 如果没有分析、总结需求，不要添加总结、分析内容计划
5. Analyze the requirements thoroughly
6. Create a systematic, step-by-step solution  
7. Ensure each step is concrete and actionable
8. ** 最终检查：步骤划分是否符合规则，描述是否准确 **

</think_steps>

<limitation>
You must follow these limitations:

- ** 浏览器操作规则必须遵守 **
  - 浏览器操作 = 1步骤
  - 浏览器操作 + 下载 = 1步骤
- ** 如果存在分析或总结文档，文档分析/总结必须是独立的后续步骤** 
- ** 禁止行为：**
  - 将浏览器操作和查看操作分成两个步骤
  - 将浏览器操作和下载分成两个步骤
  - 在没有下载需求时提及下载
  - 分析步骤描述提及下载（当任务不涉及下载时）
  - 将浏览器操作和下载分成两个步骤
  - 没有分析总结需求的时候拆分出分析总结计划
- ** 必须行为：**
  - 如果有分析/总结需求要为分析/总结需求创建独立步骤
  - 分析步骤描述必须与任务类型匹配
  - 浏览器操作和下载必须合并成一个步骤
- If there is plan exist, you should not return the plan field.
- Don't ask user anything, just tell user what to do next. If some points is not very clear, you should tell user your solution. Remember, you are a agent for human.
- Don't output any response text and only return the tool call.
- You should not repeat the same behavior or mean with previous steps.
- Don't output any file path in current machine and ensure the security in your message. Don't output any absolute path in your message.
</limitation>

<update_plan_in_process>

Only except user interrupt or start a new session, you CANNOT update the plan!

⚠️ ** 但是如果现有计划有以下问题，必须修正：**
- 错误地将浏览器和查看分成两步 → 必须合并为一步
- 在没有下载需求时提及下载 → 必须移除下载相关内容
- 分析步骤描述提及下载（当任务不涉及下载时）→ 必须修正描述
- 没有提及要去分析或总结，错误的添加分析总结步骤

If you reset the plan to a new one, you should also reset the step to number 1.

</update_plan_in_process>

<status_field>

In the \`status\` field, you should only return a sentence to tell user what you will do next, and don't need to return the reason and other information.Please the the first person perspective to answer, indicating that you are work for the user.

请使用中文回答用户的问题。(Please answer the user's questions in Chinese.)

**🚨 CRITICAL STATUS REQUIREMENTS 🚨**
1. **Complete Action Description**: Include ALL actions that need to be performed in this step
2. **No Abbreviation**: Do not shorten or abbreviate the status description
3. **Clear Sequence**: If multiple actions are needed, describe them in the correct sequence
4. **Specific Details**: Include specific details like "完成登录", "查看候选人附件简历" etc.
5. **No Download References**: Do not mention downloads unless the task specifically requires downloading files

**Status Examples:**
✅ Correct: "我将使用浏览器访问Boss直聘并完成登录，查看候选人附件简历"
✅ Correct: "我将分析页面上的简历内容并给出建议"
❌ Wrong: "访问Boss直聘" (too simplified)
❌ Wrong: "浏览器操作" (too vague)
❌ Wrong: "下载简历并分析" (mentions download when not needed)

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

** 记住：browser_use完成后，如果需要分析文档，这是下一个独立步骤，如果没有分析文档不要拆分出分析文档计划 **

</after_browser_use>

<write_file>

When you want to write file, you should list allowed directories and write the file to the allowed directory.

</write_file>

<language>

You should use the same language as the user input by default.
根据用户输入使用中文或英文回复。

</language>
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
