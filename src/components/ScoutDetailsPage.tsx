import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bot,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@pooflabs/web';
import { getScouts, ScoutsResponse } from '@/lib/tarobase';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' },
  },
};

export const ScoutDetailsPage: React.FC = () => {
  const { id: scoutId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [pollingStatus, setPollingStatus] = useState<'pending' | 'running' | 'completed' | 'error' | null>(null);
  const [scout, setScout] = useState<ScoutsResponse | null>(null);
  const [scoutLoading, setScoutLoading] = useState(false);
  const [scoutError, setScoutError] = useState<Error | null>(null);

  // Fetch scout data from Tarobase (one-time fetch)
  useEffect(() => {
    if (!user?.address || !scoutId) return;

    const fetchScout = async () => {
      setScoutLoading(true);
      setScoutError(null);
      try {
        const data = await getScouts(scoutId);
        setScout(data);
        if (!data) {
          setScoutError(new Error('Scout not found'));
        }
      } catch (error) {
        console.error('Error fetching scout:', error);
        setScoutError(error instanceof Error ? error : new Error('Failed to fetch scout'));
      } finally {
        setScoutLoading(false);
      }
    };

    fetchScout();
  }, [user?.address, scoutId]);

  // Poll status API while scout is running
  useEffect(() => {
    if (!scout || !scoutId) return;

    // Update local polling status
    setPollingStatus(scout.status as any);

    // Only poll if status is pending or running
    if (scout.status !== 'pending' && scout.status !== 'running') {
      return;
    }

    const pollInterval = setInterval(async () => {
      try {
        const apiBaseUrl = 'https://69124f9575594657e010563a-api.poof.new';
        const response = await fetch(`${apiBaseUrl}/api/scouts/${scoutId}/status`);

        if (response.ok) {
          const result = await response.json();
          const newStatus = result?.data?.status;

          // Update local state
          if (newStatus) {
            setPollingStatus(newStatus);
          }

          // Re-fetch scout data to get latest updates
          const updatedScout = await getScouts(scoutId);
          if (updatedScout) {
            setScout(updatedScout);
          }

          // Stop polling if completed or error
          if (newStatus === 'completed' || newStatus === 'error') {
            clearInterval(pollInterval);
          }
        }
      } catch (error) {
        console.error('Status polling error:', error);
      }
    }, 4000); // Poll every 4 seconds

    return () => clearInterval(pollInterval);
  }, [scout, scoutId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-300 animate-pulse';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (authLoading || scoutLoading) {
    return (
      <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#f5f0e8]">
        <Loader2 className="h-8 w-8 animate-spin text-[#8b7355]" />
      </div>
    );
  }

  if (scoutError || !scout) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-[#f5f0e8] p-8">
        <div className="container mx-auto max-w-4xl">
          <Button
            onClick={() => navigate('/scout')}
            variant="ghost"
            className="mb-6 text-[#8b7355] hover:text-[#6d5940]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Scouts
          </Button>
          <Card className="border-2 border-red-200 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-6 w-6" />
                Scout Not Found
              </CardTitle>
              <CardDescription className="text-red-600">
                {scoutError?.message || 'Unable to load scout details. The scout may not exist or you may not have access to it.'}
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  const currentStatus = pollingStatus || scout.status;
  const isPendingOrRunning = currentStatus === 'pending' || currentStatus === 'running';
  const isCompleted = currentStatus === 'completed';
  const isError = currentStatus === 'error';

  // Parse screenshots
  let screenshots: string[] = [];
  if (scout.screenshots) {
    try {
      screenshots = JSON.parse(scout.screenshots);
    } catch (error) {
      console.error('Failed to parse screenshots:', error);
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="min-h-[calc(100vh-80px)] bg-[#f5f0e8] p-8"
    >
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Button
            onClick={() => navigate('/scout')}
            variant="ghost"
            className="text-[#8b7355] hover:text-[#6d5940]"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Scouts
          </Button>
        </div>

        {/* Scout Info Card */}
        <Card className="mb-6 border-2 border-[#d4c5b3] bg-white shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <Bot className="h-6 w-6 text-[#8b7355]" />
                  <CardTitle className="text-2xl text-[#3d3020]">{scout.name}</CardTitle>
                </div>
                <Badge className={`${getStatusColor(currentStatus)} border`}>
                  {currentStatus}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-[#6d5940] mb-2">Instructions:</h3>
              <p className="text-[#3d3020] bg-[#f9f6f1] p-3 rounded-lg border border-[#e8dfd0]">
                {scout.instructions}
              </p>
            </div>
            {scout.resultAction && (
              <div>
                <h3 className="text-sm font-semibold text-[#6d5940] mb-2">Result Action:</h3>
                <p className="text-[#3d3020] bg-[#f9f6f1] p-3 rounded-lg border border-[#e8dfd0]">
                  {scout.resultAction}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Browser View (for pending/running) */}
        {isPendingOrRunning && scout.liveUrl && (
          <Card className="mb-6 border-2 border-[#d4c5b3] bg-white shadow-lg overflow-hidden">
            <CardHeader className="bg-[#f9f6f1] border-b border-[#d4c5b3]">
              <CardTitle className="text-lg flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-[#8b7355]" />
                Live Browser Session
              </CardTitle>
              <CardDescription className="text-[#6d5940]">
                Your scout is browsing the web in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 relative">
              {/* Top overlay to hide browser chrome */}
              <div className="absolute top-0 left-0 right-0 h-20 bg-[#f5f0e8] z-10 border-b-2 border-[#d4c5b3]" />

              {/* iframe with interaction disabled */}
              <div className="relative" style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}>
                <iframe
                  src={scout.liveUrl}
                  className="w-full h-full border-0"
                  style={{
                    pointerEvents: 'none',
                    userSelect: 'none',
                  }}
                  title="Live Browser Session"
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed Result */}
        {isCompleted && (
          <Card className="mb-6 border-2 border-green-300 bg-green-50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-green-800 flex items-center gap-2">
                <CheckCircle className="h-6 w-6" />
                Scout Completed Successfully
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {scout.result && (
                <div>
                  <h3 className="text-sm font-semibold text-green-900 mb-3">Result:</h3>
                  <div className="bg-white p-4 rounded-lg border border-green-300">
                    <p className="text-green-900 whitespace-pre-wrap">{scout.result}</p>
                  </div>
                </div>
              )}

              {screenshots.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Screenshots ({screenshots.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {screenshots.map((url, index) => (
                      <div
                        key={index}
                        className="bg-white p-2 rounded-lg border border-green-300 hover:border-green-400 transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-auto rounded"
                          loading="lazy"
                        />
                        <p className="text-xs text-green-700 mt-2 text-center">
                          Screenshot {index + 1}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {isError && (
          <Card className="mb-6 border-2 border-red-300 bg-red-50 shadow-lg">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertCircle className="h-6 w-6" />
                Scout Encountered an Error
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {scout.error && (
                <div>
                  <h3 className="text-sm font-semibold text-red-900 mb-3">Error Details:</h3>
                  <div className="bg-white p-4 rounded-lg border border-red-300">
                    <p className="text-red-900 whitespace-pre-wrap">{scout.error}</p>
                  </div>
                </div>
              )}

              {screenshots.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Screenshots ({screenshots.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {screenshots.map((url, index) => (
                      <div
                        key={index}
                        className="bg-white p-2 rounded-lg border border-red-300 hover:border-red-400 transition-colors"
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-auto rounded"
                          loading="lazy"
                        />
                        <p className="text-xs text-red-700 mt-2 text-center">
                          Screenshot {index + 1}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <Card className="border-2 border-[#d4c5b3] bg-white shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg text-[#3d3020]">Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-[#6d5940]">
            {scout.startedAt && (
              <div className="flex justify-between">
                <span className="font-semibold">Started:</span>
                <span>{new Date(scout.startedAt * 1000).toLocaleString()}</span>
              </div>
            )}
            {scout.completedAt && (
              <div className="flex justify-between">
                <span className="font-semibold">Completed:</span>
                <span>{new Date(scout.completedAt * 1000).toLocaleString()}</span>
              </div>
            )}
            {scout.startedAt && scout.completedAt && (
              <div className="flex justify-between pt-2 border-t border-[#d4c5b3]">
                <span className="font-semibold">Duration:</span>
                <span>
                  {Math.round((scout.completedAt - scout.startedAt) / 60)} minutes
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default ScoutDetailsPage;
