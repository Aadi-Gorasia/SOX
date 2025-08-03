// client/src/context/SocketContext.js
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';
import { AuthContext } from './AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { token, isAuthenticated } = useContext(AuthContext);

    useEffect(() => {
        if (isAuthenticated && token) {
            const newSocket = io('http://localhost:5000', { auth: { token } });
            setSocket(newSocket);
            return () => { newSocket.close(); };
        }
    }, [isAuthenticated, token]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};