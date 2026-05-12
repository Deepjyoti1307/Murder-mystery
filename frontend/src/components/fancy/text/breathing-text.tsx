'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface BreathingTextProps {
  children: string;
  staggerDuration?: number;
  className?: string;
}

export default function BreathingText({
  children,
  staggerDuration = 0.05,
  className = "",
}: BreathingTextProps) {
  const letters = children.split("");

  return (
    <div className={`flex flex-wrap justify-center items-center ${className}`}>
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          initial={{ scale: 1, opacity: 0.7 }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
            delay: index * staggerDuration,
          }}
          className="inline-block origin-center"
          style={{ 
            whiteSpace: letter === " " ? "pre" : "normal",
            display: "inline-block"
          }}
        >
          {letter}
        </motion.span>
      ))}
    </div>
  );
}
