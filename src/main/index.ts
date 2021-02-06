import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
const ENTRY_URL = `file://${__dirname}/renderer.html`

const createWindow = () => {
	const mainWindow = new BrowserWindow({
		width: 300,
		height: 300,
		useContentSize: true,
		frame: false,
		show: false,
		backgroundColor: '#333333',
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
	globalShortcut.register('Ctrl+Space', () => {
		if (win.isVisible()) {
			win.hide()
			return
		}

		win.center()
		win.show()
		win.focus()
	})
}

(async () => {
	await app.whenReady()
	const rendererWindow = createWindow()
	registerShortcut(rendererWindow)
})()

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})
