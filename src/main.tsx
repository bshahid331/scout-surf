import { init } from '@pooflabs/web';
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import poofLogo from './assets/poof-logo.png';
import poofPreviewLogo from './assets/poof-preview-logo.png';
import ErrorBoundary from './ErrorBoundary';
import './globals.css'; // user-editable
import { TAROBASE_CONFIG } from './lib/config';
import './poof-styling.css'; // poof-owned, loaded last
import './styles/base.css';
const { appId, chain, rpcUrl, authMethod, wsApiUrl, apiUrl, authApiUrl } = TAROBASE_CONFIG;

const SHOW_FLOATING_POOF_BUTTON = true;

(async () => {
  try {
    // Check if PRIVY_CUSTOM_APP_ID exists in constants
    let privyCustomAppId: string | undefined;
    try {
      const constantsModule = await import('./lib/constants');
      privyCustomAppId = (constantsModule as any).PRIVY_CUSTOM_APP_ID;
    } catch (e) {
      // Constants file doesn't exist or PRIVY_CUSTOM_APP_ID doesn't exist
    }

    // Base configuration
    const baseConfig = {
      apiKey: '',
      wsApiUrl,
      apiUrl,
      authApiUrl,
      appId,
      authMethod,
      chain,
      rpcUrl,
      skipBackendInit: true,
    };

    // Add privyConfig if PRIVY_CUSTOM_APP_ID is available
    const config = privyCustomAppId
      ? {
          ...baseConfig,
          privyConfig: {
            appId: privyCustomAppId,
            config: {
              appearance: {
                walletChainType: 'solana-only',
              },
            },
          },
        }
      : baseConfig;

    await init(config);
    console.log('App initialized' + (privyCustomAppId ? ' with custom Privy config' : ''));
  } catch (err) {
    console.error('Failed to init app', err);
    throw err;
  }
})();

const FloatingPoofButton = ({ isProduction }: { isProduction: boolean }) => {
  const [showModal, setShowModal] = useState(false);
  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`fixed ${isProduction ? 'bottom-4' : 'bottom-6'} left-4 z-50 hover:opacity-80 transition-all duration-300 hover:scale-105 overflow-hidden`}
        style={{
          height: '70px',
          width: 'auto',
          border: 'none',
          background: 'transparent',
          padding: 0,
        }}
      >
        <img
          src={isProduction ? poofLogo : poofPreviewLogo}
          alt='Poof Logo'
          style={{ height: '100%', width: 'auto', objectFit: 'contain' }}
        />
      </button>
      {showModal && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
          onClick={() => setShowModal(false)}
        >
          <div
            className='bg-white rounded-lg p-10 max-w-md mx-4 shadow-2xl relative'
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: "'Montserrat Variable', 'Hanken Grotesk', sans-serif" }}
          >
            <button
              onClick={() => setShowModal(false)}
              className='absolute top-2 right-2 text-gray-600 hover:text-gray-800 font-dark text-xl'
              style={{
                border: 'none',
                background: 'transparent',
                padding: '8px',
                cursor: 'pointer',
              }}
              aria-label='Close modal'
            >
              x
            </button>
            <div className='text-gray-600 space-y-3'>
              <p>
                This app was built using{' '}
                <a
                  href='https://poof.new'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-blue-600 hover:text-blue-800 underline'
                >
                  poof.new
                </a>
                .
              </p>
              <p>Create Solana dApps in minutes using natural language.</p>
              <p className='text-sm text-gray-500 font-medium'>Use at your own risk.</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const AppWithChrome = () => {
  return (
    <div id='poof-chrome'>
      {SHOW_FLOATING_POOF_BUTTON && (
        <FloatingPoofButton isProduction={import.meta.env.VITE_ENV === 'LIVE'} />
      )}
      <App />
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AppWithChrome />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
