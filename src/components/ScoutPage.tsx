import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  Bot,
  Loader2,
  CheckCircle,
  RefreshCw,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useAuth, signTransaction, getConfig } from '@pooflabs/web';
import { getManyScouts, ScoutsResponse } from '@/lib/tarobase';
import { createAuthenticatedApiClient } from '@/lib/api-client';
import { createPaymentHandler } from '@faremeter/payment-solana/exact';
import { wrap } from '@faremeter/fetch';
import { PublicKey, Connection, VersionedTransaction } from '@solana/web3.js';
import { getPartyServerHttpUrl } from '@/lib/config';
import { API_URL, PAYMENT_HANDLER_TOKEN } from '@/lib/constants';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const ScoutPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    instructions: '',
    resultAction: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshingScouts, setRefreshingScouts] = useState<Set<string>>(new Set());
  const [scouts, setScouts] = useState<ScoutsResponse[]>([]);
  const [scoutsLoading, setScoutsLoading] = useState(false);
  const [scoutsError, setScoutsError] = useState<Error | null>(null);
  const [isAddMcpDialogOpen, setIsAddMcpDialogOpen] = useState(false);
  const [newMcpUrl, setNewMcpUrl] = useState('');

  // Fetch user's scouts from Tarobase (one-time fetch)
  useEffect(() => {
    if (!user?.address) return;

    const fetchScouts = async () => {
      setScoutsLoading(true);
      setScoutsError(null);
      try {
        const data = await getManyScouts(`where userId == "${user.address}"`);
        setScouts(data || []);
      } catch (error) {
        console.error('Error fetching scouts:', error);
        setScoutsError(error instanceof Error ? error : new Error('Failed to fetch scouts'));
      } finally {
        setScoutsLoading(false);
      }
    };

    fetchScouts();
  }, [user?.address]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!formData.name || !formData.instructions) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    const loadingToast = toast.loading('Processing payment...');

    try {
      // Get config and setup connection
      const config = await getConfig();
      const connection = new Connection(config.rpcUrl);
      const network = config.chain === 'solana_mainnet' ? 'mainnet-beta' : 'devnet';

      // Get payment token mint
      const paymentTokenMint = new PublicKey(PAYMENT_HANDLER_TOKEN);

      // Create wallet interface
      const wallet = {
        network,
        publicKey: new PublicKey(user.address),
        updateTransaction: async (tx: VersionedTransaction) => {
          return signTransaction(tx);
        },
      };

      // Create payment handler and wrap fetch
      const paymentHandler = createPaymentHandler(wallet, paymentTokenMint, connection);
      const fetchWithPayer = wrap(fetch, { handlers: [paymentHandler] });

      // Update toast
      toast.loading('Launching scout...', { id: loadingToast });

      // Call API with payment
      const response = await fetchWithPayer(`${API_URL}/api/scouts/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.idToken}`,
          'X-Wallet-Address': user.address,
        },
        body: JSON.stringify({
          name: formData.name,
          instructions: formData.instructions,
          resultAction: formData.resultAction || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.error?.message || 'Failed to create scout');
      }

      const result = await response.json();

      // Show success and redirect to details page
      const scoutData = result?.data;
      const scoutId = scoutData?.scoutId;

      if (scoutId) {
        toast.success('Scout launched successfully! Redirecting to details...', { id: loadingToast });

        // Clear form
        setFormData({
          name: '',
          instructions: '',
          resultAction: '',
        });

        // Redirect to scout details page
        navigate(`/scout/${scoutId}`);
      } else {
        toast.success('Scout launched successfully!', { id: loadingToast });

        // Clear form
        setFormData({
          name: '',
          instructions: '',
          resultAction: '',
        });
      }
    } catch (error) {
      console.error('Scout creation error:', error);
      toast.error(`Failed to create scout: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        id: loadingToast,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefreshStatus = async (scoutId: string, isAutoRefresh = false) => {
    if (!user) return;

    // Track refreshing state
    setRefreshingScouts((prev) => new Set(prev).add(scoutId));

    try {
      const apiClient = createAuthenticatedApiClient({
        token: user.idToken,
        walletAddress: user.address,
      });

      const response = await apiClient.scoutStatus(scoutId);

      // Show toast only if manual refresh
      if (!isAutoRefresh) {
        const statusMsg =
          response.status === 'completed'
            ? 'Scout completed!'
            : response.status === 'error'
            ? 'Scout encountered an error'
            : `Scout status: ${response.status}`;
        toast.success(statusMsg);
      }

      // Re-fetch scouts to get latest data
      const data = await getManyScouts(`where userId == "${user.address}"`);
      setScouts(data || []);
    } catch (error) {
      console.error('Status refresh error:', error);
      if (!isAutoRefresh) {
        toast.error(`Failed to refresh status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setRefreshingScouts((prev) => {
        const next = new Set(prev);
        next.delete(scoutId);
        return next;
      });
    }
  };

  const handleAddMcp = () => {
    toast.info('Coming soon');
    setIsAddMcpDialogOpen(false);
    setNewMcpUrl('');
  };


  // Auto-polling for active scouts
  useEffect(() => {
    if (!scouts || scouts.length === 0 || !user) return;

    const activeScouts = scouts.filter((s) => s.status === 'pending' || s.status === 'running');

    if (activeScouts.length === 0) return;

    const interval = setInterval(() => {
      activeScouts.forEach((scout) => {
        handleRefreshStatus(scout.id, true);
      });
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [scouts, user]);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000); // Convert seconds to milliseconds
    const now = Date.now();
    const diff = now - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      case 'running':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 animate-pulse';
      case 'completed':
        return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'error':
        return 'bg-red-500/20 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const renderActionSection = (scout: ScoutsResponse) => {
    const status = scout.status;
    const isRefreshing = refreshingScouts.has(scout.id);

    // All scouts: Show "View Details" button that links to details page
    return (
      <div className="flex items-center gap-2">
        <Link to={`/scout/${scout.id}`}>
          <Button variant="default" size="sm" className="flex items-center gap-2">
            View Details
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>

        {/* Show refresh button only for active scouts */}
        {(status === 'pending' || status === 'running') && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleRefreshStatus(scout.id, false);
            }}
            variant="outline"
            size="sm"
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        )}
      </div>
    );
  };

  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="min-h-[calc(100vh-80px)]"
    >
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-primary/10 rounded-full">
            <Bot className="h-10 w-10 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold text-foreground">Scout</h1>
            <p className="text-muted-foreground">Create and manage your autonomous scouts</p>
          </div>
        </div>

        {!user ? (
          <Card>
            <CardHeader>
              <CardTitle>Connect Wallet</CardTitle>
              <CardDescription>
                Please connect your wallet to create and manage scouts
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            {/* Scout Creation Form */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Create New Scout</CardTitle>
                <CardDescription>
                  Define a scout to browse the web for you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Task Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="e.g., Amazon Price Monitor"
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="instructions">What website should your Scout visit? *</Label>
                    <Textarea
                      id="instructions"
                      name="instructions"
                      placeholder="e.g., Browse to Amazon and search for wireless headphones under $100"
                      value={formData.instructions}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      required
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resultAction">
                      What should your scout do with the result?{' '}
                      <span className="text-muted-foreground">(Leave blank if nothing)</span>
                    </Label>
                    <Textarea
                      id="resultAction"
                      name="resultAction"
                      placeholder="e.g., Send me an email with the top 3 results"
                      value={formData.resultAction}
                      onChange={handleInputChange}
                      disabled={isSubmitting}
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  {/* Enabled x402 APIs Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Enabled x402 APIs</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddMcpDialogOpen(true)}
                        disabled={isSubmitting}
                        className="flex items-center gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        Add MCP
                      </Button>
                    </div>

                    {/* Default MCP */}
                    <div className="p-4 border rounded-lg bg-primary/5 hover:bg-primary/10 transition-colors">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground">x402 Email MCP</p>
                          </div>
                          <p className="text-sm text-muted-foreground break-all mt-1">
                            https://6912ea0975594657e0105644-api.poof.new/mcp
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Launching scout...
                      </>
                    ) : (
                      <>
                        <Bot className="mr-2 h-5 w-5" />
                        Launch Scout ($0.15 $CASH)
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* My Scouts Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle>My Scouts</CardTitle>
                <CardDescription>View and manage your active scouts</CardDescription>
              </CardHeader>
              <CardContent>
                {scoutsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : scoutsError ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-destructive">Error loading scouts: {scoutsError.message}</p>
                  </div>
                ) : !scouts || scouts.length === 0 ? (
                  <div className="text-center py-12">
                    <Bot className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <p className="text-lg text-muted-foreground">
                      No scouts yet. Create your first scout above!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {scouts.map((scout) => (
                      <motion.div
                        key={scout.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                      >
                        <div className="flex flex-col gap-4">
                          {/* Header Section */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-xl font-bold">{scout.name}</h3>
                                <Badge className={getStatusColor(scout.status)}>
                                  {scout.status}
                                </Badge>
                              </div>

                              <p className="text-sm text-muted-foreground">
                                {scout.instructions}
                              </p>

                              {scout.resultAction && (
                                <div className="flex items-start gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium">Result action:</span> {scout.resultAction}
                                  </p>
                                </div>
                              )}

                              <p className="text-xs text-muted-foreground">
                                Created {formatTimestamp(scout.tarobase_created_at)}
                              </p>
                            </div>
                          </div>

                          {/* Action Section */}
                          <div className="pt-2 border-t">
                            {renderActionSection(scout)}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Add MCP Dialog */}
      <Dialog open={isAddMcpDialogOpen} onOpenChange={setIsAddMcpDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add x402 MCP</DialogTitle>
            <DialogDescription>
              Enter the URL of the x402 MCP you want to add
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="mcpUrl">MCP URL</Label>
              <Input
                id="mcpUrl"
                placeholder="https://example.com/mcp"
                value={newMcpUrl}
                onChange={(e) => setNewMcpUrl(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddMcpDialogOpen(false);
                setNewMcpUrl('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddMcp}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default ScoutPage;
