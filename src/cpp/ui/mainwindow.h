#ifndef MAINWINDOW_H
#define MAINWINDOW_H

#include <QMainWindow>
#include "../tcpclient.h"

namespace Ui {
class MainWindow;
}

class MainWindow : public QMainWindow
{
    Q_OBJECT

public:
    explicit MainWindow(QWidget *parent = nullptr);
    ~MainWindow();

private slots:
    void on_btnConnect_clicked();
    void on_btnSendMessage_clicked();
    void on_btnCalculate_clicked();

    void onTcpConnected();
    void onTcpDisconnected();
    void onTcpError(const QString &errorMsg);
    void onTcpLogMessage(const QString &message);

private:
    void updateConnectionStatus();
    void appendToLog(const QString &message);

    Ui::MainWindow *ui;
    TcpClient *m_tcpClient;
    bool m_isConnected;

    // 服务器地址和端口
    const QString SERVER_HOST = "localhost";
    const quint16 SERVER_PORT = 8888;
};

#endif // MAINWINDOW_H 