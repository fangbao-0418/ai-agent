# Browser Use - AI 代理控制系统

这是一个使用 React + rsbuild + Socket.io 构建的 Browser Use AI 代理控制界面，可以通过 Web 界面控制 AI 代理执行浏览器操作。

## 🏗️ 项目结构

```
src/
├── client/                 # React 前端应用 (rsbuild)
│   ├── src/
│   │   ├── App.tsx        # 主应用组件
│   │   ├── main.tsx       # 应用入口
│   │   └── services/
│   │       └── socket.ts  # Socket 客户端服务
│   ├── public/
│   │   └── index.html     # HTML 模板
│   ├── package.json       # 前端依赖
│   └── rsbuild.config.ts  # rsbuild 配置
│
├── node/                   # Node.js 后端服务
│   ├── server.ts          # Socket 服务器
│   ├── agent.ts           # AI 代理实现
│   ├── package.json       # 后端依赖
│   └── prompts.ts         # AI 提示词
│
└── cpp/                    # C++ 客户端 (可选)
```

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装前端依赖
cd src/client
npm install

# 安装后端依赖  
cd ../node
npm install
```

### 2. 启动开发环境

**启动后端服务器：**
```bash
cd src/node
npm run dev
# 或直接运行代理
npm run agent
```

**启动前端开发服务器：**
```bash
cd src/client
npm run dev
```

### 3. 访问应用

- 前端界面：http://localhost:3000
- 后端 API：http://localhost:8080
- Socket 连接：ws://localhost:8080

## 🎯 功能特性

### 前端功能
- ✅ 现代化的 React + TypeScript 界面
- ✅ 使用 Ant Design 组件库
- ✅ 实时 Socket.io 通信
- ✅ 代理状态监控
- ✅ 消息历史记录
- ✅ 快速指令模板
- ✅ 自动模式切换
- ✅ 响应式设计

### 后端功能
- ✅ Express + Socket.io 服务器
- ✅ AI 代理集成 (UI-TARS)
- ✅ 浏览器操作控制
- ✅ 实时状态广播
- ✅ 进度追踪
- ✅ 错误处理和重试

### 代理功能
- ✅ 自然语言指令理解
- ✅ 浏览器自动化操作
- ✅ 搜索引擎交互
- ✅ 页面元素识别和操作
- ✅ 多步骤任务执行

## 🔧 配置

### 环境变量 (.env)
```bash
# AI 模型配置
OPENAI_API_KEY=your_api_key
BROWSERBASE_API_KEY=your_browserbase_key

# 服务器配置
NODE_PORT=8080
CLIENT_PORT=3000
```

### rsbuild 配置
客户端使用 rsbuild 作为构建工具，支持：
- ⚡ 快速开发构建
- 🔥 热更新
- 📦 模块化打包
- 🎯 TypeScript 支持

## 📝 使用示例

### 基本指令
- "打开百度搜索"
- "帮我搜索最新的AI新闻"
- "打开GitHub，搜索React项目"
- "在淘宝上搜索笔记本电脑"

### 复杂任务
- "帮我在Boss直聘上搜索前端工程师的职位，并筛选出薪资15k以上的"
- "打开知乎，搜索人工智能相关话题，并总结前3个热门回答"

## 🛠️ 开发

### 启动开发模式
```bash
# 同时启动前后端
npm run dev

# 单独启动
npm run dev:client  # 前端
npm run dev:server  # 后端
```

### 构建生产版本
```bash
# 构建前端
cd src/client && npm run build

# 构建后端
cd src/node && npm run build
- C++桌面应用程序（使用wxWidgets）
- Node.js TypeScript服务
- 通过TCP套接字进行通信
- 简单的消息传递功能
- 远程计算功能示例
- 自动启动和管理Node.js服务
- **Node.js进程守护功能**（自动重启、监控）
- **Stagehand 浏览器自动化支持**

## 技术栈

- C++
- wxWidgets
- Node.js
- TypeScript
- TCP套接字通信
- @browserbasehq/stagehand (浏览器自动化)
- @ui-tars/operator-browserbase (GUI操作)

## 环境要求

- Node.js (v16.0.0 或更高) ⚠️ **重要：Stagehand 需要 Node.js v16+**
- C++编译器 (gcc, clang, MSVC)
- wxWidgets库 (3.1.5 或更高)
- TypeScript (v4.5.0 或更高)
- Chromium/Chrome 浏览器 (用于 Stagehand)

## 安装

1. 克隆仓库:
   ```bash
   git clone https://your-repository-url/cppnode.git
   cd cppnode
   ```

