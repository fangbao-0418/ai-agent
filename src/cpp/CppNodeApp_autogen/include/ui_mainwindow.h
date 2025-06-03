/********************************************************************************
** Form generated from reading UI file 'mainwindow.ui'
**
** Created by: Qt User Interface Compiler version 5.15.3
**
** WARNING! All changes made in this file will be lost when recompiling UI file!
********************************************************************************/

#ifndef UI_MAINWINDOW_H
#define UI_MAINWINDOW_H

#include <QtCore/QVariant>
#include <QtWidgets/QAction>
#include <QtWidgets/QApplication>
#include <QtWidgets/QGroupBox>
#include <QtWidgets/QHBoxLayout>
#include <QtWidgets/QLabel>
#include <QtWidgets/QLineEdit>
#include <QtWidgets/QMainWindow>
#include <QtWidgets/QMenu>
#include <QtWidgets/QMenuBar>
#include <QtWidgets/QPushButton>
#include <QtWidgets/QSpacerItem>
#include <QtWidgets/QSpinBox>
#include <QtWidgets/QStatusBar>
#include <QtWidgets/QTextEdit>
#include <QtWidgets/QVBoxLayout>
#include <QtWidgets/QWidget>

QT_BEGIN_NAMESPACE

class Ui_MainWindow
{
public:
    QAction *actionExit;
    QAction *actionAbout;
    QWidget *centralwidget;
    QVBoxLayout *verticalLayout;
    QLabel *lblTitle;
    QGroupBox *groupConnection;
    QHBoxLayout *horizontalLayout;
    QLabel *labelStatus;
    QSpacerItem *horizontalSpacer;
    QPushButton *btnConnect;
    QGroupBox *groupMessage;
    QVBoxLayout *verticalLayout_2;
    QLineEdit *editMessage;
    QHBoxLayout *horizontalLayout_2;
    QPushButton *btnSendMessage;
    QSpacerItem *horizontalSpacer_2;
    QLabel *labelMessageResult;
    QGroupBox *groupCalculate;
    QVBoxLayout *verticalLayout_4;
    QHBoxLayout *horizontalLayout_3;
    QLabel *lblNum1;
    QSpinBox *spinNum1;
    QLabel *lblPlus;
    QLabel *lblNum2;
    QSpinBox *spinNum2;
    QPushButton *btnCalculate;
    QSpacerItem *horizontalSpacer_3;
    QLabel *labelCalculateResult;
    QGroupBox *groupBrowser;
    QHBoxLayout *horizontalLayout_4;
    QPushButton *btnOpenBrowser;
    QSpacerItem *horizontalSpacer_4;
    QGroupBox *groupLog;
    QVBoxLayout *verticalLayout_3;
    QTextEdit *textLog;
    QMenuBar *menubar;
    QMenu *menuFile;
    QMenu *menuHelp;
    QStatusBar *statusbar;

