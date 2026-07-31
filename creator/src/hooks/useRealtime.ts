import { useEffect, useRef } from 'react';
import { useSocket } from '../services/socket-context';

export function useRealtime<T = any>(event: string, callback: (data: T) => void) {
  const { socket } = useSocket();
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!socket || !event) return;

    const handler = (data: T) => {
      savedCallback.current(data);
    };

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
  }, [socket, event]);
}
