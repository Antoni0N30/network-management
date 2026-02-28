import { useState } from 'react';
import { SSHConnectionForm, SSHCredentials } from '../components/SSHConnectionForm';
import { Terminal } from '../components/Terminal';

type AppState = 'connecting' | 'connected' | 'disconnected';

export function SSHTerminalPage() {
  const [state, setState] = useState<AppState>('disconnected');
  const [websocket, setWebsocket] = useState<WebSocket | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async (credentials: SSHCredentials) => {
    setError(null);
    setState('connecting');

    try {
      // Create WebSocket connection (use Vite proxy)
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;

      const ws = new WebSocket(wsUrl);

      // Handle WebSocket connection
      ws.onopen = () => {
        // Send SSH credentials
        ws.send(JSON.stringify({
          type: 'connect',
          ...credentials
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (message.type === 'connected') {
            setState('connected');
            setWebsocket(ws);
          } else if (message.type === 'error') {
            setError(message.message);
            setState('disconnected');
            ws.close();
          }
        } catch (e) {
          // Ignore non-JSON messages (terminal output)
        }
      };

      ws.onerror = () => {
        setError('WebSocket connection failed. Make sure the backend server is running on port 3000.');
        setState('disconnected');
      };

      ws.onclose = () => {
        if (state === 'connecting') {
          setError('Connection closed unexpectedly');
        }
        setState('disconnected');
        setWebsocket(null);
      };

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed');
      setState('disconnected');
    }
  };

  const handleDisconnect = () => {
    if (websocket) {
      websocket.close();
    }
    setWebsocket(null);
    setState('disconnected');
    setError(null);
  };

  return (
    <div className="min-h-screen">
      {state === 'connected' && websocket ? (
        <Terminal websocket={websocket} onDisconnect={handleDisconnect} />
      ) : (
        <>
          <SSHConnectionForm
            onConnect={handleConnect}
            isConnecting={state === 'connecting'}
          />
          {error && (
            <div className="fixed top-20 right-4 bg-rose-900/80 text-rose-100 px-5 py-4 rounded-xl shadow-xl backdrop-blur-md border border-rose-400/40 max-w-md z-50">
              <p className="font-semibold tracking-wide uppercase text-xs text-rose-300">Connection Error</p>
              <p className="text-sm mt-1 leading-relaxed">{error}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
