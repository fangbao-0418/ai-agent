/****************************************************************************
** Meta object code from reading C++ file 'EmbeddedNodeRunner.h'
**
** Created by: The Qt Meta Object Compiler version 67 (Qt 5.15.3)
**
** WARNING! All changes made in this file will be lost!
*****************************************************************************/

#include <memory>
#include "../../EmbeddedNodeRunner.h"
#include <QtCore/qbytearray.h>
#include <QtCore/qmetatype.h>
#if !defined(Q_MOC_OUTPUT_REVISION)
#error "The header file 'EmbeddedNodeRunner.h' doesn't include <QObject>."
#elif Q_MOC_OUTPUT_REVISION != 67
#error "This file was generated using the moc from 5.15.3. It"
#error "cannot be used with the include files from this version of Qt."
#error "(The moc has changed too much.)"
#endif

QT_BEGIN_MOC_NAMESPACE
QT_WARNING_PUSH
QT_WARNING_DISABLE_DEPRECATED
struct qt_meta_stringdata_EmbeddedNodeRunner_t {
    QByteArrayData data[17];
    char stringdata0[224];
};
#define QT_MOC_LITERAL(idx, ofs, len) \
    Q_STATIC_BYTE_ARRAY_DATA_HEADER_INITIALIZER_WITH_OFFSET(len, \
    qptrdiff(offsetof(qt_meta_stringdata_EmbeddedNodeRunner_t, stringdata0) + ofs \
        - idx * sizeof(QByteArrayData)) \
    )
static const qt_meta_stringdata_EmbeddedNodeRunner_t qt_meta_stringdata_EmbeddedNodeRunner = {
    {
QT_MOC_LITERAL(0, 0, 18), // "EmbeddedNodeRunner"
QT_MOC_LITERAL(1, 19, 11), // "nodeStarted"
QT_MOC_LITERAL(2, 31, 0), // ""
QT_MOC_LITERAL(3, 32, 11), // "nodeStopped"
QT_MOC_LITERAL(4, 44, 9), // "nodeError"
QT_MOC_LITERAL(5, 54, 5), // "error"
QT_MOC_LITERAL(6, 60, 10), // "nodeOutput"
QT_MOC_LITERAL(7, 71, 6), // "output"
QT_MOC_LITERAL(8, 78, 13), // "onNodeStarted"
QT_MOC_LITERAL(9, 92, 14), // "onNodeFinished"
QT_MOC_LITERAL(10, 107, 8), // "exitCode"
QT_MOC_LITERAL(11, 116, 20), // "QProcess::ExitStatus"
QT_MOC_LITERAL(12, 137, 10), // "exitStatus"
QT_MOC_LITERAL(13, 148, 11), // "onNodeError"
QT_MOC_LITERAL(14, 160, 22), // "QProcess::ProcessError"
QT_MOC_LITERAL(15, 183, 20), // "onNodeStandardOutput"
QT_MOC_LITERAL(16, 204, 19) // "onNodeStandardError"

    },
    "EmbeddedNodeRunner\0nodeStarted\0\0"
    "nodeStopped\0nodeError\0error\0nodeOutput\0"
    "output\0onNodeStarted\0onNodeFinished\0"
    "exitCode\0QProcess::ExitStatus\0exitStatus\0"
    "onNodeError\0QProcess::ProcessError\0"
    "onNodeStandardOutput\0onNodeStandardError"
};
#undef QT_MOC_LITERAL

static const uint qt_meta_data_EmbeddedNodeRunner[] = {

 // content:
       8,       // revision
       0,       // classname
       0,    0, // classinfo
       9,   14, // methods
       0,    0, // properties
       0,    0, // enums/sets
       0,    0, // constructors
       0,       // flags
       4,       // signalCount

 // signals: name, argc, parameters, tag, flags
       1,    0,   59,    2, 0x06 /* Public */,
       3,    0,   60,    2, 0x06 /* Public */,
       4,    1,   61,    2, 0x06 /* Public */,
       6,    1,   64,    2, 0x06 /* Public */,

 // slots: name, argc, parameters, tag, flags
       8,    0,   67,    2, 0x08 /* Private */,
       9,    2,   68,    2, 0x08 /* Private */,
      13,    1,   73,    2, 0x08 /* Private */,
      15,    0,   76,    2, 0x08 /* Private */,
      16,    0,   77,    2, 0x08 /* Private */,

 // signals: parameters
    QMetaType::Void,
    QMetaType::Void,
    QMetaType::Void, QMetaType::QString,    5,
    QMetaType::Void, QMetaType::QString,    7,

 // slots: parameters
    QMetaType::Void,
    QMetaType::Void, QMetaType::Int, 0x80000000 | 11,   10,   12,
    QMetaType::Void, 0x80000000 | 14,    5,
    QMetaType::Void,
    QMetaType::Void,

       0        // eod
};

