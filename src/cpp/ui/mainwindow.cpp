#include "mainwindow.h"
#include "ui_mainwindow.h"
#include <QMessageBox>
#include <QDateTime>

MainWindow::MainWindow(QWidget *parent)
    : QMainWindow(parent)
    , ui(new Ui::MainWindow)
    , m_isConnected(false)
{
    ui->setupUi(this);
    
    // 创建TCP客户端
    m_tcpClient = new TcpClient(this);
    
    // 连接信号与槽
    connect(m_tcpClient, &TcpClient::connected, this, &MainWindow::onTcpConnected);
    connect(m_tcpClient, &TcpClient::disconnected, this, &MainWindow::onTcpDisconnected);
    connect(m_tcpClient, &TcpClient::error, this, &MainWindow::onTcpError);
    connect(m_tcpClient, &TcpClient::logMessage, this, &MainWindow::onTcpLogMessage);
    
    // 初始化UI状态
    updateConnectionStatus();
    
    // 连接打开浏览器按钮
    connect(ui->btnOpenBrowser, &QPushButton::clicked, this, &MainWindow::on_btnOpenBrowser_clicked);
}

MainWindow::~MainWindow()
{
    delete ui;
}

void MainWindow::on_btnConnect_clicked()
{
    if (!m_isConnected) {
        // 连接到服务器
        appendToLog("正在连接到服务器...");
        if (m_tcpClient->connectToServer(SERVER_HOST, SERVER_PORT)) {
            // 连接成功由信号处理
        } else {
            onTcpError("连接服务器失败");
        }
    } else {
        // 断开连接
        m_tcpClient->disconnectFromServer();
    }
}

void MainWindow::on_btnSendMessage_clicked()
{
    if (!m_isConnected) {
        QMessageBox::warning(this, "错误", "未连接到服务器");
        return;
    }
    
    QString message = ui->editMessage->text().trimmed();
    if (message.isEmpty()) {
        QMessageBox::warning(this, "错误", "请输入消息内容");
        return;
    }
    
    // 发送消息并设置回调
    m_tcpClient->sendMessage(message, [this](const QJsonObject &response) {
        if (response.contains("content")) {
            QString result = response["content"].toString();
            ui->labelMessageResult->setText("响应: " + result);
        } else {
            ui->labelMessageResult->setText("响应格式错误");
        }
    });
}

void MainWindow::on_btnCalculate_clicked()
{
    if (!m_isConnected) {
        QMessageBox::warning(this, "错误", "未连接到服务器");
        return;
    }
    
    int a = ui->spinNum1->value();
    int b = ui->spinNum2->value();
    
    // 发送计算请求并设置回调
    m_tcpClient->sendCalculateRequest(a, b, [this, a, b](const QJsonObject &response) {
        if (response.contains("result")) {
            int result = response["result"].toInt();
            ui->labelCalculateResult->setText(QString("计算结果: %1 + %2 = %3").arg(a).arg(b).arg(result));
        } else {
            ui->labelCalculateResult->setText("响应格式错误");
        }
    });
}

void MainWindow::onTcpConnected()
{
    m_isConnected = true;
    updateConnectionStatus();
    appendToLog("已连接到服务器");
}

void MainWindow::onTcpDisconnected()
{
    m_isConnected = false;
    updateConnectionStatus();
    appendToLog("已断开与服务器的连接");
}

void MainWindow::onTcpError(const QString &errorMsg)
{
    updateConnectionStatus();
    appendToLog("错误: " + errorMsg);
    QMessageBox::critical(this, "连接错误", errorMsg);
}

void MainWindow::onTcpLogMessage(const QString &message)
{
    appendToLog(message);
}

void MainWindow::updateConnectionStatus()
{
    if (m_isConnected) {
        ui->labelStatus->setText("已连接");
        ui->btnConnect->setText("断开连接");
    } else {
        ui->labelStatus->setText("未连接");
        ui->btnConnect->setText("连接服务器");
        
        // 清空结果显示
        ui->labelMessageResult->clear();
        ui->labelCalculateResult->clear();
    }
}

void MainWindow::appendToLog(const QString &message)
{
    QString timestamp = QDateTime::currentDateTime().toString("yyyy-MM-dd hh:mm:ss");
    ui->textLog->append(QString("[%1] %2").arg(timestamp).arg(message));
}

void MainWindow::on_btnOpenBrowser_clicked()
{
    if (!m_isConnected) {
        appendToLog("请先连接到服务器");
        return;
    }
    
    // 发送打开浏览器请求
    QJsonObject request;
    request["type"] = "openBrowser";
    request["url"] = "https://www.baidu.com";  // 可以修改为任意URL
    
    m_tcpClient->sendRequest(request, [this](const QJsonObject &response) {
        if (response.contains("status")) {
            appendToLog("浏览器打开状态: " + response["status"].toString());
        }
    });
}