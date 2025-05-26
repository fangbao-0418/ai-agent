// import { getSystemPromptV1_5 } from "./prompts";
// import * as dotenv from 'dotenv';

// // 加载环境变量
// dotenv.config();

// const net = require('net');
// const { exec } = require('child_process');
// const fs = require('fs');
// const path = require('path');
// const os = require('os');
// const { BrowserbaseOperator } = require('@ui-tars/operator-browserbase');
// const { GUIAgent } = require('@ui-tars/sdk');
// const { logger } = require('./utils/logger');
// import { Stagehand } from "@browserbasehq/stagehand";

// const handleData = (params: any) => {
//   console.log(params);
// }

// async function init2() {
//   try {
//     console.log('🚀 开始初始化 Stagehand...');
    
//     // 检查必要的环境变量
//     const openaiKey = process.env.OPENAI_API_KEY;
//     const browserbaseKey = process.env.BROWSERBASE_API_KEY;
    
//     // if (!openaiKey) {
//     //   throw new Error('OPENAI_API_KEY 环境变量未设置');
//     // }
    
//     console.log('✅ OPENAI_API_KEY 已设置');
    
//     // 根据是否有 BROWSERBASE_API_KEY 选择环境
//     const useLocal = !browserbaseKey;
//     const env = useLocal ? "LOCAL" : "BROWSERBASE";
    
//     console.log(`📦 使用环境: ${env}`);
    
//     if (useLocal) {
//       console.log('⚠️  使用 LOCAL 环境，确保已安装浏览器');
//     } else {
//       console.log('☁️  使用 BROWSERBASE 云环境');
//     }

//     const stagehandConfig: any = {
//       env: env,
//       modelName: "gpt-4o",
//       modelClientOptions: {
//         apiKey: openaiKey,
//       },
//       // 为 Node.js 环境添加特殊配置
//       headless: true,
//       verbose: 1, // 启用详细日志
//     };

//     // 如果使用 BROWSERBASE 环境，添加相关配置
//     if (!useLocal && browserbaseKey) {
//       stagehandConfig.browserbaseOptions = {
//         apiKey: browserbaseKey,
//       };
//     } else if (useLocal) {
//       // LOCAL 环境的特殊配置
//       stagehandConfig.browserOptions = {
//         headless: true,
//         args: [
//           '--no-sandbox',
//           '--disable-setuid-sandbox',
//           '--disable-dev-shm-usage',
//           '--disable-accelerated-2d-canvas',
//           '--no-first-run',
//           '--no-zygote',
//           '--disable-gpu'
//         ]
//       };
//     }

//     console.log('🔧 Stagehand 配置:', JSON.stringify(stagehandConfig, null, 2));

//     const stagehand = new Stagehand(stagehandConfig);
    
//     console.log('⏳ 等待 Stagehand 初始化...');
//     await stagehand.init();

//     // 验证上下文和页面
//     console.log('🔍 检查 Stagehand 组件...');
//     console.log('Context 存在:', !!stagehand.context);
//     console.log('Page 存在:', !!stagehand.page);
    
//     if (!stagehand.context) {
//       throw new Error('Stagehand context 初始化失败');
//     }
    
//     if (!stagehand.page) {
//       throw new Error('Stagehand page 初始化失败');
//     }

//     console.log('✅ Stagehand 初始化成功！');

//     const page = stagehand.page;

//     console.log('🌐 导航到 Google...');
//     await page.goto("https://www.baidu.com", { 
//       waitUntil: 'networkidle',
//       timeout: 30000 
//     });
    
//     console.log('✅ 页面加载成功');

//     console.log('🔍 执行搜索操作...');
//     await page.act("Type in 'Browserbase' into the search bar");

//     console.log('📄 提取搜索结果...');
//     const result = await page.extract("The title of the first search result");
    
//     console.log('🎉 搜索结果:', result);
    
//     // 清理资源
//     console.log('🧹 清理资源...');
//     await stagehand.close();
    
//   } catch (error: unknown) {
//     console.error('❌ Stagehand 操作失败:', error);
    
//     const errorMessage = error instanceof Error ? error.message : String(error);
    
//     if (errorMessage.includes('context')) {
//       console.error('\n🔧 Context 相关问题的解决方案:');
//       console.error('1. 确保设置了 OPENAI_API_KEY 环境变量');
//       console.error('2. 如果使用 BROWSERBASE 环境，设置 BROWSERBASE_API_KEY');
//       console.error('3. 如果使用 LOCAL 环境，确保安装了 Chromium: npx playwright install chromium');
//       console.error('4. 检查系统是否支持无头浏览器模式');
//     }
    
//     if (errorMessage.includes('browser') || errorMessage.includes('launch')) {
//       console.error('\n🌐 浏览器相关问题的解决方案:');
//       console.error('1. 安装浏览器: npx playwright install chromium');
//       console.error('2. 检查系统权限和依赖');
//       console.error('3. 尝试设置 DISPLAY 环境变量 (Linux)');
//     }
    
//     throw error;
//   }
// }

// // 简化的初始化函数，专注于解决上下文问题
// async function initSimple() {
//   console.log('🔧 开始简化初始化测试...');
  
