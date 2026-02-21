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
            ${width} h-full shrink-0 flex flex-col
            bg-black/70 backdrop-blur-xl
            ${side === 'left' ? 'border-r' : 'border-l'} border-white/10
            overflow-y-auto overflow-x-hidden
            z-10
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
