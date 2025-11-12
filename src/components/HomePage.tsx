import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, BookOpen, Play } from 'lucide-react';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' }
  },
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.8, ease: 'easeOut' }
  },
};

// Styled Scout component
const Scout: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <span className='italic font-semibold text-orange-600 dark:text-orange-400' style={{ textShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
    {children || 'Scout'}
  </span>
);

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className='min-h-[calc(100vh-80px)]'>
      <div className='container mx-auto px-4 py-12'>
        {/* Hero Section - Two Column Layout */}
        <div className='grid md:grid-cols-2 gap-8 items-stretch mb-16'>
          {/* Left Column - Main CTA */}
          <motion.div
            initial='hidden'
            animate='visible'
            variants={fadeInUp}
            className='flex flex-col p-8 md:p-12 bg-card rounded-2xl shadow-lg'
          >
            <div className='space-y-6 flex-grow'>
              <h1 className='text-5xl md:text-6xl font-bold text-foreground leading-tight'>
                Launch a <Scout /> to surf the web for you
              </h1>
              <p className='text-xl text-muted-foreground leading-relaxed'>
                Scout is an x402 enabled browser agent that can surf the web for you or your agents and autonomously run x402 MCP actions as a result of what it finds.
              </p>
            </div>

            <div className='mt-8'>
              <Button
                onClick={() => navigate('/scout')}
                size='lg'
                className='w-fit text-lg px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-300 group'
              >
                create your scout
                <ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform' />
              </Button>
            </div>
          </motion.div>

          {/* Right Column - Integration CTA */}
          <motion.div
            initial='hidden'
            animate='visible'
            variants={fadeIn}
            className='flex flex-col p-8 md:p-12 bg-accent/50 rounded-2xl shadow-lg border-2 border-accent'
          >
            <div className='space-y-6 flex-grow'>
              <h2 className='text-3xl md:text-4xl font-semibold text-foreground leading-tight'>
                Integrate your agent
              </h2>
              <p className='text-lg text-muted-foreground leading-relaxed'>
                Connect your autonomous agent to call scout via our x402 protected MCP.
                Enable seamless automation with pay-per-use API access.
              </p>
              <p className='text-base text-muted-foreground/80 font-medium'>
                $0.15 $CASH per scout
              </p>

              {/* Integration Image */}
              <div className='my-2'>
                <img
                  src='https://tarobase-app-storage-public-v2-staging.s3.amazonaws.com/tarobase-app-storage-68e5bec9dce9a002e87562fb/6912e731300fe1955d30b78c'
                  alt='x402 Integration Architecture'
                  className='max-h-48 w-auto'
                />
              </div>
            </div>

            <div className='mt-8'>
              <Button
                onClick={() => navigate('/docs')}
                size='lg'
                variant='outline'
                className='w-fit text-lg px-8 py-6 border-2 shadow-md hover:shadow-lg transition-all duration-300 group'
              >
                <BookOpen className='mr-2 h-5 w-5' />
                view docs
                <ArrowRight className='ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform' />
              </Button>
            </div>
          </motion.div>
        </div>

        {/* How It Works Section */}
        <motion.div
          initial='hidden'
          animate='visible'
          variants={fadeInUp}
          className='w-full'
        >
          <div className='text-center mb-8'>
            <h2 className='text-4xl md:text-5xl font-bold text-foreground'>
              How It Works
            </h2>
          </div>

          {/* Video Placeholder */}
          <div className='max-w-4xl mx-auto'>
            <div className='relative w-full' style={{ paddingBottom: '56.25%' }}>
              <div className='absolute inset-0 bg-accent/30 rounded-2xl shadow-lg flex flex-col items-center justify-center border-2 border-accent/50'>
                <Play className='h-16 w-16 text-muted-foreground mb-4' />
                <p className='text-xl text-muted-foreground font-medium'>
                  Demo video coming soon
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;
