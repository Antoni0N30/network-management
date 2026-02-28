import React, { useEffect, useRef, useState } from 'react';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { Terminal as XTerm } from '@xterm/xterm';
import { Power, Radio, ShieldCheck } from 'lucide-react';
import '@xterm/xterm/css/xterm.css';

interface TerminalProps {
  websocket: WebSocket | null;
  onDisconnect?: () => void;
}

export const Terminal: React.FC<TerminalProps> = ({ websocket, onDisconnect }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const [connectedFor, setConnectedFor] = useState(0);

  useEffect(() => {
    if (!terminalRef.current) return;

    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#020617',
        foreground: '#86efac',
        cursor: '#22c55e',
        cursorAccent: '#0f172a',
        black: '#0f172a',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#f59e0b',
        blue: '#0ea5e9',
        magenta: '#a78bfa',
        cyan: '#06b6d4',
        white: '#bbf7d0',
        brightBlack: '#475569',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#fbbf24',
        brightBlue: '#38bdf8',
        brightMagenta: '#67e8f9',
        brightCyan: '#22d3ee',
        brightWhite: '#dcfce7',
      },
      allowProposedApi: true,
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    xterm.loadAddon(fitAddon);
    xterm.loadAddon(webLinksAddon);

    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;

    xterm.writeln('\x1b[1;32m+------------------------------------------+\x1b[0m');
    xterm.writeln('\x1b[1;32m|   NETWORK TERMINAL :: SESSION STARTED    |\x1b[0m');
    xterm.writeln('\x1b[1;32m+------------------------------------------+\x1b[0m');
    xterm.writeln('');

    const handleResize = () => {
      fitAddon.fit();
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'resize',
          cols: xterm.cols,
          rows: xterm.rows
        }));
      }
    };

    window.addEventListener('resize', handleResize);

    const disposable = xterm.onData((data) => {
      if (websocket && websocket.readyState === WebSocket.OPEN) {
        websocket.send(JSON.stringify({
          type: 'input',
          data
        }));
      }
    });

    return () => {
      disposable.dispose();
      window.removeEventListener('resize', handleResize);
      xterm.dispose();
    };
  }, [websocket]);

  useEffect(() => {
    if (!websocket || !xtermRef.current) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'output' && xtermRef.current) {
          xtermRef.current.write(message.data);
        } else if (message.type === 'error' && xtermRef.current) {
          xtermRef.current.writeln(`\r\n\x1b[1;31mError: ${message.message}\x1b[0m\r\n`);
        } else if (message.type === 'close') {
          if (xtermRef.current) {
            xtermRef.current.writeln('\r\n\x1b[1;33mSession closed\x1b[0m\r\n');
          }
          if (onDisconnect) {
            setTimeout(onDisconnect, 1200);
          }
        }
      } catch {
        if (typeof event.data === 'string' && xtermRef.current) {
          xtermRef.current.write(event.data);
        }
      }
    };

    const handleClose = () => {
      if (xtermRef.current) {
        xtermRef.current.writeln('\r\n\x1b[1;31mWebSocket disconnected\x1b[0m\r\n');
      }
      if (onDisconnect) {
        setTimeout(onDisconnect, 1200);
      }
    };

    const handleError = () => {
      if (xtermRef.current) {
        xtermRef.current.writeln('\r\n\x1b[1;31mWebSocket error\x1b[0m\r\n');
      }
    };

    websocket.addEventListener('message', handleMessage);
    websocket.addEventListener('close', handleClose);
    websocket.addEventListener('error', handleError);

    if (websocket.readyState === WebSocket.OPEN && xtermRef.current) {
      websocket.send(JSON.stringify({
        type: 'resize',
        cols: xtermRef.current.cols,
        rows: xtermRef.current.rows
      }));
    }

    return () => {
      websocket.removeEventListener('message', handleMessage);
      websocket.removeEventListener('close', handleClose);
      websocket.removeEventListener('error', handleError);
    };
  }, [websocket, onDisconnect]);

  useEffect(() => {
    const timer = setInterval(() => {
      setConnectedFor((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedUptime = `${Math.floor(connectedFor / 60)}m ${connectedFor % 60}s`;

  return (
    <div className="h-screen w-full bg-slate-950 flex flex-col">
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-cyan-400/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-cyan-300">
            <Radio className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase">Live Session</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-slate-400 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted Channel</span>
            <span className="text-slate-600">|</span>
            <span>Uptime {formattedUptime}</span>
          </div>
        </div>
        <button
          onClick={onDisconnect}
          className="inline-flex items-center gap-2 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-rose-300 hover:bg-rose-500/20 transition-colors text-sm font-medium"
        >
          <Power className="w-4 h-4" />
          Disconnect
        </button>
      </div>
      <div
        ref={terminalRef}
        className="flex-1 overflow-hidden border-t border-slate-800/70"
        style={{ minHeight: 0 }}
      />
    </div>
  );
};
