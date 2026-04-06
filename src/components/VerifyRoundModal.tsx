import { Shield, Copy, CheckCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState } from 'react';
import type { ProvablyFairRound } from '@/hooks/useProvablyFair';

interface VerifyRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: ProvablyFairRound | null;
  lastReveal: ProvablyFairRound | null;
  onOpenProvablyFairPage: () => void;
}

export function VerifyRoundModal({ isOpen, onClose, round, lastReveal, onOpenProvablyFairPage }: VerifyRoundModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copy = (val: string, key: string) => {
    navigator.clipboard.writeText(val).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const CopyBtn = ({ val, k }: { val: string; k: string }) => (
    <button onClick={() => copy(val, k)} className="ml-2 text-gray-500 hover:text-white flex-shrink-0">
      {copied === k ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
    </button>
  );

  const Field = ({ label, value, k }: { label: string; value: string; k: string }) => (
    <div className="mb-3">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="flex items-start">
        <code className="text-xs text-[#D4AF37] break-all flex-1 bg-black/50 p-2 rounded-lg">
          {value || <span className="text-gray-600 italic">not yet revealed</span>}
        </code>
        {value && <CopyBtn val={value} k={k} />}
      </div>
    </div>
  );

  const display = lastReveal || round;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg border-[#333] text-white" style={{ background: '#111' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#D4AF37]">
            <Shield className="w-5 h-5" />
            Provably Fair — Round Verification
          </DialogTitle>
        </DialogHeader>

        {!display ? (
          <div className="text-sm text-gray-400 py-4 text-center">
            Play a round first to see verification data.
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-xs text-gray-500 mb-3">
              Round #{display.roundId} · {lastReveal ? 'Server seed revealed ✓' : 'Round in progress — server seed will be revealed after completion'}
            </div>

            <Field
              label="Server Seed Hash (shown before round — verifies server couldn't cheat)"
              value={display.serverSeedHash}
              k="hash"
            />
            <Field
              label="Server Seed (revealed after round)"
              value={display.serverSeed || ''}
              k="seed"
            />
            <Field label="Client Seed" value={display.clientSeed} k="cs" />
            <Field label="Nonce" value={String(display.nonce)} k="nonce" />

            {lastReveal?.serverSeed && (
              <div className="mt-3 p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-xs text-green-400">
                ✓ Server seed revealed. You can now verify this round using the verification tool below.
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <Button
                onClick={onOpenProvablyFairPage}
                variant="outline"
                className="flex-1 border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Verifier
              </Button>
              <Button onClick={onClose} className="flex-1 bg-[#D4AF37] hover:bg-[#B8960C] text-black text-sm">
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
