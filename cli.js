#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { main } = require('./build/main/index');

const CONFIG_PATH = path.join(
  process.cwd(),
  'generate-mock-builders.config.js'
);

if (!fs.existsSync(CONFIG_PATH)) {
  console.log('no generate-mock-builders.config.js file found');
  process.exit(1);
}

const config = require(CONFIG_PATH);
main(config);
