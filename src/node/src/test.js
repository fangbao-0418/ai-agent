
// const typeBuf = Buffer.alloc(2);
// typeBuf.writeUInt16BE("ascii");

// console.log(typeBuf.length)

// const res = typeBuf.readUInt16BE(0);
// console.log(res.toString())

// const b2 = Buffer.alloc(2)
// console.log(b2.length)

// const buffer = Buffer.from('02', 'ascii');
// console.log(buffer, buffer.length);
// console.log(buffer.toString());

// const payloadBuf = Buffer.from(payload)

// const payload = {"name": "fang"}

// const buffer = Buffer.from(JSON.stringify(payload))


// // 0000001730307B226576656E74223A2274686F756768742D656E64227D94B23217

// console.log(buffer.toString())

const header = Buffer.alloc(4);
const ss = header.writeUInt32BE(2332423232);

console.log(header, 'ss')

var buffer2 = Buffer([0, 0, 126, 169])

console.log(buffer2)