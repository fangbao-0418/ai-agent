import { useAppChat } from './use-app-chat';
import { InputFile, MessageRole } from '@src/types/chat-message';
import { AgentFlow } from '../entry/agent-flow';
import { EventItem } from '@src/types/event';
import { useAtom } from 'jotai';
// import {
//   agentStatusTipAtom,
//   currentAgentFlowIdRefAtom,
//   currentEventIdAtom,
//   eventsAtom,
//   planTasksAtom,
// } from '@utils/state/chat';
import { v4 as uuid } from 'uuid';
import { PlanTask } from '@src/types/agent';
import { showCanvasAtom } from '@utils/state/canvas';
// import { useChatSessions } from './use-chat-session';
import { ipcClient } from '../entry/ipc-client';
import { Message } from '@agent-infra/shared';
import { AppContext } from '@src/types';

export const DEFAULT_APP_ID = 'omega-agent';

export function useAgentFlow() {
  // const chatUtils = useAppChat();
  // const [, setEvents] = useAtom(eventsAtom);
  // const [, setAgentStatusTip] = useAtom(agentStatusTipAtom);
  // const [currentAgentFlowIdRef] = useAtom(currentAgentFlowIdRefAtom);
  // const [, setShowCanvas] = useAtom(showCanvasAtom);
  // const [, setEventId] = useAtom(currentEventIdAtom);
  // const [, setPlanTasks] = useAtom(planTasksAtom);
  // const { updateChatSession, currentSessionId } = useChatSessions({
  //   appId: DEFAULT_APP_ID,
  // });

  // const updateSessionTitle = useCallback(
  //   async (input: string) => {
  //     if (!currentSessionId) {
  //       return;
  //     }
  //     const userMessages = chatUtils.messages
  //       .filter((m) => m.role === MessageRole.User)
  //       .slice(-5);
  //     const userMessageContent =
  //       userMessages.map((m) => m.content).join('\n') + input;
  //     const result = await ipcClient.askLLMText({
  //       messages: [
  //         Message.systemMessage(
  //           `You are conversation summary expert.Please give a title for the coversation topic, the topic should be no more than 20 words.You can only output the topic content, don't output any other words.Use the same with as the language of the user input.The language should be the same as the user input.`,
  //         ),
  //         Message.userMessage(
  //           `user input: ${userMessageContent}, please give me the topic title.`,
  //         ),
  //       ],
  //       requestId: uuid(),
  //     });
  //     // await updateChatSession(currentSessionId, {
  //     //   name: result,
  //     // });
  //   },
  //   [currentSessionId, updateChatSession, chatUtils.messages],
  // );

  return (
    async (inputText: string, inputFiles: InputFile[]) => {
      const agentFlowId = uuid();
      // currentAgentFlowIdRef.current = agentFlowId;
      const agentFlow = new AgentFlow({
        // chatUtils,
        // setEvents,
        // setEventId,
        // setAgentStatusTip,
        // setPlanTasks,
        // setShowCanvas,
        agentFlowId,
        request: {
          inputText,
          inputFiles,
        },
      });
      await Promise.all([
        agentFlow.run(),
        // updateSessionTitle(inputText)
      ]);
      console.log('end')
    }
  );
}
