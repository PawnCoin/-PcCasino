import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, Shield, Coins, AlertTriangle, Scale, Cookie, ChevronLeft } from 'lucide-react';

export type LegalPage = 'terms' | 'privacy' | 'responsible' | 'rules' | 'crypto' | 'malfunction' | 'cookies';

interface LegalPagesProps {
  isOpen: boolean;
  onClose: () => void;
  page: LegalPage;
  onChangePage: (page: LegalPage) => void;
}

const pages: { id: LegalPage; label: string; icon: typeof FileText }[] = [
  { id: 'terms', label: 'Terms of Service', icon: FileText },
  { id: 'privacy', label: 'Privacy Policy', icon: Shield },
  { id: 'responsible', label: 'Responsible Gaming', icon: Shield },
  { id: 'rules', label: 'Game Rules', icon: Scale },
  { id: 'crypto', label: 'Crypto & Money Rules', icon: Coins },
  { id: 'malfunction', label: 'Malfunction Policy', icon: AlertTriangle },
  { id: 'cookies', label: 'Cookie Policy', icon: Cookie },
];

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-base font-bold mt-6 mb-2" style={{ color: '#D4AF37' }}>{children}</h3>
);
const Paragraph = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm text-gray-300 leading-relaxed mb-3">{children}</p>
);
const BulletList = ({ items }: { items: string[] }) => (
  <ul className="space-y-1 mb-3">
    {items.map((item, i) => (
      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
        <span className="text-yellow-500 mt-0.5">•</span> {item}
      </li>
    ))}
  </ul>
);

