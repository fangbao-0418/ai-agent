#include <iostream>
#include <string>
#include <cstring>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>

// 将字符串发送到服务器
bool sendMessage(int sockfd, const std::string& message) {
    if (send(sockfd, message.c_str(), message.length(), 0) < 0) {
        std::cerr << "发送失败" << std::endl;
        return false;
    }
    return true;
}

// 从服务器接收响应
std::string receiveResponse(int sockfd) {
    char buffer[4096] = {0};
    int bytesReceived = recv(sockfd, buffer, 4096, 0);
    if (bytesReceived < 0) {
        std::cerr << "接收失败" << std::endl;
        return "";
    }
    return std::string(buffer, bytesReceived);
}

int main() {
    // 创建socket
    int sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd < 0) {
        std::cerr << "Socket创建失败" << std::endl;
        return 1;
    }

    // 设置服务器地址
    struct sockaddr_in serverAddr;
    memset(&serverAddr, 0, sizeof(serverAddr));
    serverAddr.sin_family = AF_INET;
    serverAddr.sin_port = htons(8888);  // 服务器端口
    
    // 将IP地址从字符串转换为网络地址
    if (inet_pton(AF_INET, "127.0.0.1", &serverAddr.sin_addr) <= 0) {
        std::cerr << "无效的地址" << std::endl;
        close(sockfd);
        return 1;
    }
    
    // 连接到服务器
    std::cout << "正在连接到服务器..." << std::endl;
    if (connect(sockfd, (struct sockaddr*)&serverAddr, sizeof(serverAddr)) < 0) {
        std::cerr << "连接失败，请确保Node.js服务已启动" << std::endl;
        close(sockfd);
        return 1;
    }
    
    std::cout << "连接成功！" << std::endl;
    
    while (true) {
        std::cout << "\n====== C++与Node.js通信测试 ======" << std::endl;
        std::cout << "1. 发送文本消息" << std::endl;
        std::cout << "2. 发送计算请求" << std::endl;
        std::cout << "0. 退出" << std::endl;
        std::cout << "请选择操作: ";
        
        int choice;
        std::cin >> choice;
        std::cin.ignore(); // 清除输入缓冲区
        
        if (choice == 0) {
            break;
        } else if (choice == 1) {
            // 发送文本消息
            std::string message;
            std::cout << "请输入要发送的消息: ";
            std::getline(std::cin, message);
            
            std::string jsonRequest = "{\"type\":\"message\",\"content\":\"" + message + "\",\"requestId\":\"123\"}";
            std::cout << "发送请求: " << jsonRequest << std::endl;
            
            if (!sendMessage(sockfd, jsonRequest)) {
                break;
            }
            
            std::string response = receiveResponse(sockfd);
            std::cout << "收到响应: " << response << std::endl;
            
        } else if (choice == 2) {
            // 发送计算请求
            int a, b;
            std::cout << "请输入第一个数字: ";
            std::cin >> a;
            std::cout << "请输入第二个数字: ";
            std::cin >> b;
            std::cin.ignore(); // 清除输入缓冲区
            
            std::string jsonRequest = "{\"type\":\"calculate\",\"a\":" + std::to_string(a) 
                                   + ",\"b\":" + std::to_string(b) + ",\"requestId\":\"456\"}";
            std::cout << "发送请求: " << jsonRequest << std::endl;
            
            if (!sendMessage(sockfd, jsonRequest)) {
                break;
            }
            
            std::string response = receiveResponse(sockfd);
            std::cout << "收到响应: " << response << std::endl;
            
        } else {
            std::cout << "无效的选择!" << std::endl;
        }
    }
    
    // 关闭socket
    close(sockfd);
    std::cout << "连接已关闭" << std::endl;
    
    return 0;
} 