import React from 'react';
import { motion } from 'framer-motion';
import { FeatureCardProps } from '@/components/types';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <motion.div
      variants={fadeIn}
      className='bg-background border rounded-xl p-6 hover:shadow-md transition-shadow'
    >
      <div className='w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4'>
        {icon}
      </div>
      <h3 className='text-lg font-medium mb-2'>{title}</h3>
      <p className='text-muted-foreground'>{description}</p>
    </motion.div>
  );
};

export default FeatureCard;