function TermsContent() {
  return (
    <div>
      <Paragraph>Last Updated: April 6, 2026. These Terms of Service ("Terms") govern your access to and use of $Pc Casino ("we," "us," or "our"), operated by PcCasino Holdings under the $Pc token ecosystem.</Paragraph>
      <SectionTitle>1. Eligibility</SectionTitle>
      <BulletList={['You must be at least 18 years of age (21 in some jurisdictions) to use $Pc Casino.', 'Access is restricted in jurisdictions where online gambling is prohibited.', 'You must not be on any self-exclusion, banned, or restricted list.', 'By accessing this platform, you represent that you meet all eligibility requirements.']} items={[
        'You must be at least 18 years of age (21 in some jurisdictions) to use $Pc Casino.',
        'Access is restricted in jurisdictions where online gambling is prohibited by law.',
        'You must not be on any self-exclusion, banned, or restricted list.',
        'By accessing this platform, you confirm all eligibility requirements are met.',
      ]} />
      <SectionTitle>2. Account Registration</SectionTitle>
      <Paragraph>You are responsible for maintaining the confidentiality of your account credentials. You may not share, sell, transfer, or allow others to use your account. Multiple accounts per person are strictly prohibited and may result in permanent banning of all associated accounts.</Paragraph>
      <SectionTitle>3. Use of $Pc Token</SectionTitle>
      <Paragraph>All gaming on $Pc Casino is conducted using $Pc token. $Pc is a digital social casino token used for entertainment purposes. While $Pc has exchange value, casino winnings are distributed as $Pc tokens, not as legal tender currency. You acknowledge and accept all risks associated with cryptocurrency volatility.</Paragraph>
      <SectionTitle>4. Game Fairness</SectionTitle>
      <Paragraph>All games employ provably fair algorithms and industry-standard random number generation (RNG). The house edge applies to all games as disclosed in our Game Rules. $Pc Casino does not manipulate game outcomes.</Paragraph>
      <SectionTitle>5. Prohibited Activities</SectionTitle>
      <BulletList items={['Using bots, scripts, or automated software to play games', 'Collusion with other players during multiplayer games', 'Exploiting software bugs, glitches, or malfunctions for gain', 'Money laundering, fraudulent chargebacks, or financial crimes', 'Creating multiple accounts to claim bonuses multiple times', 'Threatening, harassing, or abusing staff or other players']} />
      <SectionTitle>6. Limitation of Liability</SectionTitle>
      <Paragraph>$Pc Casino shall not be liable for any indirect, incidental, special, punitive, or consequential damages arising from your use of the platform, including losses due to technical malfunctions, connectivity issues, or market volatility of $Pc token. Our maximum liability is limited to the value of tokens in your account at the time of the incident.</Paragraph>
      <SectionTitle>7. Dispute Resolution</SectionTitle>
      <Paragraph>All disputes regarding game outcomes must be submitted within 72 hours of the event. See our Malfunction & Dispute Policy for complete details on the refund process.</Paragraph>
      <SectionTitle>8. Amendments</SectionTitle>
      <Paragraph>We reserve the right to amend these Terms at any time. Continued use of the platform after amendments constitutes acceptance of the new Terms. Major changes will be communicated via site-wide broadcast.</Paragraph>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div>
      <Paragraph>This Privacy Policy describes how $Pc Casino collects, uses, and protects your personal information.</Paragraph>
      <SectionTitle>1. Information We Collect</SectionTitle>
      <BulletList items={['Username and profile information you provide at registration', 'Wallet addresses used for deposits and withdrawals', 'Device information (IP address, browser type, operating system)', 'Gameplay data including bets, wins, game history, and session duration', 'Communication data from chat, support tickets, and dispute submissions', 'Cookies and local storage data for session management']} />
      <SectionTitle>2. How We Use Your Information</SectionTitle>
      <BulletList items={['To provide, operate, and improve the casino platform', 'To detect and prevent fraud, cheating, and abuse', 'To process deposits, withdrawals, and bonus claims', 'To send important account notifications and service updates', 'To comply with legal and regulatory obligations', 'To personalize your gaming experience']} />
      <SectionTitle>3. Data Storage & Security</SectionTitle>
      <Paragraph>All sensitive data is stored encrypted using AES-256 encryption. We employ industry-standard security practices including TLS 1.3 for data in transit. Wallet addresses and transaction data are never sold to third parties. We retain gameplay logs for up to 7 years to satisfy anti-money laundering (AML) regulations.</Paragraph>
      <SectionTitle>4. Third-Party Services</SectionTitle>
      <Paragraph>$Pc Casino integrates with PcPayments Command Center for crypto payment processing, WeParlay Inc. for sports betting features, and Socket.io for real-time multiplayer infrastructure. Each third-party service has its own privacy policy. We only share the minimum data required for these services to function.</Paragraph>
      <SectionTitle>5. Your Rights</SectionTitle>
      <BulletList items={['Right to access all personal data we hold about you', 'Right to request deletion of your account and associated data', 'Right to opt out of marketing communications', 'Right to data portability (export your game history)', 'Right to lodge a complaint with a data protection authority']} />
      <SectionTitle>6. Cookies</SectionTitle>
      <Paragraph>We use essential cookies for authentication and session management, and optional analytics cookies to improve the platform. See our full Cookie Policy for details.</Paragraph>
    </div>
  );
}

function ResponsibleContent() {
  return (
    <div>
      <Paragraph>$Pc Casino is committed to responsible gaming. Gambling should be an enjoyable form of entertainment, not a financial strategy or a way to cope with problems.</Paragraph>
      <SectionTitle>Signs of Problem Gambling</SectionTitle>
      <BulletList items={['Spending more than you can afford to lose', 'Chasing losses with larger bets', 'Gambling to escape problems or stress', 'Lying to friends or family about your gambling', 'Neglecting work, school, or relationships due to gambling', 'Borrowing money to fund gambling', 'Feeling restless or irritable when not gambling']} />
      <SectionTitle>Tools Available to You</SectionTitle>
      <BulletList items={['Daily/weekly/monthly deposit limits in your account settings', 'Session time reminders and pop-up notifications', 'Cooling-off period: temporarily lock your account (24h to 30 days)', 'Self-exclusion: permanently block yourself from the platform', 'Reality check: timed notifications showing how long you\'ve been playing', 'Access to full gameplay and financial history anytime']} />
      <SectionTitle>Setting Limits</SectionTitle>
      <Paragraph>Visit your Profile → Limits tab to set deposit limits, loss limits, and self-exclusion periods. Limits take effect immediately. Increasing limits requires a 24-hour cooling-off period. Decreasing limits applies instantly. Self-exclusion periods cannot be reversed once activated.</Paragraph>
      <SectionTitle>Getting Help</SectionTitle>
      <Paragraph>If you are concerned about your gambling, please contact one of these free confidential support services:</Paragraph>
      <BulletList items={['National Problem Gambling Helpline: 1-800-522-4700 (US)', 'Gamblers Anonymous: www.gamblersanonymous.org', 'BeGambleAware: www.begambleaware.org (UK)', 'Gambling Help Online: www.gamblinghelponline.org.au (AU)', 'GamCare: www.gamcare.org.uk']} />
      <SectionTitle>Underage Gambling</SectionTitle>
      <Paragraph>We strictly prohibit anyone under 18 (or 21 in applicable jurisdictions) from using our platform. We use age verification processes to enforce this. If you believe a minor is using the platform, contact our support team immediately.</Paragraph>
    </div>
  );
}

