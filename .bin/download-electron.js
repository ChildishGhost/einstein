#!/usr/bin/env node
// modified from node_modules/electron/install.js
const { version } = require('../node_modules/electron/package')

const fs = require('fs')
const os = require('os')
const path = require('path')
const extract = require('extract-zip')
const { downloadArtifact } = require('@electron/get')

const arch = process.env.ELECTRON_ARCH || process.arch
const platform = process.env.ELECTRON_PLATFORM || os.platform()

const downloadPath = process.env.ELECTRON_DOWNLOAD_TO || path.join(__dirname, '../node_modules/.einstein/electron')
const platformPath = getPlatformPath()
const targetPath = path.join(downloadPath, platform, arch, version)

if (isInstalled()) {
	console.log(targetPath)
	process.exit(0)
}

// downloads if not cached
downloadArtifact({
	arch,
	version,
	platform,
	artifactName: 'electron',
	force: process.env.force_no_cache === 'true',
})
	.then(extractFile)
	.catch((err) => {
		console.error(err.stack)
		process.exit(1)
	})
	.then(() => console.log(targetPath))

function isInstalled() {
	const electronPath = path.join(targetPath, platformPath)

	return fs.existsSync(electronPath)
}

// makes target directory and unzips downloaded artifacts
function extractFile(zipPath) {
	fs.mkdirSync(targetPath, { recursive: true })

	return new Promise((resolve, reject) => {
		extract(zipPath, { dir: targetPath }, (err) => {
			if (err) return reject(err)
			resolve()
		})
	})
}

function getPlatformPath() {
	switch (platform) {
		case 'mas':
		case 'darwin':
			return 'Electron.app/Contents/MacOS/Electron'
		case 'freebsd':
		case 'openbsd':
		case 'linux':
			return 'electron'
		case 'win32':
			return 'electron.exe'
		default:
			throw new Error('Electron builds are not available on platform: ' + platform)
	}
}
