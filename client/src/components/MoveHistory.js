// client/src/components/MoveHistory.js
import React, { useEffect, useRef } from 'react';
import './MoveHistory.css';

// We can create a simple SVG icon for X and O right here
const XIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const OIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"></circle></svg>;


const MoveHistory = ({ moves }) => {
    const moveListRef = useRef(null);

    // This effect will automatically scroll the list to the bottom when a new move is added
    useEffect(() => {
        if (moveListRef.current) {
            moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
        }
    }, [moves]);

    // --- Placeholder Data ---
    // In the future, you will remove this and use the 'moves' prop passed from GamePage.
    // The 'moves' prop should be an array of objects like: [{ player: 'X', timeTaken: 2 }, { player: 'O', timeTaken: 2 }]
    const placeholderMoves = [
        { player: 'X', timeTaken: 2 },
        { player: 'O', timeTaken: 2 },
        { player: 'X', timeTaken: 2 },
        { player: 'O', timeTaken: 2 },
        { player: 'X', timeTaken: 2 },
        { player: 'O', timeTaken: 2 },
        { player: 'X', timeTaken: 2 },
    ];

    const movesToDisplay = moves && moves.length > 0 ? moves : placeholderMoves;


    return (
        <aside className="move-history-container">
            <h2>Time Stamps</h2>
            <div className="move-list" ref={moveListRef}>
                {movesToDisplay.map((move, index) => (
                    <div className="move-item" key={index}>
                        <div className="move-player-mark">
                            {move.player === 'X' ? <XIcon /> : <OIcon />}
                        </div>
                        <span className="move-time">{move.timeTaken}s</span>
                    </div>
                ))}
            </div>
        </aside>
    );
};

export default MoveHistory;