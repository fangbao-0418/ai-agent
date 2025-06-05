import { useChat } from '@vendor/chat-ui';
import { STORAGE_DB_NAME } from '@src/constants';
import { MessageContentType } from '@src/types/chat-message';
// import { useChatSessions } from './useChatSession';
// import { DEFAULT_APP_ID } from '@renderer/components/LeftSidebar';

export const DEFAULT_APP_ID = 'omega-agent';

export function useAppChat() {
  // const { currentSessionId } = useChatSessions({
  //   appId: DEFAULT_APP_ID,
  // });
  return useChat<MessageContentType>({
    storageDbName: STORAGE_DB_NAME,
    // conversationId: currentSessionId || 'default',
    conversationId: 'default',
  });
}
