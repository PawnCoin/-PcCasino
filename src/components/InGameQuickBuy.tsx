import { useState } from 'react';
import { X, Zap, TrendingUp, ExternalLink } from 'lucide-react';
import { useGlobalGame } from '@/contexts/GlobalGameContext';

const QUICK_AMOUNTS = [
  { label: '1M', value: 1_000_000 },
  { label: '5M', value: 5_000_000 },
  { label: '10M', value: 10_000_000 },
  { label: '50M', value: 50_000_000 },
  { label: '100M', value: 100_000_000 },
  { label: '500M', value: 500_000_000 },
];

interface InGameQuickBuyProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBalance: (amount: number) => void;
  currentBalance: number;
}

export function InGameQuickBuy({ isOpen, onClose, onAddBalance, currentBalance }: InGameQuickBuyProps) {
  const { formatPc } = useGlobalGame();
  const [selected, setSelected] = useState<number | null>(5_000_000);
  const [customInput, setCustomInput] = useState('');
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');

  if (!isOpen) return null;

  const amount = customInput ? parseFloat(customInput.replace(/[^\d.]/g, '')) * 1_000_000 || 0 : selected || 0;

  const handleConfirm = () => {
    if (amount <= 0) return;
    setStep('confirm');
  };

  const handleComplete = () => {
    onAddBalance(amount);
    setStep('success');
    setTimeout(() => {
      setStep('select');
      setCustomInput('');
      setSelected(5_000_000);
      onClose();
    }, 2000);
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9998, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) { setStep('select'); onClose(); } }}
    >
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }} onClick={() => { setStep('select'); onClose(); }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: 360, background: 'linear-gradient(180deg,#111 0%,#080808 100%)',
        border: '1px solid rgba(212,175,55,0.4)', borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(212,175,55,0.1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: "'Cinzel',serif", fontSize: 15, fontWeight: 900, color: '#D4AF37', letterSpacing: '0.08em' }}>
              <Zap size={14} style={{ display: 'inline', marginRight: 6 }} />
              QUICK RELOAD
            </div>
            <div style={{ fontSize: 10, color: '#4b5563', marginTop: 2 }}>Top up $Pc without leaving</div>
          </div>
          <button onClick={() => { setStep('select'); onClose(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '18px 20px' }}>
          {step === 'success' ? (
            <div style={{ textAlign: 'center', padding: '30px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
              <div style={{ fontFamily: "'Cinzel',serif", fontSize: 18, color: '#D4AF37', fontWeight: 900 }}>Added!</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 6 }}>{formatPc(amount)} $Pc added to balance</div>
            </div>
          ) : step === 'confirm' ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 16 }}>Confirm purchase</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#D4AF37', fontFamily: "'Cinzel',serif", marginBottom: 4 }}>
                {formatPc(amount)} $Pc
              </div>
              <div style={{ fontSize: 11, color: '#4b5563', marginBottom: 24 }}>via PcPay Wallet</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setStep('select')} style={{ flex: 1, padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#9ca3af', cursor: 'pointer' }}>Back</button>
                <button onClick={handleComplete} style={{ flex: 2, padding: '11px 0', borderRadius: 10, fontWeight: 900, fontSize: 13, background: 'linear-gradient(135deg,#D4AF37,#B8860B)', color: '#000', border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(212,175,55,0.4)', fontFamily: "'Cinzel',serif" }}>
                  CONFIRM & ADD
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Current balance */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, padding: '10px 14px', background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 10 }}>
                <img src="/logos/pc-logo.png" alt="" style={{ width: 18, height: 18 }} />
                <span style={{ fontSize: 11, color: '#6b7280' }}>Current balance:</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#D4AF37', marginLeft: 'auto' }}>{formatPc(currentBalance)} $Pc</span>
              </div>

              {/* Quick amounts */}
              <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 10 }}>QUICK AMOUNTS</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
                {QUICK_AMOUNTS.map(qa => (
                  <button key={qa.value} onClick={() => { setSelected(qa.value); setCustomInput(''); }} style={{
                    padding: '10px 0', borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                    background: selected === qa.value && !customInput ? 'rgba(212,175,55,0.18)' : 'rgba(255,255,255,0.05)',
                    border: `1.5px solid ${selected === qa.value && !customInput ? 'rgba(212,175,55,0.7)' : 'rgba(255,255,255,0.1)'}`,
                    color: selected === qa.value && !customInput ? '#D4AF37' : '#9ca3af',
                  }}>
                    {qa.label}
                  </button>
                ))}
              </div>

              {/* Custom input */}
              <div style={{ fontSize: 10, color: '#4b5563', letterSpacing: '0.2em', fontWeight: 700, marginBottom: 8 }}>CUSTOM (MILLIONS)</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                <input
                  value={customInput}
                  onChange={e => { setCustomInput(e.target.value); setSelected(null); }}
                  placeholder="e.g. 25"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: `1px solid ${customInput ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.12)'}`, borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 14, outline: 'none' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', fontSize: 12, color: '#6b7280', fontWeight: 700, padding: '0 4px' }}>M $Pc</span>
              </div>

              {/* Market note */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, padding: '8px 12px', background: 'rgba(30,136,229,0.08)', border: '1px solid rgba(30,136,229,0.2)', borderRadius: 8 }}>
                <TrendingUp size={12} color="#42A5F5" />
                <span style={{ fontSize: 10, color: '#60a5fa', lineHeight: 1.5 }}>$Pc is crypto — price fluctuates. 1 USD ≈ millions of $Pc. Amount shown is in $Pc tokens.</span>
              </div>

              <button onClick={handleConfirm} disabled={amount <= 0} style={{
                width: '100%', padding: '13px 0', borderRadius: 12, fontWeight: 900, fontSize: 15,
                background: amount > 0 ? 'linear-gradient(135deg,#D4AF37,#B8860B)' : 'rgba(255,255,255,0.06)',
                color: amount > 0 ? '#000' : '#374151', border: 'none', cursor: amount > 0 ? 'pointer' : 'default',
                boxShadow: amount > 0 ? '0 4px 20px rgba(212,175,55,0.4)' : 'none',
                fontFamily: "'Cinzel',serif", letterSpacing: '0.05em',
              }}>
                {amount > 0 ? `ADD ${formatPc(amount)} $Pc` : 'SELECT AMOUNT'}
              </button>

              <div style={{ marginTop: 12, textAlign: 'center' }}>
                <a href="https://pcpay.io" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#374151', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <ExternalLink size={10} /> Buy $Pc on exchange
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
