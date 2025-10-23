import React, { useState, useEffect, useContext, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { AuthContext } from '../context/AuthContext';
import './GameActions.css';

const GameActions = ({ gameId, chat, drawOffer, onResign, onOfferDraw }) => {
    const socket = useSocket();
    const { user } = useContext(AuthContext);
    const [message, setMessage] = useState('');
    const chatBodyRef = useRef(null);

    useEffect(() => {
        // Auto-scroll chat to the bottom
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [chat]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (message.trim() && socket) {
            socket.emit('sendChatMessage', { gameId, message });
            setMessage('');
        }
    };

    return (
        <div className="side-panel-container">
            <div className="chat-container">
                <div className="chat-body" ref={chatBodyRef}>
                    {(chat || []).map((msg, index) => (
                        <div key={index} className="chat-message">
                            <strong>{msg.sender}:</strong> {msg.text}
                        </div>
                    ))}
                </div>
                <form onSubmit={handleSendMessage} className="chat-form">
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type a message..."
                        autoComplete="off"
                    />
                    <button type="submit">Send</button>
                </form>
            </div>

            <div className="actions-container">
                <button onClick={onOfferDraw} disabled={!!drawOffer} className="action-btn">
                    Offer Draw
                </button>
                <button onClick={onResign} className="action-btn resign-btn">
                    Resign
                </button>
            </div>
        </div>
    );
};

export default GameActions;