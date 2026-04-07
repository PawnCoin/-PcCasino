import { Gift, Star, Zap, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ReferralWelcomeOverlayProps {
  referrerUsername: string;
  welcomeBonus: number;
  onRegister: () => void;
  onDismiss: () => void;
}

export function ReferralWelcomeOverlay({
  referrerUsername,
  welcomeBonus,
  onRegister,
  onDismiss,
}: ReferralWelcomeOverlayProps) {
  const formattedBonus = welcomeBonus.toLocaleString();

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0f0a02 0%, #1a1000 50%, #0a0a0a 100%)',
          border: '1px solid rgba(212,175,55,0.5)',
          boxShadow: '0 0 80px rgba(212,175,55,0.2), 0 30px 80px rgba(0,0,0,0.9)',
        }}
      >
        {/* Gold top bar */}
        <div
          className="h-1 w-full"
          style={{ background: 'linear-gradient(90deg, #B8860B, #D4AF37, #FFD700, #D4AF37, #B8860B)' }}
        />

        {/* Dismiss button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-[#606060] hover:text-[#D4AF37] transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 text-center">
          {/* Icon cluster */}
          <div className="relative inline-flex items-center justify-center mb-6">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, rgba(212,175,55,0.25), rgba(212,175,55,0.08))',
                border: '2px solid rgba(212,175,55,0.4)',
                boxShadow: '0 0 40px rgba(212,175,55,0.2)',
              }}
            >
              <Gift className="w-10 h-10 text-[#D4AF37]" />
            </div>
            <Star className="absolute -top-1 -right-1 w-5 h-5 text-[#FFD700] fill-[#FFD700]" />
            <Zap className="absolute -bottom-1 -left-1 w-5 h-5 text-[#D4AF37] fill-[#D4AF37]" />
          </div>

          {/* Heading */}
          <p className="text-sm font-bold uppercase tracking-widest text-[#D4AF37] mb-2">
            You've been invited!
          </p>
          <h1 className="font-casino text-3xl text-white mb-2" style={{ textShadow: '0 0 20px rgba(212,175,55,0.4)' }}>
            Welcome to
          </h1>
          <h1 className="font-casino text-4xl mb-1" style={{
            background: 'linear-gradient(135deg, #B8860B, #D4AF37, #FFD700)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            $Pc Casino
          </h1>

          {/* Referrer info */}
          <div
            className="my-5 py-3 px-4 rounded-xl"
            style={{
              background: 'rgba(212,175,55,0.08)',
              border: '1px solid rgba(212,175,55,0.2)',
            }}
          >
            <p className="text-sm text-[#909090]">
              <span className="text-[#D4AF37] font-bold">{referrerUsername}</span> personally invited you
            </p>
          </div>

          {/* Bonus amount */}
          <div
            className="my-6 py-5 px-6 rounded-2xl"
            style={{
              background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
              border: '1px solid rgba(212,175,55,0.35)',
              boxShadow: 'inset 0 1px 0 rgba(212,175,55,0.1)',
            }}
          >
            <p className="text-xs font-bold uppercase tracking-widest text-[#909090] mb-1">
              Your Welcome Bonus
            </p>
            <p
              className="font-casino text-4xl font-bold"
              style={{
                background: 'linear-gradient(135deg, #FFD700, #D4AF37)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              +{formattedBonus}
            </p>
            <p className="text-sm text-[#D4AF37] font-bold mt-1">$Pc tokens FREE</p>
            <p className="text-xs text-[#606060] mt-2">
              Credited instantly on sign-up. No deposit required.
            </p>
          </div>

          {/* CTA */}
          <Button
            onClick={onRegister}
            className="w-full py-4 text-base font-bold rounded-xl text-black transition-all hover:scale-[1.02] active:scale-100"
            style={{
              background: 'linear-gradient(135deg, #D4AF37, #B8860B)',
              boxShadow: '0 4px 20px rgba(212,175,55,0.4)',
            }}
          >
            Claim My Bonus & Register
          </Button>

          <p className="text-xs text-[#505050] mt-4">
            Already have an account?{' '}
            <button onClick={onDismiss} className="text-[#D4AF37] hover:underline">
              Sign in instead
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
