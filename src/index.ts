import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { LlamaIndexServer } from "@llamaindex/server";
import "dotenv/config";
import { initSettings } from "./app/settings";
import { workflowFactory } from "./app/workflow";
import { handleLogin } from './api/auth';

// Configuration
const PORT = process.env.PORT || 3000;
const LLAMA_PORT = process.env.LLAMA_PORT || 3001;

// Initialize core systems
initSettings();
const app = express();

// Middleware setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 86400000
  }
}));

// Authentication routes
app.get('/login', (req, res) => {
  req.session.user ? res.redirect('/') : res.sendFile(path.join(process.cwd(), 'login.html'));
});

app.post('/api/login', handleLogin);

// Proxy configuration
const apiProxy = createProxyMiddleware({
  target: `http://localhost:${LLAMA_PORT}`,
  changeOrigin: true,
  ws: true,
  pathRewrite: { '^/': '/' }
});

// Authentication middleware
app.use((req, res, next) => {
  if (req.session.user || req.path === '/login') next();
  else res.redirect('/login');
});

// Server startup sequence
(async () => {
  try {
    // Configure LlamaIndexServer port through environment
    process.env.PORT = LLAMA_PORT.toString();
    
    const llamaServer = new LlamaIndexServer({
      workflow: workflowFactory,
      uiConfig: {
        appTitle: "LlamaIndex App",
        componentsDir: "components",
        devMode: true
      }
    });

    // Start LlamaIndexServer first
    await new Promise<void>((resolve) => {
      llamaServer.start();
      console.log(`LlamaIndexServer running internally on ${LLAMA_PORT}`);
      resolve();
    });

    // Start main Express server
    app.use(apiProxy);
    app.listen(PORT, () => {
      console.log(`Public server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
})();



