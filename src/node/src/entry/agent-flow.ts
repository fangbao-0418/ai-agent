import { Memory } from '@agent-infra/shared';
import { ChatMessageUtil } from '@utils/chat-message-util';
import { AppContext } from '@src/types';
import { Aware, AwareResult } from './aware';
import { Executor } from './executor';
import {
  PlanTask,
  PlanTaskStatus,
  ToolCallParam,
  ToolCallType,
} from '@src/types/agent';
import { EventManager } from './event-manager';
import { ExecutorToolType } from './executor/tools';
import { ipcClient } from './ipc-client';
import { GlobalEvent, globalEventEmitter } from '@utils/state/chat';
import { Greeter } from './greeter';
import { extractHistoryEvents } from '@utils/extract-history-events';
import { EventItem, EventType } from '@src/types/event';
import { SNAPSHOT_BROWSER_ACTIONS } from '@src/constants';
import { logger } from '@src/utils/logger';
import globalData from '@src/global';

export interface AgentContext {
  plan: PlanTask[];
  currentStep: number;
  memory: Memory;
  getEnvironmentInfo: (
    appContext: AppContext,
    agentContext: AgentContext,
  ) => string;
  eventManager: EventManager;
}

export interface EventStream {}

export class AgentFlow {
  private eventManager: EventManager;
  private abortController: AbortController;
  private interruptController: AbortController;
  private hasFinished = false;
  private loadingStatusTip = '';
  
  // 添加pause相关的属性
  private isPaused = false;
  private resumePromise: Promise<void> | null = null;
  private resolveResume: (() => void) | null = null;
  private isStopped = false;
  private retryCount: number = 0;
  private MAX_STEP: number = 0;
  private readonly MAX_RETRIES: number = 2;
  private lastError: Error | null = null;

  constructor(private appContext: AppContext) {
    const omegaHistoryEvents = this.parseHistoryEvents();
    this.eventManager = new EventManager(omegaHistoryEvents);
    this.abortController = new AbortController();
    this.interruptController = new AbortController();
  }

  async run() {
    // this.appContext.setPlanTasks([]);
    // const chatUtils = this.appContext.chatUtils;
    const { setAgentStatusTip } = this.appContext;
    this.eventManager.addLoadingStatus('Thinking');
    // chatUtils.addMessage(
    //   ChatMessageUtil.assistantOmegaMessage({
    //     events: this.eventManager.getAllEvents(),
    //   }),
    //   {
    //     shouldSyncStorage: true,
    //   },
    // );
    // this.appContext.setEvents([
    //   ...this.eventManager.getHistoryEvents(),
    //   ...this.eventManager.getAllEvents(),
    // ]);
    // return;
    // setAgentStatusTip('Thinking');
    // First, we give a loading ui to the user to indicate that the agent is thinking
    const agentContext: AgentContext = {
      plan: [],
      currentStep: 0,
      memory: new Memory(),
      getEnvironmentInfo: this.getEnvironmentInfo,
      eventManager: this.eventManager,
    };
    const aware = new Aware(
      this.appContext,
      agentContext,
      this.interruptController.signal,
    );
    const executor = new Executor(
      this.appContext,
      agentContext,
      this.interruptController.signal,
    );
    this.eventManager.addLoadingStatus('Thinking');
    const greeter = new Greeter(this.appContext, this.abortController.signal);

    globalEventEmitter.addListener(
      this.appContext.agentFlowId,
      async (event) => {
        if (event.type === 'terminate') {
          this.abortController.abort();
          await this.eventManager.addEndEvent(
            'Agent flow has been terminated.',
          );
        }
      },
    );
    const preparePromise = greeter.run().then(async () => {
      // Run planner agent
      // const omegaMessage = await chatUtils.addMessage(
      //   ChatMessageUtil.assistantOmegaMessage({
      //     events: this.eventManager.getAllEvents(),
      //   }),
      //   {
      //     shouldSyncStorage: true,
      //   },
      // );
      // Bind event data and ui, when event added, the ui will be updated automatically
      // In other words, reactive ui programming
      this.eventManager.setUpdateCallback(async (events) => {
        // this.appContext.setEvents((preEvents: EventItem[]) => {
        //   // Show canvas automatically when tool used
        //   if (preEvents.find((e) => e.type === EventType.ToolUsed)) {
        //     this.appContext.setShowCanvas(true);
        //   }
        //   const latestToolUsedEvent = [...events]
        //     .reverse()
        //     .find((e) => e.type === EventType.ToolUsed);
        //   console.log('latestToolUsedEvent', latestToolUsedEvent);
        //   latestToolUsedEvent &&
        //     this.appContext.setEventId(latestToolUsedEvent.id);
        //   return [...this.eventManager.getHistoryEvents(), ...events];
        // });
        // await chatUtils.updateMessage(
        //   ChatMessageUtil.assistantOmegaMessage({ events }),
        //   {
        //     messageId: omegaMessage!.id,
        //     shouldSyncStorage: true,
        //     shouldScrollToBottom: true,
        //   },
        // );
      });

      globalEventEmitter.addListener(
        this.appContext.agentFlowId,
        async (event: GlobalEvent) => {
          switch (event.type) {
            case 'user-interrupt':
              await this.eventManager.addUserInterruptionInput(event.text);
              this.interruptController.abort();
              // await chatUtils.updateMessage(
              //   ChatMessageUtil.assistantOmegaMessage({
              //     events: this.eventManager.getAllEvents(),
              //   }),
              //   {
              //     messageId: omegaMessage!.id,
              //     shouldSyncStorage: true,
              //   },
              // );
              break;
            default:
              break;
          }
        },
      );
    });

    await Promise.all([
      preparePromise,
      this.launchAgentLoop(executor, aware, agentContext, preparePromise),
    ]);

    if (!this.abortController.signal.aborted) {
      this.eventManager.addEndEvent('> Agent TARS has finished.');
    }
  }

