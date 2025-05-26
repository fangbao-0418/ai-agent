#!/bin/bash

# Stagehand 环境设置脚本
# 专门解决 @browserbasehq/stagehand 在 Node.js 环境中的上下文问题

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Stagehand 环境设置 =====${NC}"

# 1. 检查 Node.js 版本
echo -e "${YELLOW}1. 检查 Node.js 版本...${NC}"
NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo -e "${RED}错误: Node.js 版本过低 (需要 v16+)${NC}"
    echo -e "${YELLOW}当前版本: $(node --version)${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js 版本: $(node --version)${NC}"

# 2. 安装 Playwright 浏览器
echo -e "${YELLOW}2. 安装 Playwright 浏览器...${NC}"
npx playwright install chromium --force || {
    echo -e "${RED}Playwright 安装失败，尝试备选方案...${NC}"
    npm install -g playwright
    npx playwright install chromium
}
echo -e "${GREEN}✅ Playwright 浏览器已安装${NC}"

# 3. 检查系统依赖
echo -e "${YELLOW}3. 检查系统依赖...${NC}"
case "$(uname -s)" in
    Darwin*)
        echo -e "${GREEN}✅ macOS 系统，依赖检查完成${NC}"
        ;;
    Linux*)
        echo -e "${BLUE}检查 Linux 依赖...${NC}"
        # 检查常见的缺失依赖
        DEPS_MISSING=false
        
        # 检查 X11 库
        if ! ldconfig -p | grep -q libX11; then
            echo -e "${YELLOW}缺少 X11 库，尝试安装...${NC}"
            sudo apt-get update && sudo apt-get install -y libx11-6 || DEPS_MISSING=true
        fi
        
        # 检查其他常见依赖
        if ! ldconfig -p | grep -q libgconf; then
            echo -e "${YELLOW}安装额外的浏览器依赖...${NC}"
            sudo apt-get install -y libgconf-2-4 libnss3 libxss1 libasound2 || DEPS_MISSING=true
        fi
        
        if [ "$DEPS_MISSING" = true ]; then
            echo -e "${YELLOW}⚠️  部分依赖安装失败，但可能不影响无头模式${NC}"
        else
            echo -e "${GREEN}✅ Linux 依赖检查完成${NC}"
        fi
        ;;
    *)
        echo -e "${YELLOW}⚠️  未知系统，跳过依赖检查${NC}"
        ;;
esac

# 4. 设置环境变量
echo -e "${YELLOW}4. 环境变量配置...${NC}"
if [ -z "$OPENAI_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  OPENAI_API_KEY 未设置${NC}"
    echo -e "请运行: ${BLUE}export OPENAI_API_KEY='your_key_here'${NC}"
else
    echo -e "${GREEN}✅ OPENAI_API_KEY 已设置${NC}"
fi

if [ -z "$BROWSERBASE_API_KEY" ]; then
    echo -e "${YELLOW}⚠️  BROWSERBASE_API_KEY 未设置 (可选)${NC}"
    echo -e "如需使用云环境，请运行: ${BLUE}export BROWSERBASE_API_KEY='your_key_here'${NC}"
else
    echo -e "${GREEN}✅ BROWSERBASE_API_KEY 已设置${NC}"
fi

# 5. 创建测试脚本
echo -e "${YELLOW}5. 创建 Stagehand 测试脚本...${NC}"
cat > test-stagehand.js << 'EOF'
const { Stagehand } = require('@browserbasehq/stagehand');
require('dotenv').config();

async function testStagehand() {
    console.log('🧪 开始 Stagehand 上下文测试...');
    
    try {
        console.log('📝 创建 Stagehand 实例...');
        const stagehand = new Stagehand({
            env: "LOCAL",
            modelName: "gpt-4o",
            modelClientOptions: {
                apiKey: process.env.OPENAI_API_KEY || "test-key",
            },
            headless: true,
            verbose: 1,
            browserOptions: {
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu'
                ]
            }
        });

        console.log('⏳ 初始化 Stagehand...');
        await stagehand.init();

        console.log('🔍 检查组件:');
        console.log('  - Context:', !!stagehand.context);
        console.log('  - Page:', !!stagehand.page);
        console.log('  - Browser:', !!stagehand.browser);

        if (!stagehand.context) {
            throw new Error('❌ Context 未初始化');
        }

        if (!stagehand.page) {
            throw new Error('❌ Page 未初始化');
        }

        console.log('✅ 所有组件初始化成功！');

        // 测试基本导航
        console.log('🌐 测试页面导航...');
        await stagehand.page.goto('https://www.example.com', { timeout: 10000 });
        console.log('✅ 导航测试成功');

        // 清理
        await stagehand.close();
        console.log('🧹 资源清理完成');
        
        console.log('\n🎉 Stagehand 上下文测试通过！');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        
        if (error.message.includes('Could not find browser')) {
            console.error('\n🔧 解决方案:');
            console.error('  运行: npx playwright install chromium');
        } else if (error.message.includes('context')) {
            console.error('\n🔧 这是 context 初始化问题');
            console.error('  检查环境变量和浏览器安装');
        }
        
        process.exit(1);
    }
}

testStagehand();
EOF

echo -e "${GREEN}✅ 测试脚本已创建: test-stagehand.js${NC}"

# 6. 运行测试
echo -e "${YELLOW}6. 运行 Stagehand 测试...${NC}"
if node test-stagehand.js; then
    echo -e "${GREEN}🎉 Stagehand 环境设置成功！${NC}"
else
    echo -e "${RED}❌ 测试失败，请检查错误信息${NC}"
    exit 1
fi

# 7. 清理测试文件
rm -f test-stagehand.js

echo -e "${BLUE}===== 设置完成 =====${NC}"
echo -e "${GREEN}现在可以正常使用 @browserbasehq/stagehand 了${NC}"
echo -e "${YELLOW}如果仍有问题，请检查：${NC}"
echo -e "  1. 环境变量是否正确设置"
echo -e "  2. 网络连接是否正常"
echo -e "  3. 系统权限是否足够" 