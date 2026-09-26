// .puppeteerrc.cjs
// Forces Puppeteer to install/look for Chrome inside this project's own
// folder instead of the OS home directory ($HOME/.cache/puppeteer).
//
// Why this is needed on Render: Render's build step and the running
// service don't share $HOME/.cache — only files inside the project
// directory (/opt/render/project/...) survive from build to deploy.
// Without this file, `npx puppeteer browsers install chrome` (our
// postinstall script) installs Chrome to $HOME/.cache/puppeteer, which
// is gone by the time the server starts, causing:
//   "Could not find Chrome (ver. ...)"
//
// This file must use .cjs (CommonJS) even though package.json has
// "type": "module", because Puppeteer's CLI loads it with require().
const { join } = require('path');

module.exports = {
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
