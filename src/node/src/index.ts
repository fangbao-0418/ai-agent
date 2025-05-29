import BrowserUseServer from './web-server';
import globalData from './global';
const minimist = require('minimist');

const args = minimist(process.argv.slice(2));

const appDir = args.appDir;

globalData.set('appDir', appDir);

const browserOperator = new BrowserUseServer();

browserOperator.start();



