import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ArrowLeft, DollarSign, CheckCircle2, Code2, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { API_URL } from '@/lib/constants';

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: 'easeOut' }
  },
};

export const DocsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial='hidden'
      animate='visible'
      variants={fadeIn}
      className='min-h-[calc(100vh-80px)] py-12'
    >
      <div className='container mx-auto px-4'>
        <div className='max-w-4xl mx-auto'>
          {/* Header */}
          <div className='text-center mb-12'>
            <div className='flex justify-center mb-6'>
              <div className='p-6 bg-primary/10 rounded-full'>
                <BookOpen className='h-16 w-16 text-primary' />
              </div>
            </div>
            <h1 className='text-5xl font-bold text-foreground mb-4'>
              Scout API Documentation
            </h1>
            <p className='text-xl text-muted-foreground'>
              Create and monitor AI web scouts with x402 pay-per-use endpoints
            </p>
          </div>

          {/* MCP Integration Section */}
          <section className='mb-12 p-8 bg-card border border-border rounded-lg'>
            <div className='flex items-center gap-3 mb-6'>
              <Zap className='h-8 w-8 text-primary' />
              <h2 className='text-3xl font-bold text-foreground'>MCP Integration</h2>
            </div>
            <p className='text-lg text-muted-foreground mb-4'>
              You can use this API as a Model Context Protocol (MCP) server in any x402-enabled agent client.
            </p>
            <div className='bg-muted p-6 rounded-lg'>
              <p className='text-sm text-muted-foreground mb-2 font-semibold'>MCP Endpoint:</p>
              <code className='text-lg font-mono bg-background px-4 py-2 rounded block border border-border'>
                {API_URL}/mcp
              </code>
            </div>
            <p className='text-sm text-muted-foreground mt-4'>
              This allows AI agents to programmatically create and monitor web scouts with automated payment handling.
            </p>
          </section>

          {/* API Endpoints Section */}
          <section className='mb-12'>
            <h2 className='text-3xl font-bold text-foreground mb-8 flex items-center gap-3'>
              <Code2 className='h-8 w-8 text-primary' />
              API Endpoints
            </h2>

            {/* Create Scout Endpoint */}
            <div className='mb-8 p-8 bg-card border border-border rounded-lg'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-2xl font-bold text-foreground'>Create Scout</h3>
                <span className='px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold flex items-center gap-2'>
                  <DollarSign className='h-4 w-4' />
                  $0.15 $CASH
                </span>
              </div>

              <div className='space-y-4'>
                <div>
                  <span className='font-mono text-sm bg-blue-500/10 text-blue-400 px-2 py-1 rounded mr-2'>POST</span>
                  <code className='font-mono text-muted-foreground'>/api/scouts/create</code>
                </div>

                <div>
                  <p className='text-sm font-semibold text-foreground mb-2'>Authentication:</p>
                  <p className='text-sm text-muted-foreground'>Requires x402 payment ($0.15 $CASH on Solana)</p>
                </div>

                <div>
                  <p className='text-sm font-semibold text-foreground mb-2'>Headers:</p>
                  <pre className='bg-muted p-4 rounded-lg overflow-x-auto text-sm'>
{`Content-Type: application/json
X-Wallet-Address: <your-wallet-address>`}
                  </pre>
                </div>

                <div>
                  <p className='text-sm font-semibold text-foreground mb-2'>Request Body:</p>
                  <pre className='bg-muted p-4 rounded-lg overflow-x-auto text-sm'>
{`{
  "name": "Scout Name",
  "instructions": "Task instructions for the scout",
  "resultAction": "Optional action to take after completion"
}`}
                  </pre>
                </div>

                <div>
                  <p className='text-sm font-semibold text-foreground mb-2'>Response (200 OK):</p>
                  <pre className='bg-muted p-4 rounded-lg overflow-x-auto text-sm'>
{`{
  "success": true,
  "data": {
    "scoutId": "550e8400-e29b-41d4-a716-446655440000",
    "sessionId": "session-123",
    "liveUrl": "https://example.com/live/session-123",
    "status": "pending",
    "createdAt": "2025-11-11T12:00:00Z",
    "name": "Scout Name",
    "instructions": "Task instructions"
  }
}`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Get Scout Status Endpoint */}
            <div className='mb-8 p-8 bg-card border border-border rounded-lg'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-2xl font-bold text-foreground'>Get Scout Status</h3>
                <span className='px-3 py-1 bg-green-500/10 text-green-400 rounded-full text-sm font-semibold flex items-center gap-2'>
                  <CheckCircle2 className='h-4 w-4' />
                  Free
                </span>
              </div>

              <div className='space-y-4'>
                <div>
                  <span className='font-mono text-sm bg-green-500/10 text-green-400 px-2 py-1 rounded mr-2'>GET</span>
                  <code className='font-mono text-muted-foreground'>/api/scouts/:scoutId/status</code>
                </div>

                <div>
                  <p className='text-sm font-semibold text-foreground mb-2'>Authentication:</p>
                  <p className='text-sm text-muted-foreground'>None required (public endpoint)</p>
                </div>

                <div>
                  <p className='text-sm font-semibold text-foreground mb-2'>Path Parameters:</p>
                  <pre className='bg-muted p-4 rounded-lg overflow-x-auto text-sm'>
{`scoutId: string (UUID of the scout)`}
                  </pre>
                </div>

                <div>
                  <p className='text-sm font-semibold text-foreground mb-2'>Response (200 OK):</p>
                  <pre className='bg-muted p-4 rounded-lg overflow-x-auto text-sm'>
{`{
  "success": true,
  "data": {
    "scoutId": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "result": "Task completed successfully with details...",
    "screenshots": [
      "https://screenshot-url-1.png",
      "https://screenshot-url-2.png"
    ],
    "createdAt": "2025-11-11T12:00:00Z",
    "completedAt": "2025-11-11T12:05:00Z"
  }
}`}
                  </pre>
                </div>

                <div>
                  <p className='text-sm font-semibold text-foreground mb-2'>Status Values:</p>
                  <ul className='list-disc list-inside text-sm text-muted-foreground space-y-1'>
                    <li><code className='font-mono bg-muted px-1'>pending</code> - Scout is queued</li>
                    <li><code className='font-mono bg-muted px-1'>running</code> - Scout is actively working</li>
                    <li><code className='font-mono bg-muted px-1'>completed</code> - Scout finished successfully</li>
                    <li><code className='font-mono bg-muted px-1'>failed</code> - Scout encountered an error</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Usage Instructions */}
          <section className='mb-12 p-8 bg-card border border-border rounded-lg'>
            <h2 className='text-3xl font-bold text-foreground mb-6'>Usage Instructions</h2>

            <div className='space-y-6'>
              <div>
                <h3 className='text-xl font-semibold text-foreground mb-3'>1. Calling x402 Protected Endpoints</h3>
                <p className='text-muted-foreground mb-2'>
                  When calling the <code className='font-mono bg-muted px-1'>/api/scouts/create</code> endpoint, the x402 protocol will:
                </p>
                <ul className='list-disc list-inside text-muted-foreground space-y-1 ml-4'>
                  <li>Return a 402 Payment Required response with payment details</li>
                  <li>Include a Solana transaction to transfer $0.15 $CASH</li>
                  <li>Require your client to sign and submit the transaction</li>
                  <li>Automatically retry the request after payment confirmation</li>
                </ul>
              </div>

              <div>
                <h3 className='text-xl font-semibold text-foreground mb-3'>2. Payment Flow</h3>
                <ol className='list-decimal list-inside text-muted-foreground space-y-2 ml-4'>
                  <li>Make POST request to <code className='font-mono bg-muted px-1'>/api/scouts/create</code></li>
                  <li>Receive 402 response with payment transaction</li>
                  <li>Sign transaction with your Solana wallet</li>
                  <li>Submit transaction to Solana network</li>
                  <li>x402 client automatically retries original request</li>
                  <li>Receive scout creation response</li>
                </ol>
              </div>

              <div>
                <h3 className='text-xl font-semibold text-foreground mb-3'>3. Polling for Status</h3>
                <p className='text-muted-foreground mb-2'>
                  After creating a scout, poll the status endpoint to check progress:
                </p>
                <pre className='bg-muted p-4 rounded-lg overflow-x-auto text-sm'>
{`// Poll every 5 seconds
const pollStatus = async (scoutId) => {
  const response = await fetch(
    \`${API_URL}/api/scouts/\${scoutId}/status\`
  );
  const data = await response.json();

  if (data.data.status === 'completed') {
    console.log('Result:', data.data.result);
    return data.data;
  } else if (data.data.status === 'failed') {
    console.error('Scout failed');
    return null;
  }

  // Continue polling
  await new Promise(resolve => setTimeout(resolve, 5000));
  return pollStatus(scoutId);
};`}
                </pre>
              </div>

              <div>
                <h3 className='text-xl font-semibold text-foreground mb-3'>4. Example Workflow</h3>
                <pre className='bg-muted p-4 rounded-lg overflow-x-auto text-sm'>
{`// Step 1: Create scout (requires x402 payment)
const createResponse = await fetch('${API_URL}/api/scouts/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Wallet-Address': walletAddress
  },
  body: JSON.stringify({
    name: 'Weather Scout',
    instructions: 'Check current weather in San Francisco',
    resultAction: 'send_to_webhook'
  })
});

const { data: scout } = await createResponse.json();
console.log('Scout created:', scout.scoutId);

// Step 2: Poll for completion
const result = await pollStatus(scout.scoutId);
console.log('Final result:', result.result);
console.log('Screenshots:', result.screenshots);`}
                </pre>
              </div>
            </div>
          </section>

          {/* Back Button */}
          <div className='flex justify-center'>
            <Button
              onClick={() => navigate('/')}
              variant='outline'
              size='lg'
            >
              <ArrowLeft className='mr-2 h-5 w-5' />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DocsPage;
