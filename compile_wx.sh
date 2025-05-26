#!/bin/bash

echo "编译wxWidgets桌面应用..."

# 获取wx-config路径
WX_CONFIG=$(which wx-config)
if [ -z "$WX_CONFIG" ]; then
  echo "错误: 找不到wx-config，请确保wxWidgets已正确安装"
  exit 1
fi

# 使用wx-config获取编译标志，包括进程管理功能
WX_CXXFLAGS=$($WX_CONFIG --cxxflags)
WX_LIBS=$($WX_CONFIG --libs std,net,core,base,adv)

# 创建bin目录
mkdir -p bin

# 编译应用
g++ -std=c++11 src/cpp/wx_client.cpp $WX_CXXFLAGS $WX_LIBS -o bin/wx_client

if [ $? -eq 0 ]; then
  echo "编译成功! 可执行文件在 bin/wx_client"
  echo "运行方法: ./bin/wx_client"
  
  # 确保Node.js服务脚本有执行权限
  chmod +x src/node/server.js
else
  echo "编译失败!"
  exit 1
fi 