    void setupUi(QMainWindow *MainWindow)
    {
        if (MainWindow->objectName().isEmpty())
            MainWindow->setObjectName(QString::fromUtf8("MainWindow"));
        MainWindow->resize(800, 700);
        actionExit = new QAction(MainWindow);
        actionExit->setObjectName(QString::fromUtf8("actionExit"));
        actionAbout = new QAction(MainWindow);
        actionAbout->setObjectName(QString::fromUtf8("actionAbout"));
        centralwidget = new QWidget(MainWindow);
        centralwidget->setObjectName(QString::fromUtf8("centralwidget"));
        verticalLayout = new QVBoxLayout(centralwidget);
        verticalLayout->setObjectName(QString::fromUtf8("verticalLayout"));
        lblTitle = new QLabel(centralwidget);
        lblTitle->setObjectName(QString::fromUtf8("lblTitle"));
        lblTitle->setAlignment(Qt::AlignCenter);

        verticalLayout->addWidget(lblTitle);

        groupConnection = new QGroupBox(centralwidget);
        groupConnection->setObjectName(QString::fromUtf8("groupConnection"));
        horizontalLayout = new QHBoxLayout(groupConnection);
        horizontalLayout->setObjectName(QString::fromUtf8("horizontalLayout"));
        labelStatus = new QLabel(groupConnection);
        labelStatus->setObjectName(QString::fromUtf8("labelStatus"));

        horizontalLayout->addWidget(labelStatus);

        horizontalSpacer = new QSpacerItem(40, 20, QSizePolicy::Expanding, QSizePolicy::Minimum);

        horizontalLayout->addItem(horizontalSpacer);

        btnConnect = new QPushButton(groupConnection);
        btnConnect->setObjectName(QString::fromUtf8("btnConnect"));

        horizontalLayout->addWidget(btnConnect);


        verticalLayout->addWidget(groupConnection);

        groupMessage = new QGroupBox(centralwidget);
        groupMessage->setObjectName(QString::fromUtf8("groupMessage"));
        verticalLayout_2 = new QVBoxLayout(groupMessage);
        verticalLayout_2->setObjectName(QString::fromUtf8("verticalLayout_2"));
        editMessage = new QLineEdit(groupMessage);
        editMessage->setObjectName(QString::fromUtf8("editMessage"));

        verticalLayout_2->addWidget(editMessage);

        horizontalLayout_2 = new QHBoxLayout();
        horizontalLayout_2->setObjectName(QString::fromUtf8("horizontalLayout_2"));
        btnSendMessage = new QPushButton(groupMessage);
        btnSendMessage->setObjectName(QString::fromUtf8("btnSendMessage"));

        horizontalLayout_2->addWidget(btnSendMessage);

        horizontalSpacer_2 = new QSpacerItem(40, 20, QSizePolicy::Expanding, QSizePolicy::Minimum);

        horizontalLayout_2->addItem(horizontalSpacer_2);


        verticalLayout_2->addLayout(horizontalLayout_2);

        labelMessageResult = new QLabel(groupMessage);
        labelMessageResult->setObjectName(QString::fromUtf8("labelMessageResult"));

        verticalLayout_2->addWidget(labelMessageResult);


        verticalLayout->addWidget(groupMessage);

        groupCalculate = new QGroupBox(centralwidget);
        groupCalculate->setObjectName(QString::fromUtf8("groupCalculate"));
        verticalLayout_4 = new QVBoxLayout(groupCalculate);
        verticalLayout_4->setObjectName(QString::fromUtf8("verticalLayout_4"));
        horizontalLayout_3 = new QHBoxLayout();
        horizontalLayout_3->setObjectName(QString::fromUtf8("horizontalLayout_3"));
        lblNum1 = new QLabel(groupCalculate);
        lblNum1->setObjectName(QString::fromUtf8("lblNum1"));

        horizontalLayout_3->addWidget(lblNum1);

        spinNum1 = new QSpinBox(groupCalculate);
        spinNum1->setObjectName(QString::fromUtf8("spinNum1"));
        spinNum1->setMinimum(-999999);
        spinNum1->setMaximum(999999);
        spinNum1->setValue(10);

        horizontalLayout_3->addWidget(spinNum1);

        lblPlus = new QLabel(groupCalculate);
        lblPlus->setObjectName(QString::fromUtf8("lblPlus"));

        horizontalLayout_3->addWidget(lblPlus);

        lblNum2 = new QLabel(groupCalculate);
        lblNum2->setObjectName(QString::fromUtf8("lblNum2"));

        horizontalLayout_3->addWidget(lblNum2);

        spinNum2 = new QSpinBox(groupCalculate);
        spinNum2->setObjectName(QString::fromUtf8("spinNum2"));
        spinNum2->setMinimum(-999999);
        spinNum2->setMaximum(999999);
        spinNum2->setValue(20);

        horizontalLayout_3->addWidget(spinNum2);

        btnCalculate = new QPushButton(groupCalculate);
        btnCalculate->setObjectName(QString::fromUtf8("btnCalculate"));

        horizontalLayout_3->addWidget(btnCalculate);

        horizontalSpacer_3 = new QSpacerItem(40, 20, QSizePolicy::Expanding, QSizePolicy::Minimum);

        horizontalLayout_3->addItem(horizontalSpacer_3);


        verticalLayout_4->addLayout(horizontalLayout_3);

        labelCalculateResult = new QLabel(groupCalculate);
        labelCalculateResult->setObjectName(QString::fromUtf8("labelCalculateResult"));

        verticalLayout_4->addWidget(labelCalculateResult);


        verticalLayout->addWidget(groupCalculate);

        groupBrowser = new QGroupBox(centralwidget);
        groupBrowser->setObjectName(QString::fromUtf8("groupBrowser"));
        horizontalLayout_4 = new QHBoxLayout(groupBrowser);
        horizontalLayout_4->setObjectName(QString::fromUtf8("horizontalLayout_4"));
        btnOpenBrowser = new QPushButton(groupBrowser);
        btnOpenBrowser->setObjectName(QString::fromUtf8("btnOpenBrowser"));

        horizontalLayout_4->addWidget(btnOpenBrowser);

        horizontalSpacer_4 = new QSpacerItem(40, 20, QSizePolicy::Expanding, QSizePolicy::Minimum);

        horizontalLayout_4->addItem(horizontalSpacer_4);


        verticalLayout->addWidget(groupBrowser);

        groupLog = new QGroupBox(centralwidget);
        groupLog->setObjectName(QString::fromUtf8("groupLog"));
        verticalLayout_3 = new QVBoxLayout(groupLog);
        verticalLayout_3->setObjectName(QString::fromUtf8("verticalLayout_3"));
        textLog = new QTextEdit(groupLog);
        textLog->setObjectName(QString::fromUtf8("textLog"));
        textLog->setReadOnly(true);

        verticalLayout_3->addWidget(textLog);


        verticalLayout->addWidget(groupLog);

        MainWindow->setCentralWidget(centralwidget);
        menubar = new QMenuBar(MainWindow);
        menubar->setObjectName(QString::fromUtf8("menubar"));
        menubar->setGeometry(QRect(0, 0, 800, 22));
        menuFile = new QMenu(menubar);
        menuFile->setObjectName(QString::fromUtf8("menuFile"));
        menuHelp = new QMenu(menubar);
        menuHelp->setObjectName(QString::fromUtf8("menuHelp"));
        MainWindow->setMenuBar(menubar);
        statusbar = new QStatusBar(MainWindow);
        statusbar->setObjectName(QString::fromUtf8("statusbar"));
        MainWindow->setStatusBar(statusbar);

        menubar->addAction(menuFile->menuAction());
        menubar->addAction(menuHelp->menuAction());
        menuFile->addAction(actionExit);
        menuHelp->addAction(actionAbout);

        retranslateUi(MainWindow);

        QMetaObject::connectSlotsByName(MainWindow);
    } // setupUi

