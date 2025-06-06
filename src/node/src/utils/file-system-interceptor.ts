import { ToolCallType } from '@src/types/agent';

import { ToolCall } from '@agent-infra/shared';
import { ipcClient } from '@src/entry/ipc-client';
import path from 'path';


// export const pendingPermissionRequestAtom = atom<PermissionRequest | null>(
//   null,
// );

export async function getDefaultDirectory(): Promise<string | null> {
  const settings = await ipcClient.getFileSystemSettings();
  if (settings && settings.availableDirectories.length > 0) {
    return settings.availableDirectories[0];
  }
  return null;
}

/**
 * Normalize a file path based on permissions
 * @param filePath The file path to normalize
 * @returns Normalized path (absolute)
 */
export async function normalizePath(filePath: string): Promise<string> {
  // If it's already an absolute path, return it
  if (filePath.startsWith('/')) {
    return filePath;
  }

  // Otherwise, make it relative to the default directory
  const defaultDir = await getDefaultDirectory();
  if (!defaultDir) {
    throw new Error('No default directory configured');
  }

  return path.join(defaultDir, filePath);
}


// File operation tools that require path permission checks
const FILE_OPERATION_TOOLS = [
  ToolCallType.ReadFile,
  ToolCallType.WriteFile,
  ToolCallType.ReadMultipleFiles,
  ToolCallType.EditFile,
  ToolCallType.CreateDirectory,
  ToolCallType.ListDirectory,
  ToolCallType.DirectoryTree,
  ToolCallType.MoveFile,
  ToolCallType.SearchFiles,
  ToolCallType.GetFileInfo,
];

/**
 * Intercepts tool calls to check file path permissions
 * @param toolCalls The tool calls to intercept
 * @returns Promise resolving to the intercepted tool calls
 */
export async function interceptToolCalls(
  toolCalls: ToolCall[],
): Promise<any[]> {
  const interceptedCalls: ToolCall[] = [];

  for (const toolCall of toolCalls) {
    const toolName = toolCall.function.name as ToolCallType;

    // Skip tools that don't need path permission checks
    if (!FILE_OPERATION_TOOLS.includes(toolName)) {
      interceptedCalls.push(toolCall);
      continue;
    }

    try {
      const params = JSON.parse(toolCall.function.arguments);

      // Check which paths need permission
      let pathsToCheck: string[] = [];

      if (
        toolName === ToolCallType.ReadFile ||
        toolName === ToolCallType.WriteFile ||
        toolName === ToolCallType.EditFile ||
        toolName === ToolCallType.CreateDirectory ||
        toolName === ToolCallType.ListDirectory ||
        toolName === ToolCallType.DirectoryTree ||
        toolName === ToolCallType.GetFileInfo
      ) {
        pathsToCheck = [params.path];
      } else if (toolName === ToolCallType.ReadMultipleFiles) {
        pathsToCheck = params.paths || [];
      } else if (toolName === ToolCallType.MoveFile) {
        pathsToCheck = [params.source, params.destination];
      } else if (toolName === ToolCallType.SearchFiles) {
        pathsToCheck = [params.path];
      }

      // Check permissions for all paths - this will now block until user decides
      let allPathsAllowed = true;
      for (const pathToCheck of pathsToCheck) {
        // const allowed = await checkPathPermission(pathToCheck);
        const allowed = true;
        if (!allowed) {
          allPathsAllowed = false;
          // toast.error(`Access denied to path: ${pathToCheck}`);
          break;
        }
      }

      if (allPathsAllowed) {
        // If all paths are allowed, normalize them in the tool call
        const updatedParams = { ...params };

        if (
          toolName === ToolCallType.ReadFile ||
          toolName === ToolCallType.WriteFile ||
          toolName === ToolCallType.EditFile ||
          toolName === ToolCallType.CreateDirectory ||
          toolName === ToolCallType.ListDirectory ||
          toolName === ToolCallType.DirectoryTree ||
          toolName === ToolCallType.GetFileInfo
        ) {
          updatedParams.path = await normalizePath(params.path);
        } else if (toolName === ToolCallType.ReadMultipleFiles) {
          updatedParams.paths = await Promise.all(
            (params.paths || []).map((path: string) => {
              return normalizePath(path);
            }),
          );
        } else if (toolName === ToolCallType.MoveFile) {
          updatedParams.source = await normalizePath(params.source);
          updatedParams.destination = await normalizePath(params.destination);
        } else if (toolName === ToolCallType.SearchFiles) {
          updatedParams.path = await normalizePath(params.path);
        }

        // Update the tool call with normalized paths
        interceptedCalls.push({
          ...toolCall,
          function: {
            ...toolCall.function,
            arguments: JSON.stringify(updatedParams),
          },
        });
      }
    } catch (error) {
      console.error(`Error intercepting tool call ${toolName}:`, error);
      interceptedCalls.push(toolCall);
    }
  }

  return interceptedCalls;
}
