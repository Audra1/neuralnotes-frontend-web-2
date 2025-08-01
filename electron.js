import { app, BrowserWindow, Menu, shell } from 'electron';
import path from 'path';
import { spawn } from 'child_process';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Better detection of development mode
const isDev = !app.isPackaged && process.env.NODE_ENV !== 'production';

let mainWindow;
let flaskProcess;

// Keep a global reference of the window object
function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true
    },
    icon: path.join(__dirname, 'public/vite.svg'),
    show: false,
    titleBarStyle: 'hidden'
  });

  // Load the app - better URL handling
  let startUrl;
  if (isDev) {
    startUrl = 'http://localhost:5173';
    console.log('Development mode: Loading from Vite dev server');
  } else {
    const distPath = path.join(__dirname, 'dist/index.html');
    startUrl = `file://${distPath}`;
    console.log('Production mode: Loading from built files');
  }
  
  console.log(`Loading URL: ${startUrl}`);
  mainWindow.loadURL(startUrl);

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log('Electron window ready');
  });

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Emitted when the window is closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Debug loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });
}

// Start Flask server
function startFlaskServer() {
  // More robust path finding
  const currentDir = __dirname;
  const backendPath = path.join(currentDir, '..', 'neuralnotes-web-backend');
  
  console.log('Current directory:', currentDir);
  console.log('Looking for Flask server at:', backendPath);
  
  // Check if backend directory exists
  if (!fs.existsSync(backendPath)) {
    console.error('Backend directory not found at:', backendPath);
    return;
  }

  // Try different Python paths
  const pythonPaths = [
    path.join(backendPath, 'venv', 'bin', 'python'),     // Unix/Mac
    path.join(backendPath, 'venv', 'Scripts', 'python.exe'), // Windows
    'python3',  // System python3
    'python'    // System python
  ];

  let pythonPath = null;
  for (const pyPath of pythonPaths) {
    if (fs.existsSync(pyPath) || pyPath.startsWith('python')) {
      pythonPath = pyPath;
      break;
    }
  }

  if (!pythonPath) {
    console.error('No Python executable found');
    return;
  }

  console.log('Using Python:', pythonPath);
  console.log('Starting Flask server...');
  
  flaskProcess = spawn(pythonPath, ['app.py'], {
    cwd: backendPath,
    stdio: 'inherit',
    env: { ...process.env, PYTHONPATH: backendPath }
  });

  flaskProcess.on('error', (error) => {
    console.error('Failed to start Flask server:', error);
  });

  flaskProcess.on('close', (code) => {
    console.log(`Flask server exited with code ${code}`);
  });
}

// Stop Flask server
function stopFlaskServer() {
  if (flaskProcess) {
    console.log('Stopping Flask server...');
    flaskProcess.kill();
    flaskProcess = null;
  }
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Neural File',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('new-neural-file');
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'actualSize' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  // macOS specific menu adjustments
  if (process.platform === 'darwin') {
    template.unshift({
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });

    // Window menu
    template[4].submenu = [
      { role: 'close' },
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' }
    ];
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  console.log('Electron app ready, isDev:', isDev);
  
  createWindow();
  createMenu();
  
  // Start Flask server
  startFlaskServer();
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopFlaskServer();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopFlaskServer();
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
});
