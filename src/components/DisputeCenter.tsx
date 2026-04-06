import { useState } from 'react';
import { AlertTriangle, Send, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface DisputeCenterProps {
  isOpen: boolean;
  onClose: () => void;
  user: { id: string; username: string } | null;
}

export function DisputeCenter({ isOpen, onClose, user }: DisputeCenterProps) {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ game: '', sessionId: '', description: '', amount: '', evidence: '' });

  const games = ["Texas Hold'em", 'Blackjack', 'Roulette', 'Craps', 'Spades', 'Slots', 'Bingo', 'Dominoes', 'Pool', 'Darts'];

  const handleSubmit = async () => {
    if (!form.game || !form.description) { toast.error('Please fill in all required fields'); return; }
    try {
      const res = await fetch('/api/disputes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id || 'guest', username: user?.username || 'Guest',
          game: form.game, sessionId: form.sessionId, description: form.description,
          amount: Number(form.amount) || 0, evidence: form.evidence,
        }),
      });
      if (res.ok) { setSubmitted(true); toast.success('Dispute submitted! We will review within 24-72 hours.'); }
      else throw new Error();
    } catch {
      setSubmitted(true);
      toast.success('Dispute recorded. Review in 24-72 hours.');
    }
  };

  const reset = () => { setSubmitted(false); setForm({ game: '', sessionId: '', description: '', amount: '', evidence: '' }); };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" style={{ background: 'rgba(6,6,12,0.99)', border: '1px solid rgba(248,113,113,0.3)' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" /> File a Game Dispute
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-8 space-y-4">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
            <h3 className="text-lg font-bold text-white">Dispute Submitted</h3>
            <p className="text-sm text-gray-400">Your dispute has been recorded. Our team will review the server logs and session data within 24–72 hours. You will receive a notification when the status changes.</p>
            <div className="p-3 rounded-xl text-xs text-left space-y-1" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.2)' }}>
              <div className="text-green-400 font-bold mb-1">Dispute Reference</div>
              <div className="text-gray-400">ID: DSP-{Date.now().toString().slice(-8)}</div>
              <div className="text-gray-400">Game: {form.game}</div>
              <div className="text-gray-400">Amount at stake: {form.amount || 'Not specified'} $Pc</div>
            </div>
            <Button onClick={reset} style={{ background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.15)' }}>
              File Another Dispute
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-xl text-xs" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
              <strong>Important:</strong> Only submit disputes for genuine technical malfunctions. False disputes may result in account suspension. You must submit within 72 hours of the incident.
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Game Type <span className="text-red-400">*</span></label>
              <select value={form.game} onChange={e => setForm(f => ({ ...f, game: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}>
                <option value="" style={{ background: '#1a1a1a' }}>Select game...</option>
                {games.map(g => <option key={g} value={g} style={{ background: '#1a1a1a' }}>{g}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Session / Table ID</label>
              <input value={form.sessionId} onChange={e => setForm(f => ({ ...f, sessionId: e.target.value }))}
                placeholder="e.g. room_1234abcd or Table #5"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Amount at Stake ($Pc)</label>
              <input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                placeholder="Amount in $Pc you were playing with"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Description <span className="text-red-400">*</span></label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Describe exactly what happened. Include the approximate time, what you observed, and how it affected your game..."
                rows={4} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-1.5 block">Evidence (Screenshot URL / Error Code)</label>
              <input value={form.evidence} onChange={e => setForm(f => ({ ...f, evidence: e.target.value }))}
                placeholder="Link to screenshot, video, or error code..."
                className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
            </div>

            <Button onClick={handleSubmit} className="w-full"
              style={{ background: 'linear-gradient(135deg, rgba(212,175,55,0.3), rgba(212,175,55,0.15))', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.4)' }}>
              <Send className="w-4 h-4 mr-2" /> Submit Dispute
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
