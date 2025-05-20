import { Request, Response } from 'express';

declare module 'express-session' {
  interface SessionData {
    user?: { username: string };
  }
}

export async function handleLogin(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      res.status(400).json({ message: 'Missing credentials' });
      return;
    }

    // Direct comparison for username
    console.log(username," ",password);
    const usernameValid = username === process.env.LOGIN_USERNAME;
    
    const passwordValid =password === process.env.LOGIN_PASSWORD;

    if (usernameValid && passwordValid) {
      req.session.user = { username };
      req.session.save(err => {
        err ? res.status(500).json({ message: 'Session error' })
            : res.json({ success: true });
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Authentication error' });
  }
}

export function requireAuth(req: Request, res: Response, next: () => void): void {
  req.session.user ? next() : res.redirect('/login');
}