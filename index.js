const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    let win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: 'images/icon_v1-0_round_base.png',
        titleBarOverlay: true,
        titleBarOverlay: {
          color: '#202124',
          symbolColor: '#fff',
          height: 30
        },
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    win.setMenu(null);
    win.loadFile('index.html');
}

ipcMain.on('open-output-window', (event) => {
    const outputWin = new BrowserWindow({
        width: 800,
        height: 600,
        icon: 'images/icon_v1-0_round_base.png',
        titleBarOverlay: true,
        titleBarOverlay: {
          color: '#202124',
          symbolColor: '#fff',
          height: 30
        },
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    outputWin.setMenu(null);
    outputWin.loadFile('output.html');
});

function getResourcePath(relativePath) {
    const isDevelopment = process.env.ELECTRON_ENV === 'development';
    if (isDevelopment) {
        // Development mode
        return path.join(__dirname, relativePath);
    } else {
        // Production mode
        return path.join(process.resourcesPath, relativePath);
    }
}

ipcMain.handle('get-image-path', () => {
    const imagePath = path.join(getResourcePath('output'), 'render.jpg');
    return imagePath;
});

app.whenReady().then(createWindow);