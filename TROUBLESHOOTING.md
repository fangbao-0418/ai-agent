# 故障排除指南

## Context Undefined 问题

如果您遇到 `context is undefined` 错误，请按照以下步骤排查：

### 1. 环境变量设置

确保设置了必要的环境变量：

```bash
# 创建 .env 文件
echo "OPENAI_API_KEY=your_actual_api_key_here" > .env
echo "NODE_ENV=development" >> .env
```

或者直接在终端中设置：

```bash
export OPENAI_API_KEY="your_actual_api_key_here"
export NODE_ENV="development"
```

### 2. 检查浏览器依赖

Stagehand 需要浏览器支持，确保系统已安装：

**macOS:**
```bash
# 安装 Chromium 浏览器
brew install --cask chromium
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install chromium-browser

# CentOS/RHEL
sudo yum install chromium
```

**Windows:**
- 下载并安装 Chrome 或 Chromium 浏览器

### 3. 安装 Playwright 浏览器

```bash
npx playwright install chromium
```

### 4. 修复常见问题

#### 问题 1: Stagehand context 未初始化

**原因:** API 密钥缺失或浏览器环境未配置

**解决方案:**
1. 检查 OPENAI_API_KEY 是否正确设置
2. 确保有足够的系统权限启动浏览器
3. 尝试使用 headless: false 模式进行调试

#### 问题 2: BrowserbaseOperator context 问题

**原因:** LOCAL 环境下浏览器配置不正确

**解决方案:**
1. 确保已安装浏览器驱动
2. 检查系统显示设置（如果使用 headless 模式）
3. 尝试切换到 BROWSERBASE 云环境

### 5. 调试步骤

1. **启用详细日志:**
   ```typescript
   const stagehand = new Stagehand({
     env: "LOCAL",
     modelName: "gpt-4o",
     modelClientOptions: {
       apiKey: process.env.OPENAI_API_KEY,
     },
     enableDebugLog: true, // 启用调试日志
   });
   ```

2. **检查 context 初始化:**
   ```typescript
   await stagehand.init();
   console.log('Context:', stagehand.context);
   console.log('Page:', stagehand.page);
   ```

3. **逐步测试:**
   ```typescript
   // 先测试基础功能
   const page = stagehand.page;
   if (page) {
     console.log('Page 对象可用');
     try {
       await page.goto('https://www.google.com');
       console.log('导航成功');
     } catch (error) {
       console.error('导航失败:', error);
     }
   }
   ```

### 6. 替代方案

如果 LOCAL 环境持续出现问题，考虑使用云环境：

```typescript
const stagehand = new Stagehand({
  env: "BROWSERBASE", // 使用云环境
  modelName: "gpt-4o",
  modelClientOptions: {
    apiKey: process.env.OPENAI_API_KEY,
  },
  browserbaseOptions: {
    apiKey: process.env.BROWSERBASE_API_KEY, // 需要额外的 API 密钥
  },
});
```

### 7. 常见错误信息

- **"context is undefined"** → 检查环境变量和浏览器安装
- **"Failed to launch browser"** → 检查浏览器权限和系统配置
- **"API key not found"** → 设置正确的 OPENAI_API_KEY
- **"Page not available"** → 确保 Stagehand 已正确初始化

### 8. 最小工作示例

```typescript
import { Stagehand } from "@browserbasehq/stagehand";
import * as dotenv from 'dotenv';

dotenv.config();

async function test() {
  if (!process.env.OPENAI_API_KEY) {
    console.error('请设置 OPENAI_API_KEY 环境变量');
    return;
  }

  try {
    const stagehand = new Stagehand({
      env: "LOCAL",
      modelName: "gpt-4o",
      modelClientOptions: {
        apiKey: process.env.OPENAI_API_KEY,
      },
    });

    await stagehand.init();
    
    if (!stagehand.context) {
      throw new Error('Context 初始化失败');
    }

    console.log('✅ Context 初始化成功');
    
    const page = stagehand.page;
    await page.goto('https://www.google.com');
    
    console.log('✅ 浏览器导航成功');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

test();
```

如果问题仍然存在，请提供完整的错误日志以便进一步诊断。 