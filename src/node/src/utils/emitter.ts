import EventEmitter from 'events';
class MyEmitter extends EventEmitter {}
const emitter = new MyEmitter();

export default emitter;