  private async launchAgentLoop(
    executor: Executor,
    aware: Aware,
    agentContext: AgentContext,
    preparePromise: Promise<void>,
  ) {
    this.loadingStatusTip = 'Thinking';
    const socket = globalData.get('socket')
    try {
      while (!this.abortController.signal.aborted && !this.hasFinished) {
        // 检查pause状态
        if (this.isPaused && this.resumePromise) {
          await this.eventManager.addLoadingStatus('Paused');
          await this.resumePromise;
          await this.eventManager.addLoadingStatus(this.loadingStatusTip);
        }

        // 检查是否被停止
        if (this.isStopped || this.abortController.signal.aborted) {
          break;
        }

        // The environment includes
        // - The current event stream context
        // - The current task
        // - The current user message
        try {
          await this.eventManager.addLoadingStatus(this.loadingStatusTip);
          console.log(
            'env info',
            this.getEnvironmentInfo(this.appContext, agentContext),
          );
          const awareResult = await aware.run();
          this.MAX_STEP = Math.max(awareResult.step, this.MAX_STEP)
          if (awareResult.step < this.MAX_STEP) {
            this.retryCount++;
          } else if (awareResult.step > this.MAX_STEP) {
            this.retryCount = 0;
          }
          this.loadingStatusTip = 'Thinking';
          try {
            await preparePromise;
          } catch (error) {
            this.handleError(error);
            if (this.shouldEndTask()) {
              break;
            }
            continue;
          }

          if (this.abortController.signal.aborted) {
            break;
          }
          socket.emit('agent_message', {
            data: awareResult,
            type: 'plan'
          });
          logger.info('aware result', awareResult);
          if (
            awareResult.plan &&
            awareResult.plan.every(
              (task) => task.status === PlanTaskStatus.Done,
            )
          ) {
            this.hasFinished = true;
            break;
          }

          if (this.interruptController.signal.aborted) {
            this.interruptController = new AbortController();
            this.loadingStatusTip = 'Replanning';
            aware.updateSignal(this.interruptController.signal);
            executor.updateSignal(this.interruptController.signal);
            await this.eventManager.addLoadingStatus(this.loadingStatusTip);
            // this.appContext.setAgentStatusTip(this.loadingStatusTip);
            continue;
          }
          console.log('aware result', awareResult);

          // Reset the plan
          agentContext.plan = this.normalizePlan(awareResult, agentContext);
          await this.eventManager.addPlanUpdate(
            awareResult.step,
            agentContext.plan,
          );
          // this.appContext.setPlanTasks(agentContext.plan);
          if (agentContext.plan.length === 0) {
            this.hasFinished = true;
            break;
          }
          agentContext.currentStep = awareResult.step;
          if (awareResult.step > agentContext.plan.length) {
            break;
          }
          // if (awareResult.step > agentContext.currentStep) {
          //   // Update UI, render new step
          //   await this.eventManager.addNewPlanStep(agentContext.currentStep);
          //   // Over the max task number, break the loop
          //   // if (awareResult.step > agentContext.plan.length) {
          //   //   break;
          //   // }
          // }
          if (awareResult.status) {
            // Update UI, render new status
            await this.eventManager.addAgentStatus(awareResult.status);
          }

          await this.eventManager.addLoadingStatus(this.loadingStatusTip);
          // this.appContext.setAgentStatusTip(this.loadingStatusTip);

          const toolCallList = (await executor.run(awareResult.status)).filter(
            Boolean,
          );

          if (this.abortController.signal.aborted) {
            break;
          }

          if (this.interruptController.signal.aborted) {
            this.handleUserInterrupt(aware, executor);
            continue;
          }

          const mcpTools = await ipcClient.listMcpTools();
          const customServerTools = await ipcClient.listCustomTools();
          this.loadingStatusTip = 'Executing Tool';
          
          // Execute the tools
          for (const toolCall of toolCallList) {
            try {
              const toolName = toolCall.function.name;
              const isMCPToolCall = mcpTools.some(
                (tool: any) => tool.name === toolCall.function.name,
              );
              const isCustomServerToolCall = customServerTools.some(
                (tool: any) => tool.function.name === toolCall.function.name,
              );

              await this.eventManager.addToolCallStart(
                toolName,
                toolCall.function.arguments,
              );

              await this.eventManager.addToolExecutionLoading(toolCall);

              if (isMCPToolCall || isCustomServerToolCall) {
                const callResult = (await executor.executeTools([toolCall]))[0];
                if (callResult) {
                  if (callResult.isError) {
                    this.handleError(new Error(callResult?.content as string));
                    if (this.shouldEndTask()) {
                      break;
                    }
                    continue;
                  }
                  await this.eventManager.handleToolExecution({
                    toolName,
                    toolCallId: toolCall.id,
                    params: toolCall.function.arguments,
                    result: callResult.content,
                    isError: callResult.isError as boolean,
                  });
                }
              }

              // Reset retry count on successful execution
              // this.retryCount = 0;
              this.lastError = null;

            } catch (error) {
              this.handleError(error);
              if (this.shouldEndTask()) {
                break;
              }
              continue;
            }
          }
          this.loadingStatusTip = 'Thinking';
        } catch (error) {
          this.handleError(error);
          if (this.shouldEndTask()) {
            break;
          }
          continue;
        }
      }
      if (this.lastError) {
        // this.eventManager.addAgentStatus(`Task ended after ${this.MAX_RETRIES} failed attempts. Last error: ${this.lastError.message}`);
        socket.emit('agent_message', {
          message: this.lastError?.message,
          status: 'error'
        });
        throw this.lastError;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Agent loop aborted');
        return;
      }
      throw error;
    }
  }

