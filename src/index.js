#!/usr/bin/env node

import yargs from 'yargs'
import axios from 'axios'
import { promises as fsPromises } from 'fs'
import inquirer from 'inquirer'
import shell from 'shelljs'
import ora from 'ora'
import { stderr } from 'process'

const { readFile } = fsPromises
const npmsIoBaseUrl = 'https://api.npms.io/v2'

const exec = async command =>
    new Promise((resolve, reject) => {
        shell.exec(command, { silent: true }, (code, stdout, stderr) => {
            resolve({ exitCode: code, output: stdout, error: stderr })
        })
    })

const options = yargs().options({
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

const getLatestModuleVersion = async module => {
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
        const latestVersion = await getLatestModuleVersion(module)
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

    if (updatable.length) console.table(updatable)

    let updateCommand = 'npm install'
    for (const u of updatable) {
        updateCommand += ` ${u.module}@latest`
    }

    if (updatable.length && !update) {
        const { shouldUpdateAll } = await inquirer.prompt({
            type: 'confirm',
            name: 'shouldUpdateAll',
            message: 'Update all?',
        })

        if (!shouldUpdateAll) {
            const { shouldUpdateSome } = await inquirer.prompt({
                type: 'confirm',
                name: 'shouldUpdateSome',
                message: 'Update some?',
            })

            // Update nothing...
            if (!shouldUpdateSome) {
                console.log('')
                console.log('Okay. In case you change your mind... :)')
                console.log('')
                console.log(updateCommand)
                console.log('')
            }

            // Update some
            if (shouldUpdateSome) {
                console.log('')
                console.log('Feature under construction :(')
                console.log('')
            }
        }

        // Update all
        if (shouldUpdateAll) {
            console.log('')
            console.log('Im on it... :)')
            console.log('')
            const spinner = ora('Updating modules...').start()
            const { exitCode, output, error } = await exec(updateCommand)

            if (!exitCode) {
                spinner.succeed('Unicorns loaded! :)')
                console.log('What I wanted to say was: *khm* Modules updated.')
                console.log("Shut up! Here's the log:")
                console.log('')
                console.log(output)

                if (error) {
                    console.log('')
                    const { showWarnings } = await inquirer.prompt({
                        type: 'confirm',
                        name: 'showWarnings',
                        message: 'Got some warnings. Wanna see?',
                    })

                    if (showWarnings) console.log(error)
                }
            }

            if (exitCode) {
                spinner.fail('Something went wrong...')
                console.error(error)
            }

            console.log('')
            console.log('All done. Bye bye!')
            console.log('')
        }
    }
}

main(options)
