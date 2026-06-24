import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

// Manages a single Socket.io connection scoped to one room. On every (re)connect
// it emits queue:sync so the client always pulls fresh authoritative state and
// never renders stale data after a network drop. The caller passes the events it
// cares about; this hook owns connection lifecycle, room identity, and resync.
export function useSocket({ tokenId, onQueueUpdate, onPatientUpdate }) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  // Hold the latest callbacks in a ref so re-renders that change handler
  // identity do not tear down and rebuild the socket connection.
  const handlers = useRef({ onQueueUpdate, onPatientUpdate });
  handlers.current = { onQueueUpdate, onPatientUpdate };

  useEffect(() => {
    const query = tokenId ? { tokenId } : { room: 'clinic-001' };
    const socket = io(SOCKET_URL, {
      query,
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 4000
    });
    socketRef.current = socket;

    const resync = () => {
      setConnected(true);
      socket.emit('queue:sync');
    };

    socket.on('connect', resync);
    socket.io.on('reconnect', resync);
    socket.on('disconnect', () => setConnected(false));

    socket.on('queue:update', (payload) => {
      handlers.current.onQueueUpdate && handlers.current.onQueueUpdate(payload);
    });
    socket.on('patient:update', (payload) => {
      handlers.current.onPatientUpdate && handlers.current.onPatientUpdate(payload);
    });

    return () => {
      socket.off();
      socket.io.off('reconnect', resync);
      socket.disconnect();
    };
  }, [tokenId]);

  const emit = (event, payload) =>
    new Promise((resolve) => {
      if (!socketRef.current) return resolve({ ok: false, error: 'not connected' });
      socketRef.current.emit(event, payload, resolve);
    });

  return { connected, emit };
}