function GameRulesContent() {
  return (
    <div>
      <Paragraph>All games at $Pc Casino follow worldwide casino standard rules unless specifically noted. The following rules apply to gameplay on our platform.</Paragraph>
      <SectionTitle>General Rules (All Games)</SectionTitle>
      <BulletList items={['All bets are final once confirmed. No cancellation of placed bets.', 'The house edge applies to all games as listed in game information panels.', 'In the event of a technical malfunction, the round is void and all bets are returned.', 'Players must not use any third-party software, bots, or assistance tools.', 'Game decisions by the RNG are final. Human dealer rules apply in live games.', 'Minimum and maximum bet limits are enforced per table and per game.']} />
      <SectionTitle>Texas Hold'em Poker</SectionTitle>
      <Paragraph>Standard No-Limit Texas Hold'em rules apply. Players are dealt 2 hole cards. Community cards (flop, turn, river) are dealt face-up. Standard hand rankings apply. Best 5-card hand wins the pot. All-in situations create side pots. Slow play and deliberate stalling are prohibited.</Paragraph>
      <SectionTitle>Blackjack</SectionTitle>
      <Paragraph>Standard casino Blackjack rules: dealer stands on soft 17. Blackjack pays 3:2. Insurance pays 2:1 when dealer shows an ace. Surrender available on first two cards (loses half bet). Double down on any two cards. Split up to 3 times (except Aces - split once). Re-split Aces not permitted.</Paragraph>
      <SectionTitle>Roulette</SectionTitle>
      <Paragraph>European (single-zero) and American (double-zero) wheels available. La Partage rule applies on European wheels: even-money bets return half when 0 lands. No call bets without sufficient balance. Race track (announced bets) available on European tables only.</Paragraph>
      <SectionTitle>Craps</SectionTitle>
      <Paragraph>Standard casino craps rules. Pass/Don't Pass, Come/Don't Come, Place, Buy, Lay, and Proposition bets available. Odds bets are true odds (no house edge). A 5% commission applies to Buy bets on 4 and 10.</Paragraph>
      <SectionTitle>Slots</SectionTitle>
      <Paragraph>All slot machines use a certified RNG. Return-to-Player (RTP) for all slots is 95-97%. Progressive jackpot contributions are 2% of each eligible bet. Maximum win per spin is 500x the bet amount for non-progressive slots.</Paragraph>
      <SectionTitle>Spades, Dominoes & Card Games</SectionTitle>
      <Paragraph>Standard worldwide tournament rules apply for Spades and Dominoes. Spades: standard bidding, nil/blind nil available, bags count against at 10. Dominoes: Draw Dominoes rules, shuffle and draw for highest double for first play.</Paragraph>
      <SectionTitle>Dispute of Game Outcomes</SectionTitle>
      <Paragraph>Game outcome disputes must be filed within 72 hours. Evidence required: session ID, timestamp, screenshot or video of malfunction if available. See Malfunction Policy for full details.</Paragraph>
    </div>
  );
}

