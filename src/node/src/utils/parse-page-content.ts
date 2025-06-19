import { DefaultBrowserOperator } from "@src/browser-use/operator-browser";
import globalData from "@src/global";
import fs from "fs";
import path from "path";
import { logger } from "./logger";
import { callDoubao } from "./ai-call/doubao";
import { preprocessResizeImage } from "@src/libs/sdk/utils";

const tasks: string[] = []

let isRunning = false;

async function parseImage (base64Image: string) {
  const streams = await callDoubao({
    imageUrl: 'data:image/png;base64,' + await preprocessResizeImage(base64Image, 5120 * 289 * 28)
  })
  let content = ""
  for await (const chunk of streams) {
    content += chunk;
  }
  return new Promise((resolve, reject) => {
    fs.writeFile(path.join(globalData.get('temp-page-dir'), `${globalData.get('session-id')}.txt`), content + '\n', (e) => {
      resolve(content);
    });
  });
}

async function exectTask () {
  if (tasks.length === 0) {
    isRunning = false;
    return;
  }
  if (isRunning) return;
  isRunning = true;
  const length = tasks.length;
  setTimeout(async () => {
    if (length > 0) {
      const image = tasks[0]
      await parseImage(image);
      tasks.shift();
      isRunning = false;
      exectTask();
    }
  }, 10);
}

const parsePageContent = async (base64Image: string) => {
  tasks.push(base64Image);
  exectTask();
  // const browser = DefaultBrowserOperator.browser;

  // try {
  //   const page = await browser?.getActivePage();
  //   if (page) {
  //     //
  //     // const content = await page!.content();
  //     const visibleText = await page.evaluate(() => {
  //       return document.body.innerText;
  //     });
  //     if (!fs.existsSync(globalData.get('temp-page-dir'))) {
  //       fs.mkdirSync(globalData.get('temp-page-dir'), { recursive: true });
  //     }
  //     fs.writeFile(path.join(globalData.get('temp-page-dir'), `${globalData.get('session-id')}.txt`), visibleText + '\n', () => {
  //       //
  //     });
  //   }
  // } catch (error) {
  //   logger.error('[GUIAgent] screenshot error', error);
  // }
  // try {
  //   const streams = callDoubao({
  //     imageUrl: base64Image
  //   })
  //   let content = ""
  //   for await (const chunk of streams) {
  //     content += chunk;
  //   }
  //   console.log(content); 
  // } catch (error) {
  //   logger.error('[GUIAgent] screenshot error', error);
  // }
}

export default parsePageContent;