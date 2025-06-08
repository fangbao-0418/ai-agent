#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting multi-platform package build...');

// 确保输出目录存在
const outputDir = path.join(__dirname, '..', 'dist3');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✅ Created output directory: ${outputDir}`);
}

// 构建步骤
const steps = [
  {
    name: 'TypeScript compilation',
    command: 'npm run build:tsc',
    description: '编译TypeScript代码'
  },
  {
    name: 'Bundle with NCC',
    command: 'npm run build:tcp',
    description: '使用NCC打包代码'
  }
];

// esbuild 构建步骤 (推荐)
const esbuildSteps = [
  {
    name: 'ESBuild compilation',
    command: 'npm run build',
    description: '使用esbuild编译和打包代码'
  }
];

// Windows 优化构建步骤
const windowsSteps = [
  {
    name: 'ESBuild Windows compilation',
    command: 'npm run build:windows',
    description: '使用esbuild为Windows优化编译和打包代码'
  }
];

// 平台构建配置
const platforms = [
  {
    name: 'macOS (ARM64)',
    command: 'npm run build:mac',
    output: 'index.app',
    description: '构建macOS ARM64版本'
  },
  {
    name: 'Windows (x64)',
    command: 'npm run build:win', 
    output: 'index.exe',
    description: '构建Windows x64版本'
  },
  {
    name: 'Windows (ARM64)',
    command: 'npm run build:win-arm',
    output: 'index-arm.exe', 
    description: '构建Windows ARM64版本'
  }
];

try {
  // 获取要构建的平台
  const targetPlatform = process.argv[2];
  const useEsbuild = process.argv.includes('--esbuild') || process.env.USE_ESBUILD === 'true';
  
  // 选择构建步骤
  let buildSteps = steps; // 默认使用 tsc + ncc
  
  if (useEsbuild) {
    buildSteps = esbuildSteps;
    console.log('📦 Using esbuild for compilation...');
  } else if (targetPlatform && targetPlatform.toLowerCase().includes('win')) {
    buildSteps = windowsSteps;
    console.log('📦 Using Windows-optimized esbuild...');
  }
  
  // 执行构建步骤
  console.log('\n📦 Preparing build...');
  buildSteps.forEach(step => {
    console.log(`🔄 ${step.description}...`);
    execSync(step.command, { stdio: 'inherit', cwd: __dirname + '/..' });
    console.log(`✅ ${step.name} completed`);
  });

  if (targetPlatform) {
    // 构建特定平台
    const platform = platforms.find(p => 
      p.name.toLowerCase().includes(targetPlatform.toLowerCase()) ||
      p.output.includes(targetPlatform.toLowerCase())
    );
    
    if (platform) {
      console.log(`\n🏗️  Building for ${platform.name}...`);
      execSync(platform.command, { stdio: 'inherit', cwd: __dirname + '/..' });
      console.log(`✅ ${platform.name} build completed: dist3/${platform.output}`);
    } else {
      console.error(`❌ Unknown platform: ${targetPlatform}`);
      console.log('Available platforms: mac, win, win-arm');
      process.exit(1);
    }
  } else {
    // 构建所有平台
    console.log('\n🏗️  Building for all platforms...');
    platforms.forEach(platform => {
      console.log(`\n🔄 ${platform.description}...`);
      try {
        execSync(platform.command, { stdio: 'inherit', cwd: __dirname + '/..' });
        console.log(`✅ ${platform.name} completed: dist3/${platform.output}`);
      } catch (error) {
        console.error(`❌ Failed to build ${platform.name}:`, error.message);
      }
    });
  }

  console.log('\n🎉 Package build process completed!');
  console.log('\n📁 Built packages:');
  
  // 列出生成的文件
  try {
    const files = fs.readdirSync(outputDir);
    files.forEach(file => {
      const filePath = path.join(outputDir, file);
      const stats = fs.statSync(filePath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`   📦 ${file} (${sizeInMB} MB)`);
    });
  } catch (error) {
    console.log('   (No files found in output directory)');
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
} 