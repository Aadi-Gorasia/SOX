import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { token, isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    if (!isAuthenticated || !token) return;

    console.log("CLIENT: Connecting socket...");

    const newSocket = io(process.env.REACT_APP_SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      console.log("CLIENT: Socket connected", newSocket.id);
    });

    newSocket.on("disconnect", (reason) => {
      console.log("CLIENT: Socket disconnected:", reason);
    });

    newSocket.on("connect_error", (err) => {
      console.error("CLIENT: Socket connection error:", err.message);
    });

    newSocket.on("reconnect", (attempt) => {
      console.log("CLIENT: Socket reconnected after", attempt, "attempts");
    });

    newSocket.on("reconnect_failed", () => {
      console.error("CLIENT: Socket reconnection failed");
    });

    setSocket(newSocket);

    return () => {
      console.log("CLIENT: Closing socket...");
      newSocket.close();
    };
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};git 

