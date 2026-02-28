import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import type { IncomingHttpHeaders, IncomingMessage } from 'http';
import session from 'express-session';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import dotenv from 'dotenv';
import { SSHManager } from './ssh-manager.js';

dotenv.config();

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const APP_ENV = (process.env.NODE_ENV || 'development').trim().toLowerCase();

type Role = 'viewer' | 'operator' | 'admin';
const ROLE_LEVEL: Record<Role, number> = {
  viewer: 10,
  operator: 20,
  admin: 30,
};

function authEnabled(): boolean {
  const raw = (process.env.API_AUTH_ENABLED || 'false').trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(raw);
}

function parseTokenRoles(raw: string): Map<string, Role> {
  const map = new Map<string, Role>();
  raw.split(',').forEach((entry) => {
    const item = entry.trim();
    if (!item.includes(':')) return;
    const [token, roleRaw] = item.split(':', 2);
    const role = roleRaw.trim().toLowerCase() as Role;
    if (!token.trim()) return;
    if (!Object.keys(ROLE_LEVEL).includes(role)) return;
    map.set(token.trim(), role);
  });
  return map;
}

const TOKEN_ROLE_MAP = parseTokenRoles(process.env.API_AUTH_TOKENS || '');
const AUTH_INTROSPECT_URL = (process.env.AUTH_INTROSPECT_URL || 'http://localhost:5003/api/auth/introspect').trim();

function extractBearerToken(headers: IncomingHttpHeaders): string {
  const authHeader = String(headers['authorization'] || '');
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return '';
  }
  return authHeader.slice(7).trim();
}

function extractWsToken(req: IncomingMessage): string {
  const fromHeader = extractBearerToken(req.headers);
  if (fromHeader) return fromHeader;
  try {
    const parsed = new URL(req.url || '', 'http://localhost');
    return (parsed.searchParams.get('token') || '').trim();
  } catch {
    return '';
  }
}

async function resolveRole(headers: IncomingHttpHeaders, tokenOverride = ''): Promise<Role | null> {
  const token = (tokenOverride || extractBearerToken(headers)).trim();
  if (!token) return null;

  // 1) Central auth introspection
  try {
    const response = await fetch(AUTH_INTROSPECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (response.ok) {
      const payload = await response.json() as { role?: string };
      const role = String(payload.role || '').trim().toLowerCase() as Role;
      if (Object.keys(ROLE_LEVEL).includes(role)) {
        return role;
      }
    }
  } catch {}

  // 2) Static token fallback
  return TOKEN_ROLE_MAP.get(token) || null;
}

async function isAuthorized(headers: IncomingHttpHeaders, minimumRole: Role, tokenOverride = ''): Promise<boolean> {
  if (!authEnabled()) return true;
  const role = await resolveRole(headers, tokenOverride);
  if (!role) return false;
  return ROLE_LEVEL[role] >= ROLE_LEVEL[minimumRole];
}

// WebSocket CORS handling
wss.on('headers', (headers, req) => {
  const origin = req.headers.origin;

  // Allow localhost on any port in development
  if (!origin || (APP_ENV === 'development' && origin.match(/^http:\/\/localhost:\d+$/))) {
    headers.push('Access-Control-Allow-Origin: ' + (origin || '*'));
    headers.push('Access-Control-Allow-Credentials: true');
  }
});

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow localhost on any port in development
    if (!origin || (APP_ENV === 'development' && origin.match(/^http:\/\/localhost:\d+$/))) {
      callback(null, true);
    } else {
      callback(null, origin === (process.env.FRONTEND_URL || 'http://localhost:5173'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Session configuration
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'change-this-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

app.use(sessionMiddleware);
if (APP_ENV === 'production') {
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET === 'change-this-in-production') {
    throw new Error('SESSION_SECRET must be set to a secure value in production');
  }
}

// Rate limiting
const connectionLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.MAX_CONNECTION_ATTEMPTS || '5'),
  message: 'Too many connection attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(connectionLimiter);

// Map to store SSH connections by WebSocket
const sshConnections = new Map<WebSocket, SSHManager>();

// WebSocket connection handler
wss.on('connection', (ws: WebSocket, req) => {
  void (async () => {
    const wsToken = extractWsToken(req);
    if (!await isAuthorized(req.headers, 'operator', wsToken)) {
      ws.close(1008, 'Unauthorized');
      return;
    }

    console.log('New WebSocket connection');

    // Apply rate limiting
    const ip = req.socket.remoteAddress || 'unknown';
    console.log(`Connection from: ${ip}`);

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        // Handle SSH connection request
        if (message.type === 'connect') {
          // Validate credentials
          if (!message.hostname || !message.port || !message.username || !message.password) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Missing required connection parameters'
            }));
            return;
          }

          // Validate hostname (IP or domain)
          const hostnameRegex = /^(\d{1,3}\.){3}\d{1,3}$|^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
          if (!hostnameRegex.test(message.hostname)) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid hostname or IP address'
            }));
            return;
          }

          // Validate port
          const port = parseInt(message.port);
          if (isNaN(port) || port < 1 || port > 65535) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Invalid port number'
            }));
            return;
          }

          // Create SSH connection
          const sshManager = new SSHManager({
            host: message.hostname,
            port: port,
            username: message.username,
            password: message.password,
            timeout: parseInt(process.env.SSH_TIMEOUT || '30000'),
            keepaliveInterval: parseInt(process.env.SSH_KEEPALIVE_INTERVAL || '10000')
          });

          // Store SSH connection
          sshConnections.set(ws, sshManager);

          // Connect to SSH server
          try {
            await sshManager.connect();

            // Send success message
            ws.send(JSON.stringify({
              type: 'connected',
              message: 'SSH connection established'
            }));

            // Handle SSH data
            sshManager.on('data', (data: string) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'output',
                  data: data
                }));
              }
            });

            // Handle SSH errors
            sshManager.on('error', (error: Error) => {
              console.error('SSH Error:', error);
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'error',
                  message: error.message
                }));
              }
            });

            // Handle SSH close
            sshManager.on('close', () => {
              console.log('SSH connection closed');
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'close',
                  message: 'SSH connection closed'
                }));
                ws.close();
              }
              sshConnections.delete(ws);
            });

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'SSH connection failed';
            console.error('SSH Connection Error:', errorMessage);

            ws.send(JSON.stringify({
              type: 'error',
              message: errorMessage
            }));

            sshConnections.delete(ws);
          }
        }
        // Handle terminal input
        else if (message.type === 'input') {
          const sshManager = sshConnections.get(ws);
          if (sshManager) {
            sshManager.write(message.data);
          }
        }
        // Handle terminal resize
        else if (message.type === 'resize') {
          const sshManager = sshConnections.get(ws);
          if (sshManager && message.cols && message.rows) {
            sshManager.resize(message.cols, message.rows);
          }
        }

      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      const sshManager = sshConnections.get(ws);
      if (sshManager) {
        sshManager.disconnect();
        sshConnections.delete(ws);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      const sshManager = sshConnections.get(ws);
      if (sshManager) {
        sshManager.disconnect();
        sshConnections.delete(ws);
      }
    });
  })();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  if (!await isAuthorized(req.headers, 'viewer')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeConnections: sshConnections.size
  });
});

// Error handling middleware (error-first design)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Express Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = parseInt(process.env.PORT || '3000');

server.listen(PORT, () => {
  console.log(`🚀 SSH Web Terminal server running on port ${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  sshConnections.forEach((sshManager) => {
    sshManager.disconnect();
  });
  sshConnections.clear();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
