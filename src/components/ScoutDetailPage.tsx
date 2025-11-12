import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Pencil,
  Save,
  X,
  Play,
  StopCircle,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '@pooflabs/web';
import { useTarobaseData } from '@/hooks/use-tarobase-data';
import {
  subscribeScouts,
  subscribeManyRuns,
  updateScouts,
  ScoutsResponse,
  RunsResponse,
} from '@/lib/tarobase';
import { wrap } from '@faremeter/fetch';
import { createPaymentHandler } from '@faremeter/payment-solana/exact';
import { signTransaction, getConfig } from '@pooflabs/web';
import { PublicKey, Connection, VersionedTransaction } from '@solana/web3.js';
import { getPartyServerHttpUrl } from '@/lib/config';
import { PAYMENT_HANDLER_TOKEN } from '@/lib/constants';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const ScoutDetailPage: React.FC = () => {
  const { scoutId } = useParams<{ scoutId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    description: '',
    resultAction: '',
  });
  const [isRunning, setIsRunning] = useState(false);

  const { data: scout, loading: scoutLoading, error: scoutError } = useTarobaseData<ScoutsResponse | null>(subscribeScouts, !!scoutId, scoutId || '');

  const { data: runs, loading: runsLoading } = useTarobaseData<RunsResponse[]>(
    subscribeManyRuns,
    !!scoutId,
    "where scoutId == \"" + scoutId + "\" order by tarobase_created_at desc"
  );

  React.useEffect(() => {
    if (!scoutLoading && !scout && scoutId) {
      toast.error('Scout not found');
      navigate('/scout');
    }
  }, [scout, scoutLoading, scoutId, navigate]);

  React.useEffect(() => {
    if (scout) {
      setEditData({
        name: scout.name || '',
        description: scout.description || '',
        resultAction: '',
      });
    }
  }, [scout]);

  const handleEditToggle = () => {
    if (isEditing && scout) {
      setEditData({
        name: scout.name || '',
        description: scout.description || '',
        resultAction: '',
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSaveEdit = async () => {
    if (!scout || !scoutId) return;

    try {
      const success = await updateScouts(scoutId, {
        name: editData.name,
        description: editData.description,
      });

      if (success) {
        toast.success('Scout updated successfully');
        setIsEditing(false);
      } else {
        toast.error('Failed to update scout');
      }
    } catch (error) {
      console.error('Error updating scout:', error);
      toast.error('Failed to update scout');
    }
  };

  const handleRunScout = async () => {
    if (!user || !scoutId) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsRunning(true);

    try {
      const config = await getConfig();
      const network = config.chain === 'solana_mainnet' ? 'mainnet-beta' : 'devnet';
      const connection = new Connection(config.rpcUrl);
      const paymentTokenMint = new PublicKey(PAYMENT_HANDLER_TOKEN);

      const wallet = {
        network,
        publicKey: new PublicKey(user.address),
        updateTransaction: async (tx: VersionedTransaction) => {
          await signTransaction(tx);
          return tx;
        },
      };

      const paymentHandler = createPaymentHandler(wallet, paymentTokenMint, connection);
      const fetchWithPayer = wrap(fetch, { handlers: [paymentHandler] });

      toast.loading('Processing payment...');

      const apiUrl = getPartyServerHttpUrl("/api/scouts/" + scoutId + "/run");
      const response = await fetchWithPayer(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      toast.dismiss();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || "API error: " + response.status);
      }

      await response.json();
      toast.success('Scout run started successfully!');
    } catch (error) {
      console.error('Scout run error:', error);
      toast.dismiss();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast.error("Failed to run scout: " + errorMessage);
    } finally {
      setIsRunning(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const formatRelativeTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = Date.now();
    const diff = now - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return days + " day" + (days > 1 ? 's' : '') + " ago";
    if (hours > 0) return hours + " hour" + (hours > 1 ? 's' : '') + " ago";
    if (minutes > 0) return minutes + " minute" + (minutes > 1 ? 's' : '') + " ago";
    return 'Just now';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/40';
      case 'running':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/40';
      case 'completed':
        return 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/40';
      case 'error':
        return 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40';
      case 'paused':
        return 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/40';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const currentRun = runs?.find((run) => run.status === 'running' || run.status === 'pending');
  const lastCompletedRun = runs?.find((run) => run.status === 'completed' || run.status === 'error');
  const previousRuns = runs?.filter(
    (run) => run.status !== 'running' && run.status !== 'pending',
  );

  if (scoutLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (scoutError || !scout) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
          <p className="text-lg text-muted-foreground">Scout not found</p>
          <Button onClick={() => navigate('/scout')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Scouts
          </Button>
        </div>
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
        <Button
          variant="ghost"
          onClick={() => navigate('/scout')}
          className="mb-6 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Scouts
        </Button>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Scout Name</Label>
                      <Input
                        id="name"
                        value={editData.name}
                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                        placeholder="Scout name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Instructions</Label>
                      <Textarea
                        id="description"
                        value={editData.description}
                        onChange={(e) =>
                          setEditData({ ...editData, description: e.target.value })
                        }
                        placeholder="What should your scout do?"
                        rows={4}
                        className="resize-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveEdit} size="sm">
                        <Save className="mr-2 h-4 w-4" />
                        Save
                      </Button>
                      <Button onClick={handleEditToggle} size="sm" variant="outline">
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      <CardTitle className="text-3xl">{scout.name}</CardTitle>
                      <Badge className={getStatusColor(scout.status)}>{scout.status}</Badge>
                    </div>
                    <div className="space-y-3 mt-4">
                      <div>
                        <Label className="text-muted-foreground text-sm">Instructions</Label>
                        <p className="text-foreground mt-1">
                          {scout.description || 'No instructions provided'}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {formatTimestamp(scout.tarobase_created_at)}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {!isEditing && (
                <Button onClick={handleEditToggle} size="sm" variant="outline">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>

        <Card className="mb-8 border-2 border-primary/30 shadow-lg bg-primary/5">
          <CardHeader>
            <CardTitle className="text-2xl">Current Run</CardTitle>
            <CardDescription>Latest execution status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentRun ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className={"text-base px-3 py-1 " + getStatusColor(currentRun.status)}>
                    <span className="flex items-center gap-2">
                      {getStatusIcon(currentRun.status)}
                      {currentRun.status}
                    </span>
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Started {formatRelativeTime(currentRun.startedAt)}</span>
                  </div>
                  <p className="text-foreground">
                    {currentRun.status === 'pending'
                      ? 'Scout is queued and will start shortly...'
                      : 'Scout is currently running...'}
                  </p>
                </div>
                <Button disabled variant="outline" className="w-full sm:w-auto">
                  <StopCircle className="mr-2 h-4 w-4" />
                  Stop Run (Coming Soon)
                </Button>
              </div>
            ) : lastCompletedRun ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge className={"text-base px-3 py-1 " + getStatusColor(lastCompletedRun.status)}>
                    <span className="flex items-center gap-2">
                      {getStatusIcon(lastCompletedRun.status)}
                      {lastCompletedRun.status}
                    </span>
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Completed {lastCompletedRun?.completedAt ? formatRelativeTime(lastCompletedRun.completedAt) : 'recently'}
                    </span>
                  </div>
                  {lastCompletedRun.status === 'completed' && lastCompletedRun.result && (
                    <div className="p-4 bg-card rounded-lg border">
                      <Label className="text-sm text-muted-foreground mb-2">Result</Label>
                      <p className="text-foreground whitespace-pre-wrap">
                        {lastCompletedRun.result}
                      </p>
                    </div>
                  )}
                  {lastCompletedRun.status === 'error' && lastCompletedRun.error && (
                    <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/30">
                      <Label className="text-sm text-destructive mb-2">Error</Label>
                      <p className="text-foreground whitespace-pre-wrap">
                        {lastCompletedRun.error}
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleRunScout}
                  disabled={isRunning}
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Starting scout...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Run Again ($0.15 $CASH)
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-6">
                  This scout has not been run yet. Click the button below to start your first run.
                </p>
                <Button
                  onClick={handleRunScout}
                  disabled={isRunning}
                  size="lg"
                  className="text-lg px-8 py-6"
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                      Starting scout...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-6 w-6" />
                      Run Scout ($0.15 $CASH)
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Previous Runs</CardTitle>
            <CardDescription>Historical execution records</CardDescription>
          </CardHeader>
          <CardContent>
            {runsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !previousRuns || previousRuns.length === 0 ? (
              <div className="text-center py-12">
                <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No previous runs yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {previousRuns.slice(0, 10).map((run) => (
                  <div
                    key={run.id}
                    className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(run.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(run.status)}
                              {run.status}
                            </span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(run.startedAt)}
                          </span>
                        </div>

                        {run.status === 'completed' && run.result && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {run.result}
                          </p>
                        )}

                        {run.status === 'error' && run.error && (
                          <p className="text-sm text-destructive line-clamp-2">{run.error}</p>
                        )}

                        {run?.completedAt && (
                          <p className="text-xs text-muted-foreground">
                            Duration:{' '}
                            {Math.round((run.completedAt - run.startedAt) / 1000)} seconds
                          </p>
                        )}
                      </div>

                      <Button variant="outline" size="sm" disabled>
                        <Eye className="mr-2 h-4 w-4" />
                        Details
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default ScoutDetailPage;
