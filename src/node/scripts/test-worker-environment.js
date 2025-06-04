#!/usr/bin/env node

/**
 * 测试WorkerManager在不同环境下的工作情况
 */

const path = require('path');
const fs = require('fs');

// 设置不同的环境变量进行测试
const environments = ['development', 'production', 'test'];

async function testEnvironment(env) {
  console.log(`\n🧪 Testing environment: ${env}`);
  console.log('=' .repeat(50));
  
  // 设置环境变量
  process.env.NODE_ENV = env;
  process.env.RSBUILD_ENV = env;
  
  try {
    // 使用require导入编译后的CommonJS模块
    const WorkerManager = require('../dist/libs/parse-profile/WorkerManager.js').default;
    const environmentManager = require('../dist/config/environment.js').default;
    
    const workerManager = WorkerManager.getInstance();
    const envInfo = workerManager.getEnvironmentInfo();
    
    console.log('📊 Environment Info:');
    console.log(`  - Environment: ${envInfo.environment}`);
    console.log(`  - Config:`, envInfo.config);
    console.log(`  - Worker Path: ${envInfo.workerPath || 'Not initialized'}`);
    
    // 测试worker文件验证
    console.log('\n🔧 Testing worker file validation...');
    try {
      const isValid = workerManager.validateWorkerFile();
      if (isValid) {
        console.log('✅ Worker file validation passed');
        
        // 获取实际的worker路径信息
        const envInfoAfterValidation = workerManager.getEnvironmentInfo();
        console.log(`📁 Worker file located at: ${envInfoAfterValidation.workerPath}`);
        
        // 检查文件是否真实存在
        if (envInfoAfterValidation.workerPath && fs.existsSync(envInfoAfterValidation.workerPath)) {
          console.log('✅ Worker file exists on filesystem');
          console.log(`📄 File extension: ${path.extname(envInfoAfterValidation.workerPath)}`);
        } else {
          console.log('❌ Worker file path set but file does not exist');
        }
        
      } else {
        console.log('❌ Worker file validation failed');
      }
      
      console.log(`⏱️  Timeout setting: ${environmentManager.getWorkerTimeout()}ms`);
      console.log(`🔍 Debug logs enabled: ${environmentManager.shouldEnableDebugLogs()}`);
      
    } catch (error) {
      console.error('❌ Worker validation failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Failed to test environment:', error.message);
  }
}

async function main() {
  console.log('🚀 Worker Environment Test Suite');
  console.log('Testing WorkerManager behavior across different environments\n');
  
  // 检查构建文件是否存在
  const distPath = path.join(__dirname, '../dist');
  if (!fs.existsSync(distPath)) {
    console.error('❌ Dist directory not found. Please run "npm run build" first.');
    process.exit(1);
  }
  
  // 检查worker源文件是否存在
  const workerTsPath = path.join(__dirname, '../src/libs/parse-profile/worker.ts');
  const workerJsPath = path.join(__dirname, '../src/libs/parse-profile/worker.js');
  
  console.log('📋 Pre-test file check:');
  console.log(`  - Worker TS source: ${fs.existsSync(workerTsPath) ? '✅' : '❌'} ${workerTsPath}`);
  console.log(`  - Worker JS source: ${fs.existsSync(workerJsPath) ? '✅' : '❌'} ${workerJsPath}`);
  
  const distWorkerPath = path.join(__dirname, '../dist/libs/parse-profile/worker.js');
  console.log(`  - Worker in dist: ${fs.existsSync(distWorkerPath) ? '✅' : '❌'} ${distWorkerPath}`);
  
  for (const env of environments) {
    await testEnvironment(env);
  }
  
  console.log('\n🎉 Environment testing completed!');
  console.log('\nRecommended workflow:');
  console.log('  📝 Development: NODE_ENV=development npm run dev');
  console.log('  🔨 Build: npm run build');
  console.log('  🚀 Production: NODE_ENV=production npm start');
  console.log('  🧪 Test: NODE_ENV=test npm test');
  
  console.log('\nWorker file resolution strategy:');
  console.log('  - Development: Use compiled files in dist (fallback to source)');
  console.log('  - Production: Use compiled files in dist directory');
  console.log('  - Test: Use available files with fallback');
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
} 