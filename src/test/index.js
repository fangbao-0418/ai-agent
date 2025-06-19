// import childProcess from 'node:child_process';
// childProcess.spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
const date = new Date()
const timestamp = [date.getFullYear(), date.getMonth() + 1, date.getDate()].join('-') + ' ' + [
  date.getHours(), date.getMinutes(), date.getSeconds()
].join(':') + '.' + date.getMilliseconds();
console.log(timestamp)

process.on('exit', (err) => {
  console.log(err, 'exit');
});

process.on('uncaughtException', (err) => {
  console.log(err, 'uncaughtException');
});

process.on('unhandledRejection', (err) => {
  console.log(err, 'unhandledRejection');
});

function main () {
  var func = new Function("a + b");
  func()
}
main()

console.log('test');