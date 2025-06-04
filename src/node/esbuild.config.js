const esbuild = require('esbuild');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

// 基础配置
const baseConfig = {
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  bundle: true,
  sourcemap: !isProduction,
  minify: isProduction,
  external: [
    // Node.js 内置模块
    'fs', 'path', 'os', 'worker_threads', 'crypto', 'stream', 'util',
    'http', 'https', 'url', 'querystring', 'events', 'buffer', 'process',
    // 包含native代码的模块，无法bundle
    'robotjs', 
    'electron',
    '@computer-use/nut-js'
  ],
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
  console.log(`🚀 Building with esbuild (${isProduction ? 'production' : 'development'} mode) - bundling all dependencies`);
  
  try {
    // 构建主入口
    console.log('📦 Building main entry (bundling dependencies)...');
    await esbuild.build(mainConfig);
    console.log('✅ Main entry built successfully');
    
    // 构建worker
    console.log('📦 Building worker (bundling dependencies)...');
    await esbuild.build(workerConfig);
    console.log('✅ Worker built successfully');
    
    console.log('🎉 Build completed! All dependencies bundled.');
    console.log('📦 Generated files are self-contained (except for native modules)');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

async function watch() {
  console.log('👀 Starting esbuild in watch mode (bundling dependencies)...');
  
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

module.exports = { build, watch }; 