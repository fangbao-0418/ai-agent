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

# 源文件列表
set(SOURCES
    main.cpp
    ui/mainwindow.cpp
    ui/mainwindow.h
    ui/mainwindow.ui
    tcpclient.cpp
    tcpclient.h
    EmbeddedNodeRunner.cpp
    EmbeddedNodeRunner.h
)

# 资源文件
set(RESOURCES
    resources.qrc
)

# 添加可执行文件
add_executable(CppNodeApp ${SOURCES} ${RESOURCES})

# 在Windows上显示控制台窗口（用于显示Node.js输出）
if(WIN32)
    # 在Windows上创建控制台窗口
    set_target_properties(CppNodeApp PROPERTIES
        WIN32_EXECUTABLE FALSE  # 这将创建控制台应用而不是WIN32应用
    )
    # 或者使用这个方式（推荐）
    target_compile_definitions(CppNodeApp PRIVATE 
        WIN32_CONSOLE_APP=1
    )
endif()

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

# 打包相关的自定义目标
add_custom_target(prepare_embedded_files
    COMMAND ${CMAKE_COMMAND} -E echo "Preparing embedded files..."
    # 确保dist2目录存在并包含最新的Node.js代码
    COMMAND ${CMAKE_COMMAND} -E make_directory ${CMAKE_SOURCE_DIR}/../dist2
    # 可以在这里添加复制Node.js二进制文件的命令
    WORKING_DIRECTORY ${CMAKE_SOURCE_DIR}
    COMMENT "准备嵌入式文件..."
)

# 添加依赖关系
add_dependencies(CppNodeApp prepare_embedded_files) 