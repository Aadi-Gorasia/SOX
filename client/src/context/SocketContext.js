// client/src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const { token, isAuthenticated } = useContext(AuthContext);

  useEffect(() => {
    if (isAuthenticated && token) {
      console.log("CLIENT: Connecting socket with token...");

      const newSocket = io("http://localhost:5000", {
        auth: { token },
        transports: ["websocket"], // force websocket only
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

      setSocket(newSocket);

      return () => {
        console.log("CLIENT: Closing socket...");
        newSocket.close();
      };
    }
  }, [isAuthenticated, token]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
