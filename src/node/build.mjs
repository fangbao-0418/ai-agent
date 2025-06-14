import esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createPathAliasPlugin } from './scripts/path-alias-plugin.js';

const isProduction = process.env.NODE_ENV === 'production';
const targetPlatform = process.env.TARGET_PLATFORM || 'node'; // 支持环境变量指定目标平台

// 创建路径别名插件实例
const pathAliasPlugin = createPathAliasPlugin('./tsconfig.json');

// 基础配置
const baseConfig = {
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  bundle: true,
  // sourcemap: !isProduction,
  sourcemap: false,
  minify: true,
  drop: [], // 不删除任何调试信息
  plugins: [
    pathAliasPlugin,
  ], // 使用自动化的路径别名插件
  external: [],
  // Windows 特定优化
  ...(process.platform === 'win32' || targetPlatform === 'win32' ? {
    // Windows 路径处理优化
    resolveExtensions: ['.ts', '.js', '.json'],
    // 确保路径分隔符正确处理
    absWorkingDir: process.cwd(),
  } : {}),
  // 跨平台兼容性设置
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.platform': JSON.stringify(targetPlatform === 'win32' ? 'win32' : process.platform),
    __PLATFORM__: JSON.stringify(targetPlatform),
  },
};

// 主入口配置
const mainConfig = {
  ...baseConfig,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js'
};

// 主入口配置
const testConfig = {
  ...baseConfig,
  entryPoints: ['src/env-test.ts'],
  outfile: 'dist2/index.js'
};

// Worker配置
const workerConfig = {
  ...baseConfig,
  entryPoints: [
    'src/libs/parse-profile/worker.ts'
  ],
  outfile: 'dist/libs/parse-profile/worker.js',
};

// WorkerManager配置
const workerManagerConfig = {
  ...baseConfig,
  entryPoints: [
    'src/libs/parse-profile/worker-manager.ts'
  ],
  outfile: 'dist/libs/parse-profile/worker-manager.js',
};

// MCP服务器列表
const mcpServers = [
  'commands',
  'browser',
  'filesystem', // 如果需要的话可以添加
];

// 创建MCP服务器构建配置的统一方法
const createMcpServerConfig = (serverName) => ({
  ...baseConfig,
  entryPoints: [
    `src/libs/agent-infra/mcp-servers/${serverName}/server.ts`
  ],
  outfile: `dist/libs/agent-infra/mcp-servers/${serverName}/server.js`,
});

// 生成所有MCP服务器配置
const mcpServerConfigs = mcpServers.map(serverName => ({
  name: serverName,
  config: createMcpServerConfig(serverName)
}));

// Windows 特定构建配置
const createWindowsConfig = (baseConfig) => ({
  ...baseConfig,
  target: 'node18',
  platform: 'node',
  format: 'cjs',
  // 确保external配置被保留
  external: baseConfig.external || [],
  // Windows 特定设置
  define: {
    ...baseConfig.define,
    'process.platform': JSON.stringify('win32'),
    __IS_WINDOWS__: 'true',
  },
  // 确保 Windows 路径兼容性
  resolveExtensions: ['.ts', '.js', '.json', '.node'],
  mainFields: ['main', 'module'],
});

// 创建 Windows 优化的构建配置
const createWindowsBuildConfigs = () => {
  return {
    main: createWindowsConfig(mainConfig),
    worker: createWindowsConfig(workerConfig),
    workerManager: createWindowsConfig(workerManagerConfig),
    test: createWindowsConfig(testConfig),
    mcpServers: mcpServerConfigs.map(({ name, config }) => ({
      name,
      config: createWindowsConfig(config)
    }))
  };
};

// Windows 特定构建函数
async function buildForWindows() {
  console.log(`🪟 Building for Windows with esbuild (${isProduction ? 'production' : 'development'} mode)`);
  
  const windowsConfigs = createWindowsBuildConfigs();
  
  try {
    // 构建主入口 (Windows 优化)
    console.log('📦 Building main entry for Windows...');
    await esbuild.build(windowsConfigs.main);
    console.log('✅ Windows main entry built successfully');
    // 构建worker (Windows 优化)
    console.log('📦 Building worker for Windows...');
    await esbuild.build(windowsConfigs.worker);
    await esbuild.build(windowsConfigs.workerManager);
    console.log('✅ Windows worker built successfully');
    
    // 构建所有MCP服务器 (Windows 优化)
    for (const { name, config } of windowsConfigs.mcpServers) {
      console.log(`📦 Building ${name} server for Windows...`);
      await esbuild.build(config);
      console.log(`✅ Windows ${name} server built successfully`);
    }
    
    await esbuild.build(windowsConfigs.test);
    
    console.log('🎉 Windows build completed!');
    
  } catch (error) {
    console.error('❌ Windows build failed:', error);
    process.exit(1);
  }
}

async function build() {
  console.log(`🚀 Building with esbuild (${isProduction ? 'production' : 'development'} mode)`);
  
  try {
    // 构建主入口
    console.log('📦 Building main entry...');
    await esbuild.build(mainConfig);
    console.log('✅ Main entry built successfully');
    
    // 构建worker
    console.log('📦 Building worker...');
    await esbuild.build(workerConfig);
    await esbuild.build(workerManagerConfig);
    console.log('✅ Worker built successfully');
    
    // 构建所有MCP服务器
    for (const { name, config } of mcpServerConfigs) {
      console.log(`📦 Building ${name} server...`);
      await esbuild.build(config);
      console.log(`✅ ${name} server built successfully`);
    }
    
    console.log('🎉 Build completed!');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

async function watch() {
  console.log('👀 Starting esbuild in watch mode...');
  
  try {
    // 主入口监听模式
    const mainContext = await esbuild.context(mainConfig);
    await mainContext.watch();
    console.log('✅ Main entry watching...');
    
    // Worker监听模式  
    const workerContext = await esbuild.context(workerConfig);
    await workerContext.watch();
    console.log('✅ Worker watching...');
    
    // 所有MCP服务器监听模式
    for (const { name, config } of mcpServerConfigs) {
      const serverContext = await esbuild.context(config);
      await serverContext.watch();
      console.log(`✅ ${name} server watching...`);
    }
    
    console.log('🎉 Watch mode started! Press Ctrl+C to stop.');
    
    // 保持进程运行
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping watch mode...');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Watch mode failed:', error);
    process.exit(1);
  }
}

// 根据命令行参数决定构建还是监听
if (process.argv.includes('--watch')) {
  watch();
} else if (process.argv.includes('--windows')) {
  buildForWindows();
} else if (process.env.TARGET_PLATFORM === 'win32') {
  buildForWindows();
} else {
  build();
} 