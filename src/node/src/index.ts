import BrowserUseServer from './web-server';

import globalData from './global';
const minimist = require('minimist');

const args = minimist(process.argv.slice(2));

const appDir = args['node-dir'];
globalData.set('node-dir', appDir);

function init () {
  //
}

const browserOperator = new BrowserUseServer();

browserOperator.start();



