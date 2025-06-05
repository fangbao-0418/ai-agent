import esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createPathAliasPlugin } from './scripts/path-alias-plugin.js';

const isProduction = process.env.NODE_ENV === 'production';

// 创建路径别名插件实例
const pathAliasPlugin = createPathAliasPlugin('./tsconfig.json');

// 基础配置
const baseConfig = {
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  bundle: true,
  sourcemap: !isProduction,
  minify: isProduction,
  drop: [], // 不删除任何调试信息
  plugins: [pathAliasPlugin], // 使用自动化的路径别名插件
  external: [],
  // external: [
  //   // Node.js 内置模块
  //   'fs', 'path', 'os', 'worker_threads', 'crypto', 'stream', 'util',
  //   // 需要保持外部的依赖
  //   'pdf-parse',
  //   'axios',
  //   'express',
  //   'socket.io',
  //   'cors',
  //   'jimp',
  //   'robotjs',
  //   'electron',
  //   'systeminformation',
  //   '@computer-use/nut-js',
  //   '@ui-tars/operator-browser',
  //   '@ui-tars/operator-nut-js',
  //   '@ui-tars/sdk'
  // ],
};

// 主入口配置
const mainConfig = {
  ...baseConfig,
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
};

// Worker配置
const workerConfig = {
  ...baseConfig,
  entryPoints: ['src/libs/parse-profile/worker.ts'],
  outfile: 'dist/libs/parse-profile/worker.js',
};

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
    console.log('✅ Worker built successfully');
    
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
} else {
  build();
} 