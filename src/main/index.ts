import { app, BrowserWindow, globalShortcut, ipcMain, MessageChannelMain, MessagePortMain } from 'electron'
const ENTRY_URL = `file://${__dirname}/../renderer/omniSearch.html`
const SHARED_PROCESS_URL = `file://${__dirname}/../renderer/sharedProcess.html`
const { platform } = process

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		backgroundColor: '#333333',
		width: 300,
		height: 300,
		useContentSize: true,
		frame: false,
		type: platform === 'linux' ? 'toolbar' : null,
		show: false,
		webPreferences: {
			nodeIntegration: true,
		},
	})
	mainWindow.hide()

	mainWindow.loadURL(ENTRY_URL)

	ipcMain.handle('resizeWindow', (_, { width, height }) => {
		mainWindow.setSize(width, height, true)
	})

	mainWindow.webContents.openDevTools()

	return mainWindow
}

const registerShortcut = (win : BrowserWindow) => {
	const keystroke = platform === 'linux' ? 'Alt+Space' : 'Ctrl+Space'

	globalShortcut.register(keystroke, () => {
		if (win.isVisible()) {
			win.hide()
			return
		}

		win.center()
		win.show()
		win.focus()
	})
}

const createSharedProcess = () => {
	const window = new BrowserWindow({
		show: false,
		webPreferences: {
			nodeIntegration: true,
		},
	})

	ipcMain.on('sharedProcess:registerMessageChannel', ({ sender }, { nonce }) => {
		const { port1: mainPort, port2: spPort } = new MessageChannelMain()
		mainPort.start()
		mainPort.on('message', ({ data }) => {
			console.log('msg')
			console.log(data)
		})

		console.log('sharedProcess:registerMessageChannel')
		sender.postMessage('sharedProcess:regieterMessageChannel:response', { nonce }, [spPort])
	})

	window.loadURL(SHARED_PROCESS_URL)
	window.on('ready-to-show', () => {
		window.webContents.openDevTools()
	})

	return window
}

;(async () => {
	await app.whenReady()
	const sharedProcess = createSharedProcess()
	const rendererWindow = createWindow()
	registerShortcut(rendererWindow)
})()

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