//   try {
//     // 最基础的配置
//     const stagehand = new Stagehand({
//       env: "LOCAL",
//       modelName: "gpt-4o",
//       modelClientOptions: {
//         // apiKey: process.env.OPENAI_API_KEY || "test-key",
//         apiKey: 'xxx',
//       },
//       headless: true,
//       verbose: 2,
//     });

//     console.log('📝 Stagehand 实例已创建');
    
//     await stagehand.init();
//     console.log('✅ 基础初始化成功');
    
//     // 检查关键属性
//     console.log('Context type:', typeof stagehand.context);
//     console.log('Page type:', typeof stagehand.page);
    
//     if (stagehand.context) {
//       console.log('✅ Context 可用');
//     } else {
//       console.log('❌ Context 不可用');
//     }
    
//     if (stagehand.page) {
//       console.log('✅ Page 可用');
      
//       // 测试基本导航
//       await stagehand.page.goto('https://www.example.com');
//       console.log('✅ 导航测试成功');
//     }
    
//     await stagehand.close();
    
//   } catch (error: unknown) {
//     const errorMessage = error instanceof Error ? error.message : String(error);
//     console.error('❌ 简化测试失败:', errorMessage);
    
//     // 提供具体的错误分析
//     if (errorMessage.includes('Could not find browser')) {
//       console.error('🔧 解决方案: 运行 npx playwright install chromium');
//     } else if (errorMessage.includes('context')) {
//       console.error('🔧 这确实是 context 初始化问题');
//     }
//   }
// }

// // 防止进程意外退出
// process.on('uncaughtException', (error) => {
//   console.error('未捕获的异常:', error);
//   // 不要立即退出，记录错误后继续运行
// });

// process.on('unhBrowserbaseOperator({
//       env: 'LOCAL',
//     })};

// async function init() {
//   try {
//     const modelVersion = '1.5'
    
//     console.log('初始化 BrowserbaseOperator...');
//     const operator = DefaultBrowserOperator.getInstance(
//       false,
//       false,
//       // lastStatus === StatusEnum.CALL_USER,
//       false,
//       SearchEngine.GOOGLE,
//       // SEARCH_ENGINE_MAP[
//       //   settings.searchEngineForBrowser || SearchEngineForSettings.GOOGLE
//       // ],
//     );

//     console.log('初始化 GUIAgent...');
//     const guiAgent = new GUIAgent({
//       model: {
//         // baseURL: 'https://ark.cn-beijing.volces.com/api/v3',
//         // apiKey: '759f0447-673d-4f4c-b5dc-02f6f5d456a5',
//         // model: 'UI-TARS-1.5-7B',
//         baseURL: 'http://116.148.216.92:32513/v1',
//         apiKey: 'EMPTY',
//         model: 'UI-TARS-1.5-7B',
//       },
//       systemPrompt: getSystemPromptV1_5('zh', 'normal'),
//       logger,
//       operator: operator,
//       onData: handleData,
//       onError: (params: any) => {
//         console.log('GUIAgent 错误:', params);
//         if (params && params.message && params.message.includes('context')) {
//           conror('检测到 context 相关错误');
//         }
//       },
//       retry: {
//         model: {
//           maxRetries: 3,
//         },
//         screenshot: {
//           maxRetries: 5,
//         },
//         execute: {
//           maxRetries: 1,
//         },
//       },
//       maxLoopCount: 100,
//       loopIntervalInMs: 1000,
//       uiTarsVersion: modelVersion,
//     });
    
//     console.log('运行 GUIAgent...');
//     // 正确处理异步操作
//     await guiAgent.run('帮我打开百度，输入boss直聘，点击搜索');
//     console.log('✅ GUIAgent 执行完成');
    
//   } catch (e: unknown) {
//     console.error('GUIAgent 初始化或运行失败:', e);
//     const errorMessage = e instanceof Error ? e.message : String(e);
//     if (errorMessage.includes('context')) {
//       console.error('这是一个 context 相关的错误');
//     }
//     // 发生错误时不要立即退出，等待一段时间后重试
//     console.log('⏰ 等待 5 秒后重试...');
//     setTimeout(() => {
//       console.log('🔄 开始重试...');
//       init().catch(console.error);
//     }, 5000);
//   }
// }

// async function main() {
//   console.log('🎯 开始诊断 Stagehand 上下文问题...');
  
//   // 启动保活机制
//   keepAlive();
  
//   // 检查环境
//   console.log('📋 环境检查:');
//   console.log('- Node.js 版本:', process.version);
//   console.log('- 平台:', process.platform);
//   console.log('- OPENAI_API_KEY:', !!process.env.OPENAI_API_KEY);
//   console.log('- BROWSERBASE_API_KEY:', !!process.env.BROWSERBASE_API_KEY);
  
//   setTimeout(async () => {
//     console.log('\n🔬 开始简化测试...');
//     // await initSimple();
    
//     console.log('\n🚀 开始完整测试...');
//     await init();
//   }, 1000);
// }

// main().catch((error) => {
//   console.error('主函数执行失败:', error);
//   // 即使主函数失败也不要退出进程
// });

