import { useState } from 'react';
import { Shield, ChevronLeft, CheckCircle, XCircle, Copy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface ProvablyFairPageProps {
  onBack?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  prefill?: { serverSeed?: string; clientSeed?: string; nonce?: number };
  inline?: boolean;
}

interface VerifyResult {
  serverSeedHash: string;
  result: Record<string, unknown>;
  valid: boolean;
}


export function ProvablyFairPage({ onBack, isOpen, onClose, prefill, inline }: ProvablyFairPageProps) {
  const handleBack = onBack || onClose || (() => {});
  const [game, setGame] = useState<'slots' | 'roulette' | 'blackjack'>('slots');
  const [serverSeed, setServerSeed] = useState(prefill?.serverSeed || '');
  const [clientSeed, setClientSeed] = useState(prefill?.clientSeed || '');
  const [nonce, setNonce] = useState(prefill?.nonce !== undefined ? String(prefill.nonce) : '1');
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (val: string, key: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const handleVerify = async () => {
    setError('');
    setVerifyResult(null);
    if (!serverSeed.trim() || !clientSeed.trim() || !nonce) {
      setError('Please fill in all fields.');
      return;
    }
    const nonceNum = parseInt(nonce);
    if (isNaN(nonceNum) || nonceNum < 0) {
      setError('Nonce must be a non-negative integer.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/provably-fair/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game, serverSeed: serverSeed.trim(), clientSeed: clientSeed.trim(), nonce: nonceNum }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setVerifyResult(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!verifyResult) return null;
    const { result } = verifyResult;
    return (
      <div className="mt-4 p-4 rounded-xl border border-green-500/30 bg-green-500/10">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <span className="font-bold text-green-400">Verification Successful</span>
        </div>
        <div className="text-xs text-gray-400 mb-2">Server Seed Hash (verify this matches what was shown before the round):</div>
        <div className="flex items-center gap-2 mb-3">
          <code className="text-xs text-[#D4AF37] break-all flex-1 bg-black/40 p-2 rounded">{verifyResult.serverSeedHash}</code>
          <button onClick={() => copyToClipboard(verifyResult.serverSeedHash, 'hash')} className="text-gray-500 hover:text-white">
            {copied === 'hash' ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
        <div className="text-xs text-gray-400 mb-2">Reproduced game result:</div>
        <pre className="text-xs text-white bg-black/40 p-3 rounded overflow-auto max-h-40">
          {JSON.stringify(result, null, 2)}
        </pre>
      </div>
    );
  };

  const cardClass = "bg-[#1a1a1a] border border-[#333] rounded-xl p-5";

  const toolContent = (
    <>
      {!inline && (
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30">
            <Shield className="w-7 h-7 text-[#D4AF37]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#D4AF37]">Provably Fair</h1>
            <p className="text-sm text-gray-400">Cryptographic game verification — every result is independently verifiable</p>
          </div>
        </div>
      )}

      {!inline && (
        <div className={`${cardClass} mb-6`}>
          <h2 className="font-bold text-lg mb-4">How It Works</h2>
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs flex items-center justify-center font-bold">1</span>
              <span>Before each round, the server generates a <strong className="text-white">Server Seed</strong> and sends you only its <strong className="text-white">SHA-256 hash</strong>. This commits the server to a specific outcome without revealing it.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs flex items-center justify-center font-bold">2</span>
              <span>Your browser provides a <strong className="text-white">Client Seed</strong> (random, generated locally) and a <strong className="text-white">Nonce</strong> (increments each round). These are combined with the server seed to produce the outcome.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs flex items-center justify-center font-bold">3</span>
              <span>The outcome is derived using <strong className="text-white">HMAC-SHA256(serverSeed, clientSeed:nonce)</strong>. This is a one-way function — the server cannot change the outcome after committing to the hash.</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] text-xs flex items-center justify-center font-bold">4</span>
              <span>After the round, the <strong className="text-white">unhashed server seed is revealed</strong>. You can verify: (a) SHA-256(serverSeed) matches the hash shown before the round, and (b) the outcome is reproduced by the formula above.</span>
            </li>
          </ol>
        </div>
      )}

      <div className={`${cardClass} mb-6`}>
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#D4AF37]" />
          Verification Tool
        </h2>

        <div className="grid gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Game Type</label>
            <div className="flex gap-2">
              {(['slots', 'roulette', 'blackjack'] as const).map(g => (
                <button
                  key={g}
                  onClick={() => setGame(g)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                    game === g
                      ? 'bg-[#D4AF37] text-black'
                      : 'bg-[#222] text-gray-300 hover:bg-[#333]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Server Seed (revealed after round)</label>
            <input
              type="text"
              value={serverSeed}
              onChange={e => setServerSeed(e.target.value)}
              placeholder="Paste the revealed server seed here"
              className="w-full bg-black/50 border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Client Seed</label>
            <input
              type="text"
              value={clientSeed}
              onChange={e => setClientSeed(e.target.value)}
              placeholder="The client seed used for that round"
              className="w-full bg-black/50 border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Nonce (round number)</label>
            <input
              type="number"
              value={nonce}
              onChange={e => setNonce(e.target.value)}
              min="0"
              className="w-full bg-black/50 border border-[#333] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <XCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <Button
            onClick={handleVerify}
            disabled={loading}
            className="w-full bg-[#D4AF37] hover:bg-[#B8960C] text-black font-bold"
          >
            {loading ? 'Verifying…' : 'Verify Result'}
          </Button>
        </div>

        {renderResult()}
      </div>

      {!inline && (
        <div className={cardClass}>
          <h2 className="font-bold text-lg mb-4">Technical Specification</h2>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="flex justify-between items-center border-b border-[#222] pb-2">
              <span className="text-gray-400">Hash algorithm</span>
              <code className="text-[#D4AF37] text-xs">SHA-256</code>
            </div>
            <div className="flex justify-between items-center border-b border-[#222] pb-2">
              <span className="text-gray-400">Outcome derivation</span>
              <code className="text-[#D4AF37] text-xs">HMAC-SHA256(serverSeed, clientSeed:nonce)</code>
            </div>
            <div className="flex justify-between items-center border-b border-[#222] pb-2">
              <span className="text-gray-400">Server seed length</span>
              <code className="text-[#D4AF37] text-xs">32 bytes (64 hex chars)</code>
            </div>
            <div className="flex justify-between items-center border-b border-[#222] pb-2">
              <span className="text-gray-400">Slots</span>
              <code className="text-[#D4AF37] text-xs">15 independent HMAC calls (3×5 grid)</code>
            </div>
            <div className="flex justify-between items-center border-b border-[#222] pb-2">
              <span className="text-gray-400">Roulette</span>
              <code className="text-[#D4AF37] text-xs">1 HMAC call → index into 37-slot wheel</code>
            </div>
            <div className="flex justify-between items-center pb-2">
              <span className="text-gray-400">Blackjack</span>
              <code className="text-[#D4AF37] text-xs">4 HMAC calls → initial 4 cards from 52-card deck</code>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (inline) {
    return <div className="text-white">{toolContent}</div>;
  }

  const fullPage = (
    <div className="min-h-screen text-white" style={{ background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a0a 100%)' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={handleBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <ChevronLeft className="w-5 h-5" />
          Back to Casino
        </button>
        {toolContent}
      </div>
    </div>
  );

  if (isOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={v => { if (!v && onClose) onClose(); }}>
        <DialogContent className="max-w-3xl p-0 bg-transparent border-none overflow-y-auto max-h-[90vh]">
          {fullPage}
        </DialogContent>
      </Dialog>
    );
  }

  return fullPage;
}