  private async handleUserInterrupt(aware: Aware, executor: Executor) {
    this.interruptController = new AbortController();
    aware.updateSignal(this.interruptController.signal);
    executor.updateSignal(this.interruptController.signal);
    this.loadingStatusTip = 'Replanning';
    await this.eventManager.addLoadingStatus(this.loadingStatusTip);
    // this.appContext.setAgentStatusTip(this.loadingStatusTip);
  }

  private getEnvironmentInfo(
    appContext: AppContext,
    agentContext: AgentContext,
  ) {
    const pendingInit = agentContext.plan.length === 0;
    const currentStep = agentContext.currentStep;
    const currentTask = agentContext.plan[currentStep - 1]?.title;
    return `Event stream result history: ${this.eventManager.normalizeEventsForPrompt()}

The user original input: ${appContext.request.inputText}

    ${
      pendingInit
        ? 'Plan: None'
        : `Plan:
${agentContext.plan.map((item) => `  - [${item.id}] ${item.title}`).join('\n')}

Current step: ${currentStep}

Current task: ${currentTask}
`
    }
    `;
  }

  /**
   * Get the event manager instance
   */
  public getEventManager(): EventManager {
    return this.eventManager;
  }

  private normalizePlan(awareResult: AwareResult, agentContext: AgentContext) {
    return (awareResult.plan || agentContext.plan).map((item, index) => {
      // const currentTask = agentContext.plan[index];
      if (index < awareResult.step - 1) {
        return {
          ...item,
          status: PlanTaskStatus.Done,
        };
      }

      if (index === awareResult.step - 1) {
        return {
          ...item,
          status: PlanTaskStatus.Doing,
        };
      }

      return {
        ...item,
        status: PlanTaskStatus.Todo,
      };
    });
  }

  private flagPlanDone(plan: PlanTask[]) {
    return plan.map((item) => {
      return {
        ...item,
        status: PlanTaskStatus.Done,
      };
    });
  }

  private parseHistoryEvents() {
    // const events = extractHistoryEvents(this.appContext.chatUtils.messages);
    // this.appContext.setEvents(events);
    // return events;
    return [];
  }

  // 添加pause方法
  public pause() {
    this.isPaused = true;
    this.resumePromise = new Promise((resolve) => {
      this.resolveResume = resolve;
    });
  }

  // 添加resume方法
  public resume() {
    if (this.resolveResume) {
      this.resolveResume();
      this.resumePromise = null;
      this.resolveResume = null;
    }
    this.isPaused = false;
  }

  // 添加stop方法
  public stop() {
    this.isStopped = true;
    this.abortController.abort();
  }

  private handleError(error: unknown) {
    this.retryCount++;
    this.lastError = error instanceof Error ? error : new Error(String(error));
    logger.error(`Error occurred (Attempt ${this.retryCount}/${this.MAX_RETRIES}):`, this.lastError);
    this.eventManager.addAgentStatus(`Error occurred: ${this.lastError.message}`);
  }

  private shouldEndTask(): boolean {
    if (this.retryCount >= this.MAX_RETRIES) {
      console.error(`Maximum retry attempts (${this.MAX_RETRIES}) reached. Ending task.`);
      this.eventManager.addAgentStatus(`Task ended after ${this.MAX_RETRIES} failed attempts. Last error: ${this.lastError?.message}`);
      this.hasFinished = true;
      return true;
    }
    return false;
  }
}
