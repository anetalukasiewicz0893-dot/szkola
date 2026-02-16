import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverEffect?: boolean;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick, hoverEffect = false }) => {
  return (
    <motion.div
      whileHover={hoverEffect ? { scale: 1.01, boxShadow: "0 8px 32px rgba(0,0,0,0.15)" } : {}}
      onClick={onClick}
      className={`glass-panel rounded-2xl p-6 transition-all duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
};

export default GlassCard;