void EmbeddedNodeRunner::qt_static_metacall(QObject *_o, QMetaObject::Call _c, int _id, void **_a)
{
    if (_c == QMetaObject::InvokeMetaMethod) {
        auto *_t = static_cast<EmbeddedNodeRunner *>(_o);
        (void)_t;
        switch (_id) {
        case 0: _t->nodeStarted(); break;
        case 1: _t->nodeStopped(); break;
        case 2: _t->nodeError((*reinterpret_cast< const QString(*)>(_a[1]))); break;
        case 3: _t->nodeOutput((*reinterpret_cast< const QString(*)>(_a[1]))); break;
        case 4: _t->onNodeStarted(); break;
        case 5: _t->onNodeFinished((*reinterpret_cast< int(*)>(_a[1])),(*reinterpret_cast< QProcess::ExitStatus(*)>(_a[2]))); break;
        case 6: _t->onNodeError((*reinterpret_cast< QProcess::ProcessError(*)>(_a[1]))); break;
        case 7: _t->onNodeStandardOutput(); break;
        case 8: _t->onNodeStandardError(); break;
        default: ;
        }
    } else if (_c == QMetaObject::IndexOfMethod) {
        int *result = reinterpret_cast<int *>(_a[0]);
        {
            using _t = void (EmbeddedNodeRunner::*)();
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&EmbeddedNodeRunner::nodeStarted)) {
                *result = 0;
                return;
            }
        }
        {
            using _t = void (EmbeddedNodeRunner::*)();
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&EmbeddedNodeRunner::nodeStopped)) {
                *result = 1;
                return;
            }
        }
        {
            using _t = void (EmbeddedNodeRunner::*)(const QString & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&EmbeddedNodeRunner::nodeError)) {
                *result = 2;
                return;
            }
        }
        {
            using _t = void (EmbeddedNodeRunner::*)(const QString & );
            if (*reinterpret_cast<_t *>(_a[1]) == static_cast<_t>(&EmbeddedNodeRunner::nodeOutput)) {
                *result = 3;
                return;
            }
        }
    }
}

QT_INIT_METAOBJECT const QMetaObject EmbeddedNodeRunner::staticMetaObject = { {
    QMetaObject::SuperData::link<QObject::staticMetaObject>(),
    qt_meta_stringdata_EmbeddedNodeRunner.data,
    qt_meta_data_EmbeddedNodeRunner,
    qt_static_metacall,
    nullptr,
    nullptr
} };


const QMetaObject *EmbeddedNodeRunner::metaObject() const
{
    return QObject::d_ptr->metaObject ? QObject::d_ptr->dynamicMetaObject() : &staticMetaObject;
}

void *EmbeddedNodeRunner::qt_metacast(const char *_clname)
{
    if (!_clname) return nullptr;
    if (!strcmp(_clname, qt_meta_stringdata_EmbeddedNodeRunner.stringdata0))
        return static_cast<void*>(this);
    return QObject::qt_metacast(_clname);
}

int EmbeddedNodeRunner::qt_metacall(QMetaObject::Call _c, int _id, void **_a)
{
    _id = QObject::qt_metacall(_c, _id, _a);
    if (_id < 0)
        return _id;
    if (_c == QMetaObject::InvokeMetaMethod) {
        if (_id < 9)
            qt_static_metacall(this, _c, _id, _a);
        _id -= 9;
    } else if (_c == QMetaObject::RegisterMethodArgumentMetaType) {
        if (_id < 9)
            *reinterpret_cast<int*>(_a[0]) = -1;
        _id -= 9;
    }
    return _id;
}

// SIGNAL 0
void EmbeddedNodeRunner::nodeStarted()
{
    QMetaObject::activate(this, &staticMetaObject, 0, nullptr);
}

// SIGNAL 1
void EmbeddedNodeRunner::nodeStopped()
{
    QMetaObject::activate(this, &staticMetaObject, 1, nullptr);
}

// SIGNAL 2
void EmbeddedNodeRunner::nodeError(const QString & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 2, _a);
}

// SIGNAL 3
void EmbeddedNodeRunner::nodeOutput(const QString & _t1)
{
    void *_a[] = { nullptr, const_cast<void*>(reinterpret_cast<const void*>(std::addressof(_t1))) };
    QMetaObject::activate(this, &staticMetaObject, 3, _a);
}
QT_WARNING_POP
QT_END_MOC_NAMESPACE
