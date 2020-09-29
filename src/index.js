#!/usr/bin/env node

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import axios from 'axios'
import { promises as fsPromises } from 'fs'
import inquirer from 'inquirer'

const { readFile } = fsPromises
const npmsIoBaseUrl = 'https://api.npms.io/v2'

const options = yargs(hideBin(process.argv)).options({
    url: {
        type: 'string',
        default: './package.json',
        description: 'Url to package.json',
    },
    update: {
        alias: 'u',
        type: 'boolean',
        description: 'Also update updatable modules',
    },
}).argv

const getModuleInfo = async module => {
    const { data } = await axios.get(`${npmsIoBaseUrl}/package/${module}`)
    return data
}

const getModuleVersion = async module => {
    const moduleInfo = await getModuleInfo(module)
    return moduleInfo.collected.metadata.version
}

const main = async ({ url, update }) => {
    const packageJsonString = await readFile(url)
    const packageJson = JSON.parse(packageJsonString)
    const { dependencies } = packageJson

    const results = []

    console.clear()
    for (const module of Object.keys(dependencies)) {
        process.stdout.clearLine()
        process.stdout.cursorTo(0)
        process.stdout.write(`Checking ${module}...`)
        const currentVersion = dependencies[module]
        const latestVersion = await getModuleVersion(module)
        const updatable = !currentVersion.includes(latestVersion)
        results.push({
            module,
            currentVersion,
            latestVersion,
            updatable,
        })
    }
    const updatable = results.filter(r => r.updatable)
    process.stdout.clearLine()
    process.stdout.cursorTo(0)
    process.stdout.write(`${updatable.length} modules can be updated.`)
    process.stdout.write('\n')
    console.table(updatable)

    if (updatable.length && !update) {
        const { shouldUpdate } = await inquirer.prompt({
            type: 'confirm',
            name: 'shouldUpdate',
            message: 'Update?',
        })

        if (!shouldUpdate) {
            let updateCommand = 'npm install'
            for (const u of updatable) {
                updateCommand += ` ${u.module}@latest`
            }
            console.log('')
            console.log('In case you change your mind...')
            console.log('')
            console.log(updateCommand)
            console.log('')
        }

        if (shouldUpdate) {
            console.log('')
            console.log('Im on it... :)')
            console.log('')
        }
    }
}

main(options)
