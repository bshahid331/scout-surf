import { AuthContextType } from '@/components/types';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TAROBASE_CONFIG } from '@/lib/config';
import { useAuth } from '@pooflabs/web';
import { Check, Copy, Plus, RefreshCw, Wallet, Bot } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

// If a header is wanted, change this to the name of the app
const AppName = 'scout.surf';

export const Header: React.FC = () => {
  const { user, loading, login, logout } = useAuth() as AuthContextType;

  // SOL Balance hook logic
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCopied, setJustCopied] = useState(false);
  const lastFetchTime = useRef<number>(0);
  const FETCH_COOLDOWN = 5000; // 5 seconds

  const fetchBalance = async () => {
    if (!user?.address) {
      setBalance(null);
      setBalanceLoading(false);
      setError(null);
      return;
    }

    setBalanceLoading(true);
    setError(null);

    try {
      const response = await fetch(TAROBASE_CONFIG.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [user.address],
        }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Failed to fetch balance');
      }

      // Convert lamports to SOL (1 SOL = 1,000,000,000 lamports)
      const balanceInSol = data.result.value / 1_000_000_000;
      setBalance(balanceInSol);
    } catch (err) {
      console.error('Error fetching SOL balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(null);
    } finally {
      setBalanceLoading(false);
    }
  };

  const refetch = () => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTime.current;

    if (timeSinceLastFetch < FETCH_COOLDOWN) {
      // Still in cooldown period, ignore the request
      console.log(
        `Balance refresh on cooldown. Please wait ${Math.ceil((FETCH_COOLDOWN - timeSinceLastFetch) / 1000)} more seconds.`,
      );
      return;
    }

    lastFetchTime.current = now;
    fetchBalance();
  };

  useEffect(() => {
    // Reset cooldown when user changes and fetch immediately
    lastFetchTime.current = 0;
    fetchBalance();
  }, [user?.address]);

  const handleLogin = async (): Promise<void> => {
    try {
      await login();
    } catch (error) {
      console.error('Failed to login', error);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  const getNetworkInfo = () => {
    const chain = TAROBASE_CONFIG.chain;
    const isMainnet = chain === 'solana_mainnet';
    const isSurfnet = chain === 'surfnet';
    return {
      name: isMainnet ? 'Mainnet' : isSurfnet ? 'Surfnet' : 'Devnet',
      dotColor: isMainnet ? 'bg-green-500' : isSurfnet ? 'bg-blue-500' : 'bg-orange-500',
      isMainnet,
    };
  };

  const formatBalance = (bal: number | null) => {
    if (bal === null) return '--';
    return bal.toLocaleString('en-US', {
      minimumFractionDigits: 3,
      maximumFractionDigits: 3,
    });
  };

  const copyAddress = async () => {
    if (user?.address) {
      await navigator.clipboard.writeText(user.address);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    }
  };

  const handleFundWallet = () => {
    if (!user || !user.address || !user.provider) {
      toast.error('No wallet address found');
      return;
    }
    console.log(user);
    if (!user?.provider?.privyMethods?.useFundWalletSolana) {
      toast.error('No provider found');
      return;
    }
    try {
      user!.provider!.privyMethods!.useFundWalletSolana!.fundWallet(user.address);
    } catch (error) {
      console.error('Failed to fund wallet:', error);
      toast.error('Failed to open funding wallet pop-up');
    }
  };

  return (
    <header className='w-full border-b border-border bg-card'>
      <div className='container mx-auto px-4 py-3'>
        <div className='flex justify-between items-center'>
          <Link to='/' className='flex items-center gap-2 text-xl font-semibold hover:opacity-80 transition-opacity'>
            <Bot className='h-6 w-6 text-primary' />
            <span className='text-foreground'>{AppName}</span>
          </Link>

          <div className='flex items-center gap-4'>
            {loading ? (
              <div className='h-9 w-24 rounded animate-pulse bg-muted' />
            ) : user ? (
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-3 px-3 py-2 rounded-lg border bg-card text-card-foreground shadow-sm'>
                  <div className='flex items-center gap-2'>
                    <div className='flex items-center gap-2'>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`h-2 w-2 rounded-full ${getNetworkInfo().dotColor} cursor-default`}
                              style={{
                                animation: 'subtle-pulse 3s ease-in-out infinite',
                              }}
                            />
                          </TooltipTrigger>
                          <TooltipContent side='bottom'>
                            <p>Solana {getNetworkInfo().name}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <Wallet className='h-4 w-4 text-muted-foreground' />
                    </div>
                    <span className='font-medium'>{formatBalance(balance)} SOL</span>
                  </div>
                  <div className='flex items-center gap-1'>
                    {TAROBASE_CONFIG.authMethod === 'privy' && (
                      <button
                        onClick={handleFundWallet}
                        className='p-1 hover:bg-muted rounded transition-colors'
                        title='Fund wallet'
                      >
                        <Plus className='h-3 w-3 text-muted-foreground' />
                      </button>
                    )}
                    <button
                      onClick={refetch}
                      disabled={balanceLoading}
                      className='p-1 hover:bg-muted rounded transition-colors'
                      title='Refresh balance'
                    >
                      <RefreshCw
                        className={`h-3 w-3 text-muted-foreground ${balanceLoading ? 'animate-spin' : ''}`}
                      />
                    </button>
                    <button
                      onClick={copyAddress}
                      className='p-1 hover:bg-muted rounded transition-colors'
                      title='Copy address'
                    >
                      {justCopied ? (
                        <Check className='h-3 w-3 text-muted-foreground' />
                      ) : (
                        <Copy className='h-3 w-3 text-muted-foreground' />
                      )}
                    </button>
                  </div>
                </div>
                <Button variant='outline' onClick={handleLogout}>
                  Disconnect
                </Button>
              </div>
            ) : (
              <Button variant='default' onClick={handleLogin}>
                Connect Wallet
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