2. 安装Node.js依赖:
   ```bash
   npm install
   ```
   或
   ```bash
   yarn
   ```

3. **设置 Stagehand 环境** (重要):
   ```bash
   # 设置环境变量
   export OPENAI_API_KEY="your_openai_api_key"
   # 可选：如果使用 BROWSERBASE 云环境
   export BROWSERBASE_API_KEY="your_browserbase_api_key"
   
   # 运行 Stagehand 环境设置脚本
   chmod +x setup-stagehand.sh
   ./setup-stagehand.sh
   ```

4. 编译TypeScript代码:
   ```bash
   npm run build
   ```

5. 编译C++客户端:
   ```bash
   chmod +x compile.sh
   ./compile.sh
   ```

## Stagehand 上下文问题解决

如果遇到 `context is undefined` 错误，请按照以下步骤：

### 快速修复

```bash
# 1. 安装 Playwright 浏览器
npx playwright install chromium

# 2. 设置环境变量
export OPENAI_API_KEY="your_api_key_here"

# 3. 运行环境设置脚本
./setup-stagehand.sh
```

### 详细排查

1. **检查 Node.js 版本**:
   ```bash
   node --version  # 应该是 v16.0.0 或更高
   ```

2. **验证环境变量**:
   ```bash
   echo $OPENAI_API_KEY  # 应该显示您的 API 密钥
   ```

3. **测试 Stagehand**:
   ```bash
   npm run dev  # 运行开发服务器
   # 或
   node dist/node/agent.js  # 直接运行编译后的代码
   ```

4. **查看详细错误日志**:
   - 检查控制台输出中的具体错误信息
   - 确认是否是浏览器启动失败
   - 验证网络连接是否正常

### 常见问题

| 错误信息 | 原因 | 解决方案 |
|---------|------|----------|
| `context is undefined` | 环境变量未设置或浏览器未安装 | 设置 OPENAI_API_KEY，运行 `npx playwright install chromium` |
| `Could not find browser` | Playwright 浏览器未安装 | `npx playwright install chromium` |
| `Failed to launch browser` | 系统权限或依赖问题 | 检查系统依赖，在 Linux 上安装 X11 库 |
| `API key not found` | API 密钥无效 | 验证 OPENAI_API_KEY 是否正确 |

## 使用方法

1. 启动应用:
   ```bash
   ./cppnode
   ```

2. 在GUI中操作:
   - 点击"启动守护"按钮启动Node.js进程守护
   - 点击"连接服务器"建立TCP连接
   - 发送消息或执行计算

3. 测试 Stagehand 功能:
   ```bash
   # 直接运行 agent 测试
   npm run build && node dist/node/agent.js
   ```

## 开发

### TypeScript 开发

- 修改代码后重新编译:
  ```bash
  npm run build
  ```

- 开发时使用监视模式:
  ```bash
  npm run watch
  ```

- 直接运行TypeScript:
  ```bash
  npm run dev
  ```

### C++ 开发

- 重新编译C++应用:
  ```bash
  ./compile.sh
  ```

### 调试 Stagehand

启用详细日志:
```typescript
const stagehand = new Stagehand({
  env: "LOCAL",
  verbose: 2, // 最详细的日志
  // ... 其他配置
});
```

## 项目结构

```
/
├── dist/                    # TypeScript编译输出
├── src/
│   ├── cpp/                 # C++客户端代码
│   │   └── wx_client.cpp    # wxWidgets客户端(含守护进程)
│   └── node/                # Node.js服务代码
│       ├── server.ts        # TypeScript服务器
│       ├── agent.ts         # Stagehand 浏览器自动化
│       └── utils/           # 工具函数
├── setup-stagehand.sh       # Stagehand环境设置脚本
├── compile.sh               # 编译脚本
├── tsconfig.json            # TypeScript配置
├── package.json             # 项目依赖
├── TROUBLESHOOTING.md       # 详细故障排除指南
└── README.md                # 项目文档
```

## 守护进程功能

新版本包含完整的Node.js进程守护功能：

- ✅ **自动监控**: 每5秒检查进程状态
- ✅ **自动重启**: 进程崩溃时自动重启(最多5次)
- ✅ **状态显示**: GUI显示守护进程状态
- ✅ **跨平台**: 支持Windows、macOS、Linux

## 许可证

[项目许可证]

---

## 问题反馈

如果遇到问题，请提供以下信息：

1. 系统版本 (`uname -a`)
2. Node.js版本 (`node --version`)
3. 完整的错误日志
4. 环境变量设置情况

这将帮助快速定位和解决问题。 
[项目许可证] 