    void retranslateUi(QMainWindow *MainWindow)
    {
        MainWindow->setWindowTitle(QCoreApplication::translate("MainWindow", "C++ Node.js Launcher - Browser Use AI", nullptr));
        actionExit->setText(QCoreApplication::translate("MainWindow", "\351\200\200\345\207\272", nullptr));
        actionAbout->setText(QCoreApplication::translate("MainWindow", "\345\205\263\344\272\216", nullptr));
        lblTitle->setText(QCoreApplication::translate("MainWindow", "C++ Node.js Launcher - Browser Use AI", nullptr));
        lblTitle->setStyleSheet(QCoreApplication::translate("MainWindow", "font: bold 16px; color: #2c3e50; padding: 10px;", nullptr));
        groupConnection->setTitle(QCoreApplication::translate("MainWindow", "\350\277\236\346\216\245\347\212\266\346\200\201", nullptr));
        labelStatus->setText(QCoreApplication::translate("MainWindow", "\347\212\266\346\200\201: \346\234\252\350\277\236\346\216\245", nullptr));
        btnConnect->setText(QCoreApplication::translate("MainWindow", "\350\277\236\346\216\245\346\234\215\345\212\241\345\231\250", nullptr));
        groupMessage->setTitle(QCoreApplication::translate("MainWindow", "\346\266\210\346\201\257\345\217\221\351\200\201", nullptr));
        editMessage->setPlaceholderText(QCoreApplication::translate("MainWindow", "\350\257\267\350\276\223\345\205\245\350\246\201\345\217\221\351\200\201\347\232\204\346\266\210\346\201\257...", nullptr));
        btnSendMessage->setText(QCoreApplication::translate("MainWindow", "\345\217\221\351\200\201\346\266\210\346\201\257", nullptr));
        labelMessageResult->setText(QCoreApplication::translate("MainWindow", "\345\223\215\345\272\224\347\273\223\346\236\234\345\260\206\345\234\250\350\277\231\351\207\214\346\230\276\347\244\272", nullptr));
        labelMessageResult->setStyleSheet(QCoreApplication::translate("MainWindow", "color: #27ae60; font-style: italic;", nullptr));
        groupCalculate->setTitle(QCoreApplication::translate("MainWindow", "\350\256\241\347\256\227\346\265\213\350\257\225", nullptr));
        lblNum1->setText(QCoreApplication::translate("MainWindow", "\346\225\260\345\255\2271:", nullptr));
        lblPlus->setText(QCoreApplication::translate("MainWindow", "+", nullptr));
        lblNum2->setText(QCoreApplication::translate("MainWindow", "\346\225\260\345\255\2272:", nullptr));
        btnCalculate->setText(QCoreApplication::translate("MainWindow", "\350\256\241\347\256\227", nullptr));
        labelCalculateResult->setText(QCoreApplication::translate("MainWindow", "\350\256\241\347\256\227\347\273\223\346\236\234\345\260\206\345\234\250\350\277\231\351\207\214\346\230\276\347\244\272", nullptr));
        labelCalculateResult->setStyleSheet(QCoreApplication::translate("MainWindow", "color: #e74c3c; font-weight: bold;", nullptr));
        groupBrowser->setTitle(QCoreApplication::translate("MainWindow", "\346\265\217\350\247\210\345\231\250\346\216\247\345\210\266", nullptr));
        btnOpenBrowser->setText(QCoreApplication::translate("MainWindow", "\346\211\223\345\274\200\346\265\217\350\247\210\345\231\250", nullptr));
        btnOpenBrowser->setStyleSheet(QCoreApplication::translate("MainWindow", "QPushButton { background-color: #3498db; color: white; padding: 8px; border-radius: 4px; }\n"
"QPushButton:hover { background-color: #2980b9; }", nullptr));
        groupLog->setTitle(QCoreApplication::translate("MainWindow", "\346\227\245\345\277\227\350\276\223\345\207\272", nullptr));
        textLog->setPlaceholderText(QCoreApplication::translate("MainWindow", "\346\227\245\345\277\227\344\277\241\346\201\257\345\260\206\345\234\250\350\277\231\351\207\214\346\230\276\347\244\272...\n"
"Node.js \346\234\215\345\212\241\345\231\250\347\232\204\350\276\223\345\207\272\345\260\206\346\230\276\347\244\272\345\234\250\346\216\247\345\210\266\345\217\260\344\270\255\343\200\202", nullptr));
        textLog->setStyleSheet(QCoreApplication::translate("MainWindow", "QTextEdit { font-family: 'Courier New', monospace; font-size: 12px; background-color: #2c3e50; color: #ecf0f1; }", nullptr));
        menuFile->setTitle(QCoreApplication::translate("MainWindow", "\346\226\207\344\273\266", nullptr));
        menuHelp->setTitle(QCoreApplication::translate("MainWindow", "\345\270\256\345\212\251", nullptr));
    } // retranslateUi

};

namespace Ui {
    class MainWindow: public Ui_MainWindow {};
} // namespace Ui

QT_END_NAMESPACE

#endif // UI_MAINWINDOW_H
