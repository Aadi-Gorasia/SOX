// client/src/components/DisplayBoard.js
import React from 'react';
import { motion } from 'framer-motion';
import './SuperBoard.css';
import './Board.css';
import './Cell.css';
const AnimatedCell = ({ delay }) => {
  return ( <motion.div className="cell" variants={{ hidden: { opacity: 0.2 }, visible: { opacity: 0.6 } }} initial="hidden" animate="visible" transition={{ duration: 1.5, delay, repeat: Infinity, repeatType: "reverse" }}></motion.div> );
};
const AnimatedBoard = () => ( <div className="board not-playable"> {Array(9).fill(null).map((_, i) => ( <AnimatedCell key={i} delay={Math.random() * 1.5} /> ))} </div> );
const DisplayBoard = () => { return ( <div className="super-board showcase-board"> {Array(9).fill(null).map((_, i) => ( <AnimatedBoard key={i} /> ))} </div> ); };
export default DisplayBoard;