function CryptoContent() {
  return (
    <div>
      <Paragraph>This policy governs all financial transactions on $Pc Casino, including deposits, withdrawals, and handling of $Pc tokens.</Paragraph>
      <SectionTitle>Deposits</SectionTitle>
      <BulletList items={['Minimum deposit: 1,000 $Pc', 'Maximum single deposit: 100,000,000 $Pc (100M)', 'Deposits are credited once confirmed on-chain (typically 1-3 block confirmations)', 'Supported networks: $Pc native chain and supported bridges', 'No deposit fees from $Pc Casino (network gas fees apply)', 'Deposits from non-personal wallets (exchanges, protocols) may be delayed for verification']} />
      <SectionTitle>Withdrawals</SectionTitle>
      <BulletList items={['Minimum withdrawal: 100 $Pc', 'Maximum single withdrawal: 50,000,000 $Pc (50M)', 'Withdrawals processed within 1-24 hours during normal operations', 'Large withdrawals (over 10M $Pc) may require additional verification', 'Withdrawals require KYC for amounts over 5M $Pc cumulative', 'Withdrawal address must match your registered wallet address', 'A 1% platform fee applies to all withdrawals', 'Withdrawals cannot be made to smart contract addresses without admin approval']} />
      <SectionTitle>AML/KYC Policy</SectionTitle>
      <Paragraph>We are committed to preventing money laundering. Players who deposit more than 10M $Pc cumulative within 30 days will be asked to verify their identity. Failure to complete verification within 72 hours will result in account suspension until verification is complete. All suspicious activity is reported to relevant authorities.</Paragraph>
      <SectionTitle>Bonus Wagering Requirements</SectionTitle>
      <BulletList items={['Welcome bonus: 15x wagering requirement before withdrawal', 'Deposit match bonus: 20x wagering requirement', 'Referral bonus: 10x wagering requirement', 'Daily login bonus: no wagering requirement', 'Bonus funds cannot be withdrawn, only winnings derived from bonus play']} />
      <SectionTitle>Tax Responsibility</SectionTitle>
      <Paragraph>Players are solely responsible for reporting and paying all applicable taxes on gambling winnings in their jurisdiction. $Pc Casino does not provide tax advice. Transaction records are available in your profile for up to 7 years to assist with tax filings.</Paragraph>
      <SectionTitle>Chargeback Policy</SectionTitle>
      <Paragraph>Fraudulent chargebacks will result in immediate account termination and legal action. Any outstanding balance will be forfeited. We cooperate fully with law enforcement in all cases of financial fraud.</Paragraph>
    </div>
  );
}

function MalfunctionContent() {
  return (
    <div>
      <Paragraph>$Pc Casino takes technical malfunctions seriously. This policy explains our procedures for handling game malfunctions and our commitment to fair refund processing.</Paragraph>
      <SectionTitle>What Constitutes a Malfunction</SectionTitle>
      <BulletList items={['Game client crashes mid-hand or mid-spin before resolution', 'Server disconnection that results in an unresolved bet being lost', 'Incorrect game outcomes due to RNG or software error', 'Display errors showing incorrect win amounts', 'Connection loss immediately before a winning outcome', 'Game freezing or hanging during an active session with funds at stake', 'Incorrect rule application by the game engine (e.g., wrong card rankings)']} />
      <SectionTitle>What Does NOT Constitute a Malfunction</SectionTitle>
      <BulletList items={['Normal game losses (bad hands, bad luck)', 'Your own internet connection issues', 'Bets placed in error (wrong amount, wrong game)', 'Device overheating or battery failure', 'Browser compatibility issues on unsupported browsers', 'Misunderstanding of game rules']} />
      <SectionTitle>How to File a Malfunction Dispute</SectionTitle>
      <Paragraph>Go to your Profile → Disputes → File Dispute, or use the Dispute button in your game session. You will need to provide:</Paragraph>
      <BulletList items={['Your user ID and username', 'Game type and table/session ID', 'Date and approximate time of the malfunction', 'Amount at stake when malfunction occurred', 'Description of what happened', 'Screenshot or screen recording (if available)', 'Any error codes or messages displayed']} />
      <SectionTitle>Review Process</SectionTitle>
      <Paragraph>All disputes are reviewed by our technical team. Review typically takes 24–72 hours. You will receive a notification when your dispute status changes. During review, our team examines server logs, RNG records, network logs, and session data.</Paragraph>
      <SectionTitle>Refund Process</SectionTitle>
      <Paragraph>If a malfunction is confirmed, you will receive one of the following:</Paragraph>
      <BulletList items={['Full refund: The full amount at stake is returned to your balance instantly', 'Partial refund: If the malfunction affected only part of a session', 'Void round: Round is declared void, all bets returned', 'No refund: If investigation determines no malfunction occurred']} />
      <SectionTitle>Appeals</SectionTitle>
      <Paragraph>If you disagree with a dispute outcome, you may appeal within 7 days by contacting our support team with additional evidence. Appeals are reviewed by senior management. The second decision is final.</Paragraph>
      <Paragraph style={{ color: '#fbbf24', fontStyle: 'italic' }}>Note: In the spirit of fair gaming, "malfunction voids all pays and plays" — all malfunctions result in round voidance rather than one-sided outcomes. We err in the player's favor when evidence is ambiguous.</Paragraph>
    </div>
  );
}

