#!/bin/bash

# 输出彩色文本
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== C++ & Node.js TypeScript 项目编译脚本 =====${NC}"

# 检查Node.js和npm
echo -e "${YELLOW}检查Node.js环境...${NC}"
if ! command -v node &> /dev/null; then
  echo -e "${RED}错误: Node.js未安装!${NC}"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo -e "${RED}错误: npm未安装!${NC}"
  exit 1
fi

# 安装依赖
echo -e "${YELLOW}安装Node.js依赖...${NC}"
npm install || { echo -e "${RED}安装依赖失败!${NC}"; exit 1; }

# 编译TypeScript
echo -e "${YELLOW}编译TypeScript代码...${NC}"
npm run build || { echo -e "${RED}TypeScript编译失败!${NC}"; exit 1; }

# 检测操作系统
echo -e "${YELLOW}检测系统类型...${NC}"
case "$(uname -s)" in
  Darwin*)    
    echo -e "${GREEN}macOS系统${NC}"
    PLATFORM="macos"
    ;;
  Linux*)     
    echo -e "${GREEN}Linux系统${NC}"
    PLATFORM="linux"
    ;;
  CYGWIN*|MINGW*|MSYS*) 
    echo -e "${GREEN}Windows系统${NC}"
    PLATFORM="windows"
    ;;
  *)
    echo -e "${RED}未知系统类型: $(uname -s)${NC}"
    PLATFORM="unknown"
    ;;
esac

# 编译C++代码
echo -e "${YELLOW}编译C++代码...${NC}"

if [ "$PLATFORM" = "windows" ]; then
  echo -e "${YELLOW}Windows平台编译提示:${NC}"
  echo -e "请使用Visual Studio或者MinGW编译src/cpp/wx_client.cpp"
  echo -e "确保已正确安装配置wxWidgets库"
  echo -e "编译时请添加以下预处理器定义: __WXMSW__"
  echo -e "并链接kernel32.lib库"
elif [ "$PLATFORM" = "unknown" ]; then
  echo -e "${RED}无法为未知平台提供编译指令${NC}"
else
  # macOS或Linux
  if ! command -v wx-config &> /dev/null; then
    echo -e "${RED}错误: wxWidgets未安装或未正确配置!${NC}"
    if [ "$PLATFORM" = "macos" ]; then
      echo -e "${YELLOW}提示: 可以使用Homebrew安装wxWidgets:${NC}"
      echo -e "brew install wxwidgets"
    elif [ "$PLATFORM" = "linux" ]; then
      echo -e "${YELLOW}提示: 可以使用包管理器安装wxWidgets:${NC}"
      echo -e "例如: sudo apt install libwxgtk3.0-dev (Ubuntu/Debian)"
      echo -e "或: sudo dnf install wxGTK3-devel (Fedora)"
    fi
    exit 1
  fi
  
  echo -e "${YELLOW}编译wx_client...${NC}"
  
  # 添加C++11/14支持和必要的编译标志
  CXXFLAGS="-std=c++11 -O2"
  
  g++ $CXXFLAGS -o cppnode src/cpp/wx_client.cpp `wx-config --cxxflags --libs` || { 
    echo -e "${RED}编译C++代码失败!${NC}"
    echo -e "${YELLOW}尝试使用C++14标准重新编译...${NC}"
    g++ -std=c++14 -O2 -o cppnode src/cpp/wx_client.cpp `wx-config --cxxflags --libs` || {
      echo -e "${RED}编译仍然失败!${NC}"
      echo -e "${YELLOW}错误信息可能包含有用的调试信息${NC}"
      exit 1
    }
  }
  echo -e "${GREEN}C++应用编译成功!${NC}"
fi

echo -e "${GREEN}编译完成!${NC}"
if [ "$PLATFORM" = "macos" ] || [ "$PLATFORM" = "linux" ]; then
  echo -e "${YELLOW}运行应用:${NC} ./cppnode"
  echo -e "${BLUE}注意: 新版本包含Node.js进程守护功能${NC}"
  echo -e "- 启动应用后，点击'启动守护'按钮"
  echo -e "- 守护进程将自动监控和重启Node.js服务"
  echo -e "- 最大自动重启次数: 5次"
  echo -e "- 检查间隔: 5秒"
fi 