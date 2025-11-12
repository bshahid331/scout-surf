import React, { JSX } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import HomePage from '@/components/HomePage';
import AdminPage from '@/components/AdminPage';
import ScoutPage from '@/components/ScoutPage';
import ScoutDetailsPage from '@/components/ScoutDetailsPage';
import DocsPage from '@/components/DocsPage';
import { Toaster } from '@/components/ui/sonner';

function App(): JSX.Element {
  const location = useLocation();

  return (
    <div id='app-container' className='min-h-screen flex flex-col bg-background bg-grid-pattern'>
      <Header />

      <main id='app-main' className='flex-1'>
        <AnimatePresence mode='wait'>
          <Routes location={location} key={location.pathname}>
            <Route path='/' element={<HomePage />} />
            <Route path='/scout' element={<ScoutPage />} />
            <Route path='/scout/:id' element={<ScoutDetailsPage />} />
            <Route path='/docs' element={<DocsPage />} />
            <Route
              path='/admin'
              element={
                <AdminPage adminAddresses={['0x1234567890123456789012345678901234567890']} />
              }
            />
          </Routes>
        </AnimatePresence>
      </main>

      <Toaster />
    </div>
  );
}

export default App;
