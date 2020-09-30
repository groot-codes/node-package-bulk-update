#!/usr/bin/env node
"use strict";
var _yargs = _interopRequireDefault(require("yargs"));
var _helpers = require("yargs/helpers");
var _axios = _interopRequireDefault(require("axios"));
var _fs = require("fs");
var _inquirer = _interopRequireDefault(require("inquirer"));function _interopRequireDefault(obj) {return obj && obj.__esModule ? obj : { default: obj };}

const { readFile } = _fs.promises;
const npmsIoBaseUrl = 'https://api.npms.io/v2';

const options = (0, _yargs.default)((0, _helpers.hideBin)(process.argv)).options({
  url: {
    type: 'string',
    default: './package.json',
    description: 'Url to package.json' },

  update: {
    alias: 'u',
    type: 'boolean',
    description: 'Also update updatable modules' } }).

argv;

const getModuleInfo = async module => {
  const { data } = await _axios.default.get(`${npmsIoBaseUrl}/package/${module}`);
  return data;
};

const getLatestModuleVersion = async module => {
  const moduleInfo = await getModuleInfo(module);
  return moduleInfo.collected.metadata.version;
};

const main = async ({ url, update }) => {
  const packageJsonString = await readFile(url);
  const packageJson = JSON.parse(packageJsonString);
  const { dependencies } = packageJson;

  const results = [];

  console.clear();
  for (const module of Object.keys(dependencies)) {
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(`Checking ${module}...`);
    const currentVersion = dependencies[module];
    const latestVersion = await getLatestModuleVersion(module);
    const updatable = !currentVersion.includes(latestVersion);
    results.push({
      module,
      currentVersion,
      latestVersion,
      updatable });

  }
  const updatable = results.filter(r => r.updatable);
  process.stdout.clearLine();
  process.stdout.cursorTo(0);
  process.stdout.write(`${updatable.length} modules can be updated.`);
  process.stdout.write('\n');
  console.table(updatable);

  if (updatable.length && !update) {
    const { shouldUpdateAll } = await _inquirer.default.prompt({
      type: 'confirm',
      name: 'shouldUpdateAll',
      message: 'Update all?' });


    if (!shouldUpdateAll) {
      const { shouldUpdateSome } = await _inquirer.default.prompt({
        type: 'confirm',
        name: 'shouldUpdateSome',
        message: 'Update some?' });


      // Update nothing...
      if (!shouldUpdateSome) {
        let updateCommand = 'npm install';
        for (const u of updatable) {
          updateCommand += ` ${u.module}@latest`;
        }
        console.log('');
        console.log('Okay. In case you change your mind... :)');
        console.log('');
        console.log(updateCommand);
        console.log('');
      }

      // Update some
      if (shouldUpdateSome) {
        console.log('');
        console.log('Choose which ones to update:');
        console.log('');
      }
    }

    // Update all
    if (shouldUpdateAll) {
      console.log('');
      console.log('Im on it... :)');
      console.log('');
    }
  }
};

main(options);