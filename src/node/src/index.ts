import WebServer from './web-server';
// import TcpServer from './tcp-server';
import * as fs from 'fs';
import * as path from 'path';

import globalData from './global';
const minimist = require('minimist');

const args = minimist(process.argv.slice(2));

const appDir = args['node-dir'];

function init () {
  // 检查并创建 appDir 目录
  if (appDir) {
    try {
      // 解析为绝对路径
      const absolutePath = path.resolve(appDir);
      // 检查目录是否存在
      if (!fs.existsSync(absolutePath)) {
        console.log(`应用目录 ${absolutePath} 不存在，正在创建...`);
        // 递归创建目录
        fs.mkdirSync(absolutePath, { recursive: true }); 
        console.log(`✓ 应用目录创建成功: ${absolutePath}`);
        console.log(globalData.get('node-dir'), 'globalData.get(node-dir)')
      } else {
        console.log(`✓ 应用目录已存在: ${absolutePath}`);
      }
      globalData.set('node-dir', absolutePath);
    } catch (error) {
      console.error(`创建应用目录失败: ${(error as Error).message}`);
    }
  } else {
    console.log('警告: 未指定应用目录 (--node-dir)');
  }
}

// 初始化应用目录
init();

// TcpServer.start();

const webServer = new WebServer();
webServer.start();



