cmake_minimum_required(VERSION 3.10)
project(CppNodeApp VERSION 1.0)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# 设置Qt自动查找
set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

# 查找Qt包 - 先尝试Qt5
find_package(Qt5 COMPONENTS Core Widgets Network QUIET)
if (NOT Qt5_FOUND)
    message(STATUS "Qt5没有找到，尝试查找Qt6...")
    find_package(Qt6 COMPONENTS Core Widgets Network QUIET)
    if (NOT Qt6_FOUND)
        message(FATAL_ERROR "无法找到Qt5或Qt6。请确保Qt已正确安装并设置环境变量。")
    endif()
endif()

# 添加可执行文件
add_executable(CppNodeApp
    main.cpp
    ui/mainwindow.cpp
    ui/mainwindow.h
    ui/mainwindow.ui
    tcpclient.cpp
    tcpclient.h
)

# 链接Qt库
target_link_libraries(CppNodeApp PRIVATE
    Qt::Core
    Qt::Widgets
    Qt::Network
)

# 安装规则
install(TARGETS CppNodeApp
    RUNTIME DESTINATION bin
) 