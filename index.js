#!/usr/bin/env node
const program = require('commander');
const path = require('path');
const crypto = require('crypto');
const { CLIEngine } = require('eslint');
const formatter = require('eslint/lib/formatters/stylish');
const fs = require('fs-extra');
const glob = require('glob');
const pkg = require('./package.json');

const cwd = process.cwd();
const engine = new CLIEngine();

function getHash(text) {
  const hashObj = crypto.createHash('sha256');
  hashObj.update(text);
  return hashObj.digest('hex');
}
function ignore(res) {
  return (
    res.warningCount === 1
    && res.results[0].messages[0]
    && res.results[0].messages[0].message
    && res.results[0].messages[0].message.indexOf('ignore') > 1
  );
}
function hasError(res) {
  // skip ignored file warning
  if (!ignore(res)) {
    return !!res.errorCount;
  }
  return false;
}

function printLinterOutput(res) {
  // skip ignored file warning
  if (!ignore(res)) {
    if (res.errorCount || res.warningCount) {
      const messages = formatter(res.results);
      if (res.errorCount) {
        throw new Error(messages);
      }
      if (res.warningCount) {
        console.warn(messages);
      }
    }
  }
}

process.on('unhandledRejection', err => {
  throw err;
});

program
  .version(pkg.version)
  .option('--no-cache', '禁用缓存')
  .option('--cache-location [path]', '指定缓存文件路径', '.eslintcache')
  .parse(process.argv);

const cacheFile = path.resolve(program.cacheLocation);
fs.ensureFileSync(cacheFile);
let cacheInfo = {};
try {
  cacheInfo = fs.readJSONSync(cacheFile);
} catch (e) {}
// printLinterOutput(lint(['./indexx.js']));
console.log('​cacheInfo', cacheInfo);
console.log(path.relative(cwd, cacheFile));

glob('index.js', { ignore: 'node_modules/**/*.*' }, async (err, files) => {
  if (err) {
    throw err;
  }
  try {
    await Promise.all(
      files.map(async file => {
        const text = await fs.readFile(file);
        const hash = getHash(text);
        if (cacheInfo[file] === hash) {
          return;
        }
        const res = engine.executeOnFiles([file]);
        if (!hasError(res)) {
          cacheInfo[file] = hash;
        } else {
          cacheInfo[file] = undefined;
        }
        printLinterOutput(res);
      })
    );
    fs.writeJSONSync(cacheFile, cacheInfo);
  } catch (e) {
    fs.writeJSONSync(cacheFile, cacheInfo);
    console.error(e);
    process.exit(1);
  }
});
