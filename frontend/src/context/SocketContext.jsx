import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const SocketContext = createContext();

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://127.0.0.1:5000';
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Authenticate with user details
      socket.emit('authenticate', {
        user_id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role_name || user.role
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('user_status_changed', (users) => {
      setOnlineUsers(users || []);
    });

    socket.on('notification_created', (data) => {
      toast.info(`🔔 ${data.title || 'New notification'}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id]);

  const subscribeToEvent = (eventName, callback) => {
    if (socketRef.current) {
      socketRef.current.on(eventName, callback);
    }
  };

  const unsubscribeFromEvent = (eventName, callback) => {
    if (socketRef.current) {
      socketRef.current.off(eventName, callback);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        onlineUsers,
        subscribeToEvent,
        unsubscribeFromEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
