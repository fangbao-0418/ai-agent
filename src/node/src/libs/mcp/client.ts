import { MCPClient, MCPServer } from '@agent-infra/mcp-client';
import { MCPServerName } from '@agent-infra/shared';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { logger } from '@utils/logger';
import { getActiveMcpSettings } from './tools';
import { fileURLToPath } from 'url';

// Keep track of the filesystem client to allow updating allowed directories
let fsMcpServerModule: any = null;

export const getOmegaDir = async () => {
  // Create working directory in user's home directory.
  const omegaDir = path.join(os.homedir(), '.omega');
  if (!fs.existsSync(omegaDir)) {
    await fs.mkdir(omegaDir, { recursive: true });
  }
  return omegaDir;
};

const dynamicImport = (url: any) =>
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  new Function(`return import('${url}')`)();

// 获取MCP服务器模块的正确路径
const getMcpServerPath = (serverName: string) => {
  // 尝试多种路径解析方式，确保在不同环境下都能工作
  
  // 方法1: 尝试相对于当前模块的路径
  try {
    const currentDir = path.dirname(require.resolve('./client.js'));
    const serverPath = path.resolve(currentDir, `../agent-infra/mcp-servers/${serverName}/server.js`);
    if (fs.existsSync(serverPath)) {
      logger.info(`Found MCP server at: ${serverPath}`);
      return serverPath;
    }
  } catch (error) {
    // ignore
  }
  
  // 方法2: 尝试相对于进程工作目录的路径 (适用于开发环境)
  try {
    const devPath = path.resolve(process.cwd(), `dist/libs/agent-infra/mcp-servers/${serverName}/server.js`);
    if (fs.existsSync(devPath)) {
      logger.info(`Found MCP server at: ${devPath}`);
      return devPath;
    }
  } catch (error) {
    // ignore
  }
  
  // 方法3: 尝试相对于主模块的路径
  try {
    const mainDir = path.dirname(require.main?.filename || '');
    const mainPath = path.resolve(mainDir, `libs/agent-infra/mcp-servers/${serverName}/server.js`);
    if (fs.existsSync(mainPath)) {
      logger.info(`Found MCP server at: ${mainPath}`);
      return mainPath;
    }
  } catch (error) {
    // ignore
  }
  
  // 如果都找不到，抛出错误
  throw new Error(`Could not find MCP server module: ${serverName}`);
};

// Initialize MCP client with filesystem and commands tools
export const createMcpClient = async () => {
  if (mapClientRef.current) {
    return mapClientRef.current;
  }
  
  try {
    const commandModule = await dynamicImport(getMcpServerPath('commands'));
    const fsModule = await dynamicImport(getMcpServerPath('filesystem'));
    const browserModule = await dynamicImport(getMcpServerPath('browser'));

    const { createServer: createCommandServer } = commandModule.default || commandModule;
    const { createServer: createFileSystemServer } = fsModule.default || fsModule;
    const { createServer: createBrowserServer } = browserModule.default || browserModule;

    fsMcpServerModule = fsModule.default || fsModule;

    const omegaDir = await getOmegaDir();

    const toolsMap: Record<MCPServerName, MCPServer<MCPServerName>> = {
      [MCPServerName.FileSystem]: {
        type: 'builtin',
        name: MCPServerName.FileSystem,
        description: 'filesystem tool',
        mcpServer: createFileSystemServer({
          allowedDirectories: [omegaDir],
        }),
      },
      [MCPServerName.Commands]: {
        type: 'builtin',
        name: MCPServerName.Commands,
        description: 'commands tool',
        mcpServer: createCommandServer(),
      },
      // [MCPServerName.Browser]: {
      //   type: 'builtin',
      //   name: MCPServerName.Browser,
      //   description: 'browser tools',
      //   mcpServer: createBrowserServer({
      //     launchOptions: {
      //       headless: true,
      //     },
      //   }),
      // },
      ...getActiveMcpSettings(),
    };

    logger.info('toolsMap', toolsMap);

    const client = new MCPClient(Object.values(toolsMap));
    mapClientRef.current = client;
    return client;
  } catch (error) {
    logger.error('Error creating MCP client:', error);
    throw error;
  }
};

export const mapClientRef: {
  current: MCPClient | undefined;
} = {
  current: undefined,
};

export const setAllowedDirectories = async (directories: string[]) => {
  if (fsMcpServerModule && fsMcpServerModule.setAllowedDirectories) {
    return fsMcpServerModule.setAllowedDirectories(directories);
  }
  throw new Error('File system client not initialized');
};

export const getAllowedDirectories = async (): Promise<string[]> => {
  if (fsMcpServerModule && fsMcpServerModule.getAllowedDirectories) {
    return fsMcpServerModule.getAllowedDirectories();
  }
  const omegaDir = await getOmegaDir();
  return [omegaDir];
};
