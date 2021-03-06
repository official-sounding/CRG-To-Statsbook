const {app, BrowserWindow, Menu, dialog} = require('electron')
const path = require('path')
const url = require('url')
const ipc = require('electron').ipcMain
const isDev = require('electron-is-dev')
require('electron-debug')({enabled: false})

let menu,
    win,
    aboutWin,
    completeWin

app.allowRendererProcessReuse = true

let createWindow = () => {
    win = new BrowserWindow({
        title: 'CRG Data Tool',
        icon: __dirname + '/build/flamingo-white.png',
        width: 800, 
        height: 650,
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.loadURL(url.format({
        pathname: path.join(__dirname, 'src/index.html'),
        protocol: 'file',
        slashes: true
    }))

    if (isDev){
        win.webContents.openDevTools()
        require('devtron').install()
    }

    win.webContents.on('will-navigate', (event) => event.preventDefault())

    win.on('closed', ()=> {
        win=null
    })

    win.webContents.on('crashed', ()=> {
        dialog.showMessageBox(win, {
            type: 'error',
            title: 'CRG Data Tool',
            message: 'CRG Data Tool has crashed.  This should probably not surprise you.'
        })
    })

    win.on('unresponsive', ()=> {
        dialog.showMessageBox(win, {
            type: 'error',
            title: 'CRG Data Tool',
            message: 'CRG Data Tool has become unresponsive.  Perhaps you should give it some personal space.'
        })
    })

    win.webContents.on('new-window', 
        (event, url, frameName, disposition, options) => {
            Object.assign(options, {
                parent: win,
                modal: true
            })
        })

    menu = Menu.buildFromTemplate([
        {
            label: 'Options',
            submenu: [
                {   label: 'Paper Size',
                    submenu: [                
                        {
                            label: 'US Letter',
                            type: 'radio',
                            checked: true,
                            click() {
                                setPaperSize('Letter')
                            }
                        },
                        {
                            label: 'A4',
                            type: 'radio',
                            click(){
                                setPaperSize('A4')
                            }
                        }
                    ]
                },
                {
                    type: 'separator'
                },
                {
                    label:'Exit',
                    click(){
                        app.quit()
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {   label: 'About',
                    click: function(){
                        openAbout()
                    }
                }
            ]    
        }
    ])
    Menu.setApplicationMenu(menu)

    // Do version check
    win.webContents.on('did-finish-load', () => {
        win.webContents.send('do-version-check', app.getVersion())
    })
    
    win.webContents.on('new-window', function(e, url) {
        e.preventDefault()
        require('electron').shell.openExternal(url)
    })
}



app.on('ready', createWindow)

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate',() => {
    if (win == null){
        createWindow()
    }
})

let setPaperSize = (size) => {
// Dispatches event to change paper size
    win.webContents.send('set-paper-size',size)
}

let openAbout = () => {
// opening function for "About This Software" window
    aboutWin = new BrowserWindow({
        parent: win,
        title: 'CRG Data Tool',
        icon: __dirname + '/build/flamingo-white.png',
        width: 300,
        height: 300,
        x: win.getPosition()[0] + 250,
        y: win.getPosition()[1] + 150,
        webPreferences: {
            nodeIntegration: true
        }
    })

    aboutWin.setMenu(null)

    aboutWin.loadURL(url.format({
        pathname: path.join(__dirname, 'src/about.html'),
        protocol: 'file',
        slashes: true
    }))

    aboutWin.webContents.on('new-window', function(e, url) {
        e.preventDefault()
        require('electron').shell.openExternal(url)
    })

    aboutWin.on('closed', () => {
        aboutWin = null
    })

    aboutWin.webContents.on('did-finish-load', () => {
        aboutWin.webContents.send('set-version', app.getVersion())
    })
    
}

ipc.on('skater-window-closed', (event, outFileName, skaterList) => {
    win.webContents.send('skater-window-closed',outFileName, skaterList)
})

ipc.on('write-complete', (event, outFileName) => {
    openComplete(outFileName)
})

let openComplete = (outFileName) => {
    completeWin = new BrowserWindow({
        parent: win,
        title: 'CRG Data Tool',
        icon: __dirname + '/build/flamingo-white.png',
        width: 600,
        height: 300,
        x: win.getPosition()[0] + 100,
        y: win.getPosition()[1] + 150,
        webPreferences: {
            nodeIntegration: true
        }
    })

    completeWin.setMenu(null)

    completeWin.loadURL(url.format({
        pathname: path.join(__dirname, 'src/complete.html'),
        protocol: 'file',
        slashes: true
    }))

    completeWin.webContents.on('new-window', function(e, url) {
        e.preventDefault()
        require('electron').shell.openExternal(url)
    })

    completeWin.on('closed', () => {
        completeWin = null
    })

    completeWin.webContents.on('did-finish-load', () => {
        completeWin.webContents.send('set-filename', outFileName)
    })
}

// Error handlers

ipc.on('error-thrown', (event, msg, url, lineNo, columnNo) => {
    dialog.showMessageBox(win, {
        type: 'error',
        title: 'CRG Data Tool',
        message: `CRG Data Tool has encountered an error.
        Here's some details:
        Message: ${msg}
        URL: ${url}
        Line Number: ${lineNo}
        Column Number: ${columnNo}
        Does this help?  It probably doesn't help.`
    })
})

process.on('uncaughtException', (err) => {
    dialog.showMessageBox(win, {
        type: 'error',
        title: 'CRG Data Tool',
        message: `CRG Data Tool has had an uncaught exception in main.js.  Does this help? (Note: will probably not help.) ${err}`
    })       
})