function CookieContent() {
  return (
    <div>
      <Paragraph>$Pc Casino uses cookies and local storage to provide a better experience. This policy explains what we use and why.</Paragraph>
      <SectionTitle>Essential Cookies</SectionTitle>
      <BulletList items={['Session authentication tokens (required for login)', 'CSRF protection tokens (security)', 'Local game state storage (save your game preferences)', 'Balance caching (prevent unnecessary server calls)']} />
      <SectionTitle>Functional Cookies</SectionTitle>
      <BulletList items={['Your preferred avatar and display settings', 'Game volume and sound preferences', 'Chat visibility and notification settings', 'Language preferences']} />
      <SectionTitle>Analytics (Optional)</SectionTitle>
      <BulletList items={['Session duration tracking to improve game design', 'Feature usage to prioritize development', 'Error reporting to fix bugs faster']} />
      <SectionTitle>Managing Cookies</SectionTitle>
      <Paragraph>Essential cookies cannot be disabled as they are required for the platform to function. Optional cookies can be disabled in your browser settings or through our Preferences panel in your profile. Disabling all cookies may affect platform functionality.</Paragraph>
    </div>
  );
}

export function LegalPages({ isOpen, onClose, page, onChangePage }: LegalPagesProps) {
  const currentPage = pages.find(p => p.id === page)!;

  const renderContent = () => {
    switch (page) {
      case 'terms': return <TermsContent />;
      case 'privacy': return <PrivacyContent />;
      case 'responsible': return <ResponsibleContent />;
      case 'rules': return <GameRulesContent />;
      case 'crypto': return <CryptoContent />;
      case 'malfunction': return <MalfunctionContent />;
      case 'cookies': return <CookieContent />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden" style={{ background: 'rgba(6,6,12,0.99)', border: '1px solid rgba(212,175,55,0.2)' }}>
        <div className="flex h-[90vh]">
          {/* Sidebar */}
          <div className="w-52 flex-shrink-0 border-r border-white/10 py-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
            <div className="px-4 mb-4">
              <div className="flex items-center gap-2 text-yellow-400">
                <Scale className="w-4 h-4" />
                <span className="font-bold text-sm">Legal Documents</span>
              </div>
            </div>
            {pages.map(p => {
              const Icon = p.icon;
              return (
                <button key={p.id} onClick={() => onChangePage(p.id)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-left transition-all"
                  style={{
                    color: page === p.id ? '#D4AF37' : '#9ca3af',
                    background: page === p.id ? 'rgba(212,175,55,0.1)' : 'transparent',
                    borderRight: page === p.id ? '2px solid #D4AF37' : '2px solid transparent',
                  }}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {p.label}
                </button>
              );
            })}
          </div>
          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}>
                  <Scale className="w-5 h-5 text-black" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{currentPage?.label}</h2>
                  <div className="text-xs text-gray-400">$Pc Casino • Official Legal Document</div>
                </div>
              </div>
              {renderContent()}
              <div className="mt-8 pt-4 border-t border-white/10 text-xs text-gray-500">
                <p>These documents are legally binding agreements between you and $Pc Casino. For questions, contact legal@pccasino.io</p>
                <p className="mt-1">© 2024-2026 $Pc Casino. All rights reserved. Powered by $Pc Token.</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
