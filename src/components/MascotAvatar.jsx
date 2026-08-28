import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMascot } from '../contexts/MascotContext';

const moodFileMap = {
  angry: 'neon-angry',
  'cry-laugh': 'neon-cry_laugh',
  happy: 'neon-happy',
  'heart-eye': 'neon-heart_eyes',
  joy: 'neon-joy',
  sad: 'neon-sad',
  shy: 'neon-shy',
  surprised: 'neon-surpriced',
  winiking: 'neon-happy' // fallback for previous asset name
};

export default function MascotAvatar() {
  const { mascotState, dismissMascot } = useMascot();
  const { mood, message, isVisible } = mascotState;

  return (
    <div className="fixed bottom-20 right-4 z-[100] flex flex-col items-end pointer-events-none">
      
      {/* Speech Bubble */}
      <AnimatePresence>
        {isVisible && message && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="pointer-events-auto bg-gray-800 border border-gray-700 shadow-xl rounded-2xl rounded-br-none p-3 mb-2 max-w-[200px] relative text-sm text-gray-200"
          >
            <button 
              onClick={dismissMascot}
              className="absolute -top-2 -right-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-full w-5 h-5 flex items-center justify-center text-[10px] transition-colors border border-gray-600"
            >
              ✕
            </button>
            <p className="font-medium text-center">{message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mascot Character */}
      <motion.div
        className="pointer-events-auto cursor-pointer"
        animate={{ y: [0, -8, 0] }}
        transition={{ 
          repeat: Infinity, 
          duration: 3, 
          ease: "easeInOut" 
        }}
        whileHover={{ scale: 1.1, rotate: [0, -5, 5, -5, 0] }}
        whileTap={{ scale: 0.9 }}
        onClick={dismissMascot} // Tapping character also dismisses current message
      >
        <img 
          src={`/avatar/${moodFileMap[mood] || 'neon-happy'}.webp`} 
          alt={`Neon looking ${mood}`}
          className="w-24 h-24 object-contain drop-shadow-2xl filter brightness-110"
        />
      </motion.div>
      
    </div>
  );
}
