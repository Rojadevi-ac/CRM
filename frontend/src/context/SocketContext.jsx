import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { userApi } from '../api/crmApi';

const SocketContext = createContext();

function getSocketUrl() {
  const envSocket = import.meta.env.VITE_SOCKET_URL;
  if (envSocket && !envSocket.includes('127.0.0.1') && !envSocket.includes('localhost')) {
    return envSocket;
  }
  const envApi = import.meta.env.VITE_API_BASE_URL;
  if (envApi && !envApi.includes('127.0.0.1') && !envApi.includes('localhost')) {
    return envApi.replace('/api', '');
  }
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '127.0.0.1';
  return `http://${hostname}:5000`;
}

export function SocketProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);

  // Initial HTTP hydration of online members
  const fetchOnlineUsers = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await userApi.getOnlineUsers();
      if (res.data?.success && Array.isArray(res.data.data)) {
        setOnlineUsers(res.data.data);
      }
    } catch (err) {
      console.warn("Could not hydrate online users via REST:", err);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchOnlineUsers();
  }, [fetchOnlineUsers]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socketUrl = getSocketUrl();
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Authenticate with user details
      socket.emit('authenticate', {
        user_id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role_name || user.role,
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('user_status_changed', (users) => {
      if (Array.isArray(users)) {
        setOnlineUsers(users);
      }
    });

    socket.on('notification_created', (data) => {
      toast.info(`🔔 ${data.title || 'New notification'}`);
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, user?.id, user?.full_name, user?.email, user?.role, user?.role_name, toast]);

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
