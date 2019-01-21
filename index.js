#!/usr/bin/env node
const program = require('commander');
const path = require('path');
const crypto = require('crypto');
const { CLIEngine } = require('eslint');
const formatter = require('eslint-formatter-friendly');
const fs = require('fs-extra');
const pkg = require('./package.json');
const globUtils = require('./lib/glob-utils');

const cwd = process.cwd();
const engine = new CLIEngine({});

function getHash(text) {
  const hashObj = crypto.createHash('sha256');
  hashObj.update(text);
  return hashObj.digest('hex');
}
function ignoreFiles(res) {
  return (
    res.warningCount === 1
    && res.results[0].messages[0]
    && res.results[0].messages[0].message
    && res.results[0].messages[0].message.indexOf('ignore') > 1
  );
}
function hasError(res) {
  // skip ignored file warning
  if (!ignoreFiles(res)) {
    return !!res.errorCount;
  }
  return false;
}

function printLinterOutput(res) {
  // skip ignored file warning
  if (!ignoreFiles(res)) {
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
  console.error(err);
  throw err;
});

program
  .version(pkg.version)
  .option('--no-cache', '禁用缓存')
  .option('--ext <extensions>', '扩展名称', '.js')
  .option('--id <id>', '添加缓存ID，用于自动更新缓存', '1')
  .option('--cache-location <path>', '指定缓存文件路径', '.eslint-cache')
  .parse(process.argv);

const cacheFile = path.resolve(program.cacheLocation);
fs.ensureFileSync(cacheFile);
let cacheInfo = {};
try {
  cacheInfo = fs.readJSONSync(cacheFile);
} catch (e) {}
if (cacheInfo._id !== program.id) {
  cacheInfo = {};
}
cacheInfo._id = program.id;

async function parse(files) {
  try {
    await Promise.all(
      files.map(async ({ filename, ignore }) => {
        if (ignore) {
          return;
        }
        const buffer = await fs.readFile(filename);
        const hash = getHash(buffer);
        const relativeFilePath = filename.replace(cwd, '');
        if (cacheInfo[relativeFilePath] === hash) {
          return;
        }
        const res = engine.executeOnFiles([filename]);
        if (!hasError(res)) {
          cacheInfo[relativeFilePath] = hash;
        } else {
          cacheInfo[relativeFilePath] = undefined;
        }
        printLinterOutput(res);
      })
    );
    fs.writeJSONSync(cacheFile, cacheInfo);
    console.log('✔ eslint success');
  } catch (e) {
    fs.writeJSONSync(cacheFile, cacheInfo);
    console.error(e);
    console.error('❌ eslint error');
    process.exit(1);
  }
}
const options = { ignore: true, extensions: program.ext.split(',') };
parse(globUtils.listFilesToProcess(program.args, options));
