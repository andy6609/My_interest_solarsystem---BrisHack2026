'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  side: 'left' | 'right';
  width?: string;
  children: React.ReactNode;
}

export function AnimatedPanel({ isOpen, side, width = 'w-72', children }: Props) {
  const xOffset = side === 'left' ? '-100%' : '100%';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`
            absolute top-0 bottom-0 ${side === 'left' ? 'left-0' : 'right-0'}
            ${width} h-full flex flex-col
            bg-black/70 backdrop-blur-xl
            ${side === 'left' ? 'border-r' : 'border-l'} border-white/10
            overflow-y-auto overflow-x-hidden
            z-20
          `}
          initial={{ x: xOffset, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: xOffset, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 0.8 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
