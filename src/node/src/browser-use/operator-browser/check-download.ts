import emitter from "@src/utils/emitter";

export async function checkDownload () {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      emitter.emit('download-status');
      setTimeout(() => {
        resolve(true);
      }, 300);
    }, 3000);
  });
}