const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

async function build() {
  console.log('🚀 Building with esbuild (bundling all dependencies)...');
  
  try {
    // 确保dist目录存在
    const distDir = path.join(__dirname, 'dist');
    const distWorkerDir = path.join(distDir, 'libs', 'parse-profile');
    
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }
    
    if (!fs.existsSync(distWorkerDir)) {
      fs.mkdirSync(distWorkerDir, { recursive: true });
    }

    // 只保留Node.js内置模块和一些特殊的native模块为external
    const externals = [
      // Node.js 内置模块
      'fs', 'path', 'os', 'worker_threads', 'crypto', 'stream', 'util', 
      'http', 'https', 'url', 'querystring', 'events', 'buffer', 'process',
      // 包含native代码的模块，无法bundle
      'robotjs', 
      'electron',
      '@computer-use/nut-js'
    ];
    
    const externalArgs = externals.map(pkg => `--external:${pkg}`).join(' ');
    
    // 构建主入口
    console.log('📦 Building main entry (bundling dependencies)...');
    const mainCmd = `npx --yes esbuild src/index.ts --bundle --platform=node --target=node18 --format=cjs --outfile=dist/index.js ${externalArgs}`;
    execSync(mainCmd, { stdio: 'inherit' });
    console.log('✅ Main entry built successfully');
    
    // 构建worker
    console.log('📦 Building worker (bundling dependencies)...');
    const workerCmd = `npx --yes esbuild src/libs/parse-profile/worker.ts --bundle --platform=node --target=node18 --format=cjs --outfile=dist/libs/parse-profile/worker.js ${externalArgs}`;
    execSync(workerCmd, { stdio: 'inherit' });
    console.log('✅ Worker built successfully');
    
    console.log('🎉 Build completed! All dependencies bundled.');
    console.log('📦 Generated files are self-contained (except for native modules)');
    
  } catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }
}

build(); 