import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { FileText, Shield, Coins, AlertTriangle, Scale, Cookie, ChevronLeft, BookOpen, Heart, Users, Star } from 'lucide-react';
import { CasinoIcon } from '@/components/CasinoIcons';

export type LegalPage = 'terms' | 'privacy' | 'responsible' | 'rules' | 'crypto' | 'malfunction' | 'cookies' | 'aml' | 'affiliate' | 'rewards';

interface LegalPagesProps {
  isOpen: boolean;
  onClose: () => void;
  page: LegalPage;
  onChangePage: (page: LegalPage) => void;
}

const pages: { id: LegalPage; label: string; icon: typeof FileText }[] = [
  { id: 'rules', label: 'Game Rules & Steps', icon: Scale },
  { id: 'affiliate', label: 'Affiliate Program', icon: Users },
  { id: 'rewards', label: 'Rewards & Bonuses', icon: Star },
  { id: 'terms', label: 'Terms of Service', icon: FileText },
  { id: 'privacy', label: 'Privacy Policy', icon: Shield },
  { id: 'responsible', label: 'Responsible Gaming', icon: Heart },
  { id: 'crypto', label: 'Crypto & Money Rules', icon: Coins },
  { id: 'malfunction', label: 'Malfunction Policy', icon: AlertTriangle },
  { id: 'aml', label: 'AML / KYC Policy', icon: BookOpen },
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
        <span className="text-yellow-500 mt-0.5 flex-shrink-0">•</span> {item}
      </li>
    ))}
  </ul>
);
const Warning = ({ children }: { children: React.ReactNode }) => (
  <div className="p-3 rounded-xl mb-3 text-sm text-yellow-200" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)' }}>
    {children}
  </div>
);

function TermsContent() {
  return (
    <div>
      <Paragraph>Last Updated: April 6, 2026. These Terms of Service ("Terms") govern your access to and use of $Pc Casino ("we," "us," or "our"), operated by PcCasino Holdings under the $Pc token ecosystem.</Paragraph>
      <SectionTitle>1. Eligibility</SectionTitle>
      <BulletList items={[
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
      <BulletList items={[
        'Using bots, scripts, or automated software to play games',
        'Collusion with other players during multiplayer games',
        'Exploiting software bugs, glitches, or malfunctions for gain',
        'Money laundering, fraudulent chargebacks, or financial crimes',
        'Creating multiple accounts to claim bonuses multiple times',
        'Threatening, harassing, or abusing staff or other players',
        'Attempting to reverse-engineer the platform or game logic',
        'VPN or proxy use to bypass geographic restrictions',
      ]} />
      <SectionTitle>6. Limitation of Liability</SectionTitle>
      <Paragraph>$Pc Casino shall not be liable for any indirect, incidental, special, punitive, or consequential damages arising from your use of the platform, including losses due to technical malfunctions, connectivity issues, or market volatility of $Pc token. Our maximum liability is limited to the value of tokens in your account at the time of the incident.</Paragraph>
      <SectionTitle>7. Dispute Resolution</SectionTitle>
      <Paragraph>All disputes regarding game outcomes must be submitted within 72 hours of the event. Disputes are reviewed by our admin team within 5 business days. See our Malfunction & Dispute Policy for complete details on the refund process, including how to prove a malfunction occurred and qualify for a refund.</Paragraph>
      <SectionTitle>8. Amendments</SectionTitle>
      <Paragraph>We reserve the right to amend these Terms at any time. Continued use of the platform after amendments constitutes acceptance of the new Terms. Major changes will be communicated via site-wide broadcast at least 7 days in advance.</Paragraph>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div>
      <Paragraph>This Privacy Policy describes how $Pc Casino collects, uses, and protects your personal information. Last updated: April 6, 2026.</Paragraph>
      <SectionTitle>1. Information We Collect</SectionTitle>
      <BulletList items={[
        'Username and profile information you provide at registration',
        'Wallet addresses used for deposits and withdrawals',
        'Device information (IP address, browser type, operating system)',
        'Gameplay data including bets, wins, game history, and session duration',
        'Communication data from chat, support tickets, and dispute submissions',
        'Cookies and local storage data for session management',
        'KYC verification documents when requested for withdrawal processing',
      ]} />
      <SectionTitle>2. How We Use Your Information</SectionTitle>
      <BulletList items={[
        'To provide, operate, and improve the casino platform',
        'To detect and prevent fraud, cheating, and abuse',
        'To process deposits, withdrawals, and bonus claims',
        'To send important account notifications and service updates',
        'To comply with legal and regulatory obligations',
        'To personalize your gaming experience',
        'To generate aggregate analytics (never individual-level data sold)',
      ]} />
      <SectionTitle>3. Data Storage & Security</SectionTitle>
      <Paragraph>All sensitive data is stored encrypted using AES-256 encryption. We employ industry-standard security practices including TLS 1.3 for data in transit. Wallet addresses and transaction data are never sold to third parties. We retain gameplay logs for up to 7 years to satisfy anti-money laundering (AML) regulations.</Paragraph>
      <SectionTitle>4. Third-Party Services</SectionTitle>
      <Paragraph>$Pc Casino integrates with PcPayments Command Center for crypto payment processing, WeParlay Inc. for sports betting features, and Socket.io for real-time multiplayer infrastructure. Each third-party service has its own privacy policy. We only share the minimum data required for these services to function.</Paragraph>
      <SectionTitle>5. Your Rights</SectionTitle>
      <BulletList items={[
        'Right to access all personal data we hold about you',
        'Right to request deletion of your account and associated data',
        'Right to opt out of marketing communications',
        'Right to data portability — export your full game history',
        'Right to lodge a complaint with a data protection authority',
      ]} />
      <SectionTitle>6. Cookies</SectionTitle>
      <Paragraph>We use essential cookies for authentication and session management, and optional analytics cookies to improve the platform. See our full Cookie Policy for details.</Paragraph>
    </div>
  );
}

function ResponsibleContent() {
  return (
    <div>
      <Paragraph>$Pc Casino is committed to responsible gaming. Gambling should be an enjoyable form of entertainment, not a financial strategy or a way to cope with problems.</Paragraph>
      <Warning>If you or someone you know has a gambling problem, call the National Problem Gambling Helpline: 1-800-522-4700 (US) or visit ncpgambling.org.</Warning>
      <SectionTitle>Signs of Problem Gambling</SectionTitle>
      <BulletList items={[
        'Spending more than you can afford to lose',
        'Chasing losses with larger and larger bets',
        'Gambling to escape personal problems or stress',
        'Lying to friends or family about your gambling activity',
        'Neglecting work, school, or relationships due to gambling',
        'Borrowing money to fund gambling sessions',
        'Feeling restless, irritable, or depressed when not gambling',
      ]} />
      <SectionTitle>Tools Available to You</SectionTitle>
      <BulletList items={[
        'Daily, weekly, and monthly deposit limits — set in Profile → Limits',
        'Session time reminders and pop-up notifications every 30/60/90 minutes',
        'Cooling-off period: temporarily lock your account from 24 hours to 30 days',
        'Self-exclusion: permanently block yourself from the platform',
        'Reality check: timed notifications showing session duration and net P&L',
        'Access to full gameplay and financial history at any time',
        'One-click access to professional gambling support resources',
      ]} />
      <SectionTitle>Setting Limits</SectionTitle>
      <Paragraph>Visit your Profile → Limits tab to set deposit limits, loss limits, and self-exclusion periods. Limits take effect immediately. Increasing a limit requires a mandatory 24-hour cooling-off period before taking effect. Decreasing limits applies instantly. Self-exclusion periods cannot be reversed once activated.</Paragraph>
      <SectionTitle>Underage Gambling Prevention</SectionTitle>
      <Paragraph>$Pc Casino strictly prohibits gambling by individuals under 18 years old (21 in some jurisdictions). We encourage parents to use parental control software such as Gamban, Netnanny, or Cybersitter to prevent minors from accessing gambling sites.</Paragraph>
    </div>
  );
}

function RulesContent() {
  return (
    <div>
      <Paragraph>These game rules apply to all games on $Pc Casino. By playing any game, you agree to these rules.</Paragraph>
      <SectionTitle>General Rules</SectionTitle>
      <BulletList items={[
        'All bets are final once placed and confirmed — no cancellations after submission',
        'Minimum and maximum bet limits apply per game and per table',
        'All games use provably fair RNG audited by independent third parties',
        'House edge is applied to all games as specified per game type',
        'Disconnection during a game does not void a placed bet',
        'In case of server error during an active bet, the dispute policy applies',
      ]} />
      <SectionTitle>Poker (Texas Hold\'em) — House Edge: 5% rake</SectionTitle>
      <BulletList items={[
        'Standard Texas Hold\'em rules apply with 5% pot rake',
        'Players may not collude. Collusion results in permanent ban',
        'All-in protection: hand completes even if player disconnects',
        'Side pots are calculated automatically by the server',
      ]} />
      <SectionTitle>Blackjack — House Edge: 0.5%</SectionTitle>
      <BulletList items={[
        'Dealer stands on soft 17. Blackjack pays 3:2',
        'Insurance is offered when dealer shows Ace (pays 2:1)',
        'Splitting allowed up to 3 times. Doubling down on any two cards',
        'Natural blackjack beats dealer 21',
      ]} />
      <SectionTitle>Roulette (European) — House Edge: 2.7%</SectionTitle>
      <BulletList items={[
        'Single zero (0) European wheel — better odds than American',
        'All standard inside and outside bets accepted',
        'Straight up: 35:1 | Split: 17:1 | Street: 11:1 | Corner: 8:1',
        'Red/Black, Odd/Even, High/Low all pay 1:1',
      ]} />
      <SectionTitle>Craps — House Edge: 1.4% (Pass Line)</SectionTitle>
      <BulletList items={[
        'Full casino craps rules with Pass/Don\'t Pass, Come/Don\'t Come',
        'Odds bets available behind Pass Line (no house edge on odds)',
        'Place bets, Field bets, and Proposition bets all supported',
        'Hardways pay 7:1 (Hard 4 & 10) and 9:1 (Hard 6 & 8)',
      ]} />
      <SectionTitle>Slots — House Edge: 3–8% (varies by machine)</SectionTitle>
      <BulletList items={[
        'RTP (Return to Player) ranges from 92% to 97% per machine',
        'Bonus rounds and free spins are triggered by scatter symbols',
        'Progressive jackpots accumulate across all players',
        'Maximum win per spin is capped at the table maximum',
      ]} />
      <SectionTitle>Bingo (75-Ball) — House Edge: 5%</SectionTitle>
      <BulletList items={[
        'Standard 75-ball bingo with B-I-N-G-O columns',
        'Prize pool is 95% of total buy-ins in that game session',
        'Winning patterns: any line, X, T, L, blackout (full card)',
        'Multiple winners split the jackpot equally',
      ]} />

      <SectionTitle><CasinoIcon name="prohibited" size={18} /> Anti-Cheating & Fair Play Policy</SectionTitle>
      <Warning>Any attempt to cheat, collude, or gain an unfair advantage will result in immediate permanent ban and forfeiture of all funds. No appeals for confirmed cheating cases.</Warning>
      <BulletList items={[
        'No direct messaging between players during active game sessions — private communication is disabled',
        'No sharing of hand cards, board state, or game information with other active players in any way',
        'No external communication tools (Discord, SMS, phone calls) to coordinate with opponents during play',
        'No use of bots, scripts, macros, or any automated software to play on your behalf',
        'No ghosting — do not allow someone else to view your screen and give hints during a live game',
        'No chip dumping — intentionally losing to transfer chips to another account is forbidden',
        'Players at the same physical location may not play at the same table — IP flagging is active',
        'Collusion (coordinating with other players to gain advantage over the table) is grounds for instant ban',
        'Attempted communication through bet patterns, timing tells, or other coded signals is prohibited',
      ]} />

      <SectionTitle>How We Detect Cheating</SectionTitle>
      <BulletList items={[
        'Real-time server-side monitoring of all bet patterns and timing data',
        'IP and device fingerprint clustering to detect multi-accounting',
        'Statistical analysis of win rates across suspicious player groupings',
        'Manual review triggered by player reports or automated anomaly alerts',
        'Blockchain ledger of all transactions to detect fund flow irregularities',
      ]} />

      <SectionTitle>How to Play — Step by Step</SectionTitle>
      <BulletList items={[
        'Step 1: Create your account (email or Google/Discord login)',
        'Step 2: Claim your 1B $Pc welcome bonus from the Rewards tab',
        'Step 3: Connect your crypto wallet to deposit real $Pc (optional)',
        'Step 4: Choose a game from the Casino Games section',
        'Step 5: Select your bet amount using the chip selector',
        'Step 6: Play — results are determined by provably fair RNG',
        'Step 7: Winnings credit instantly to your casino balance',
        'Step 8: Withdraw to your wallet anytime from Wallet → Withdraw',
      ]} />
    </div>
  );
}

function CryptoContent() {
  return (
    <div>
      <Paragraph>This policy governs all financial transactions on $Pc Casino, including deposits, withdrawals, and the use of $Pc token. Please read carefully — these rules protect both you and the platform.</Paragraph>
      <Warning>IMPORTANT: All financial transactions are processed in $Pc token, a cryptocurrency. Cryptocurrency values fluctuate and are not guaranteed. $Pc Casino is not responsible for token value changes affecting your balance.</Warning>
      <SectionTitle>1. Accepted Payment Methods</SectionTitle>
      <BulletList items={[
        '$Pc Token (primary native token) — via wallet connection',
        'SOL (Solana) — converted to $Pc at point of deposit',
        'ETH (Ethereum) — converted to $Pc at current market rate',
        'BTC (Bitcoin) — converted to $Pc at current market rate',
        'USDT / USDC (Stablecoins) — converted to $Pc at current price',
        'Credit/Debit card via PcPayments Command Center (where available)',
      ]} />
      <SectionTitle>2. Deposits</SectionTitle>
      <BulletList items={[
        'Minimum deposit: 100 $Pc (or equivalent in other crypto)',
        'No maximum deposit limit — contact support for very large deposits',
        'Deposits are typically credited within 1-3 blockchain confirmations',
        'Deposits are non-refundable once processed on-chain',
        'Only send supported tokens to deposit addresses — other tokens may be lost',
        'Deposit bonuses are credited separately and subject to wagering requirements',
      ]} />
      <SectionTitle>3. Withdrawals</SectionTitle>
      <BulletList items={[
        'Minimum withdrawal: 500 $Pc',
        'Maximum withdrawal per day: 10,000,000 $Pc without additional KYC',
        'Withdrawals above daily limit require KYC verification',
        'Processing time: up to 24 hours for standard withdrawals',
        'Priority withdrawals available for VIP members (processed within 2 hours)',
        'Withdrawal fees: Network gas fee only (no platform fee)',
        'Withdrawals may be delayed if flagged for security review',
      ]} />
      <SectionTitle>4. Getting Your Money Back (Refund Policy)</SectionTitle>
      <Warning>You have the right to request a refund if you can prove a verified malfunction occurred during your game session. See our Malfunction Policy for the full claims process.</Warning>
      <BulletList items={[
        'Refunds are only issued for verified technical malfunctions or platform errors',
        'User error (wrong bet, misunderstood rules) does not qualify for refund',
        'Refund requests must be submitted within 72 hours of the incident',
        'Evidence required: session ID, timestamp, game type, bet amount, screenshot/video',
        'Approved refunds are credited to your $Pc wallet within 48 hours',
        'Disputed refunds can be escalated to senior admin within 14 days',
        'If you believe fraud occurred, contact us immediately at support@pccasino.io',
      ]} />
      <SectionTitle>5. Bonus and Promotional Funds</SectionTitle>
      <BulletList items={[
        'Welcome bonus (1B $Pc) is for entertainment play only',
        'Bonus funds require 30x wagering requirement before withdrawal',
        'Referral bonuses (50M $Pc per referral) credited after referred user deposits',
        'Daily bonuses (50M $Pc) have a 5x wagering requirement',
        'Bonus abuse — creating multiple accounts to farm bonuses — results in permanent ban',
        'Tournament prize pool is always real withdrawable $Pc with no wagering requirement',
      ]} />
      <SectionTitle>6. Taxes and Reporting</SectionTitle>
      <Paragraph>Players are solely responsible for reporting gambling winnings to their local tax authority. $Pc Casino does not provide tax advice. In the United States, gambling winnings over $600 in a tax year may be reportable. In the EU and UK, specific gambling taxation rules vary by jurisdiction. Please consult a tax professional in your country.</Paragraph>
      <SectionTitle>7. Exchange and Token Value</SectionTitle>
      <Paragraph>$Pc token can be traded on supported DEX and CEX platforms. The exchange rate at time of withdrawal is used to calculate fiat equivalents. $Pc Casino does not guarantee any specific exchange rate. Market price fluctuations between deposit and withdrawal are the player's responsibility.</Paragraph>
      <SectionTitle>8. Failed or Reversed Transactions</SectionTitle>
      <BulletList items={[
        'On-chain transactions cannot be reversed once broadcast',
        'If a deposit transaction fails due to network issues, contact support with the TX hash',
        'Gas fees for failed transactions are borne by the sender',
        'Duplicate deposits (same TX hash submitted twice) will only be credited once',
      ]} />
    </div>
  );
}

function MalfunctionContent() {
  return (
    <div>
      <Paragraph>This policy explains how $Pc Casino handles technical malfunctions, game errors, and how players can claim refunds if a malfunction affected their game session.</Paragraph>
      <Warning>In the event of any malfunction or technical fault, $Pc Casino reserves the right to void bets affected by the error and refund the original wager. No profit from a malfunction will be honored.</Warning>
      <SectionTitle>What Qualifies as a Malfunction</SectionTitle>
      <BulletList items={[
        'Server crash or disconnect mid-hand that altered game state',
        'RNG failure — provably fair hash does not match game outcome',
        'Game client displaying incorrect card values or board state',
        'Payout calculation error resulting in incorrect win/loss amounts',
        'Double-charging a bet (same hand charged twice)',
        'Jackpot display showing incorrect amount at time of trigger',
        'Game freezing and auto-resolving with wrong outcome',
      ]} />
      <SectionTitle>What Does NOT Qualify</SectionTitle>
      <BulletList items={[
        'Player disconnects due to their own internet connection issues',
        'Player misreading game rules or misunderstanding bet types',
        'Losing a fair, properly resolved hand',
        'Slow game performance due to device limitations',
        'Expired bonus timer or session timeout',
      ]} />
      <SectionTitle>How to File a Malfunction Claim</SectionTitle>
      <BulletList items={[
        'Step 1: Note the Session ID, Game Type, Date/Time (shown in game header)',
        'Step 2: Screenshot or screen-record the malfunction as it happens',
        'Step 3: Go to Profile → Disputes → Submit New Dispute',
        'Step 4: Enter game type, session ID, describe the malfunction in detail',
        'Step 5: Upload screenshot or video evidence',
        'Step 6: Submit — you will receive a confirmation email/notification',
      ]} />
      <SectionTitle>Resolution Timeline</SectionTitle>
      <BulletList items={[
        'Initial acknowledgment: within 24 hours of submission',
        'Admin review period: 3–5 business days',
        'Additional evidence request (if needed): 48-hour response window',
        'Final decision and payout (if approved): within 48 hours of decision',
        'Dispute escalation deadline: 14 days after initial decision',
      ]} />
      <SectionTitle>Refund Amounts</SectionTitle>
      <Paragraph>If a malfunction claim is approved, the refund will be equal to the original bet amount wagered during the affected session. No winnings above the original bet will be paid from a malfunctioned round. If the error was a platform-side calculation error that short-changed a legitimate win, the correct payout differential will be issued.</Paragraph>
      <SectionTitle>Escalation</SectionTitle>
      <Paragraph>If you disagree with the admin's decision on your dispute, you may escalate to the Senior Review Team by clicking "Escalate" in your Disputes tab. Escalations are reviewed by a separate team within 7 business days. The escalation decision is final.</Paragraph>
    </div>
  );
}

function AMLContent() {
  return (
    <div>
      <Paragraph>$Pc Casino maintains a strict Anti-Money Laundering (AML) and Know Your Customer (KYC) policy in compliance with applicable financial regulations. All users are subject to these requirements.</Paragraph>
      <SectionTitle>Why AML/KYC Matters</SectionTitle>
      <Paragraph>AML and KYC procedures protect the integrity of the platform, prevent financial crime, and ensure we can accurately process large withdrawals. These requirements are standard across all regulated gambling platforms globally.</Paragraph>
      <SectionTitle>KYC Requirements</SectionTitle>
      <BulletList items={[
        'Cumulative lifetime withdrawals over $2,000 USD equivalent: Tier 1 KYC',
        'Cumulative lifetime withdrawals over $10,000 USD equivalent: Tier 2 KYC',
        'Suspicious activity flags: immediate KYC freeze on account',
        'Tier 1: Government-issued photo ID (passport, driver\'s license)',
        'Tier 2: Tier 1 + Proof of address (utility bill, bank statement dated within 90 days)',
        'Enhanced KYC (Tier 3): Source of funds documentation for very large accounts',
      ]} />
      <SectionTitle>Prohibited Activities (AML)</SectionTitle>
      <BulletList items={[
        'Using the casino to launder criminal proceeds',
        'Structuring deposits to avoid KYC thresholds (smurfing)',
        'Using another person\'s payment method or wallet',
        'Providing false or fraudulent KYC documents',
        'Operating on behalf of a sanctioned country or entity',
      ]} />
      <SectionTitle>Reporting Obligations</SectionTitle>
      <Paragraph>$Pc Casino reserves the right to report suspicious activity to relevant financial intelligence units (FIUs) and law enforcement agencies. This may be done without notifying the account holder. Accounts under investigation may be frozen pending review.</Paragraph>
      <SectionTitle>Fund Source Policy</SectionTitle>
      <Paragraph>By depositing funds, you confirm that the funds are legitimately yours and not derived from criminal activity. Large deposits may require a source-of-funds declaration. We reserve the right to request documentation before processing withdrawals for any reason.</Paragraph>
    </div>
  );
}

function CookiesContent() {
  return (
    <div>
      <Paragraph>This Cookie Policy explains how $Pc Casino uses cookies and similar tracking technologies on our platform.</Paragraph>
      <SectionTitle>What Are Cookies</SectionTitle>
      <Paragraph>Cookies are small text files stored on your device when you visit our site. They help us remember your preferences, keep you logged in, and understand how you use our platform.</Paragraph>
      <SectionTitle>Types of Cookies We Use</SectionTitle>
      <BulletList items={[
        'Essential cookies: Required for login sessions, security, and core platform function',
        'Preference cookies: Remember your settings (sound on/off, deck choice, language)',
        'Analytics cookies: Aggregate usage data to improve platform performance',
        'Security cookies: Detect and prevent fraudulent activity and bot access',
      ]} />
      <SectionTitle>Local Storage</SectionTitle>
      <Paragraph>In addition to cookies, we use browser local storage to save your game state, balance, transaction history, and preferences locally on your device. This data never leaves your device and is not transmitted to third parties.</Paragraph>
      <SectionTitle>Managing Cookies</SectionTitle>
      <Paragraph>You can disable non-essential cookies in your browser settings. Disabling essential cookies will prevent you from using the platform. You can clear local storage data at any time by logging out and clearing your browser data.</Paragraph>
    </div>
  );
}

function AffiliateContent() {
  return (
    <div>
      <Paragraph>The $Pc Casino Affiliate Program lets you earn real $Pc rewards by referring new players to the platform. There is no cap on earnings — the more active referrals you bring, the more you earn.</Paragraph>
      <Warning>Affiliate commissions are paid in $Pc token. Commissions are credited after a referred player makes their first qualifying deposit and places at least one real-money bet.</Warning>

      <SectionTitle>How to Join (Step-by-Step)</SectionTitle>
      <BulletList items={[
        'Step 1: Create or log into your $Pc Casino account',
        'Step 2: Navigate to Rewards → Referral Program',
        'Step 3: Copy your unique referral link or referral code',
        'Step 4: Share it anywhere — social media, Discord, YouTube, etc.',
        'Step 5: Each person who signs up through your link is tracked as your referral',
        'Step 6: Once they deposit and bet, your commission is credited automatically',
      ]} />

      <SectionTitle>Commission Structure</SectionTitle>
      <BulletList items={[
        'Welcome bonus per referral: 50,000,000 $Pc credited to you when they deposit',
        'Revenue share: 5% of all rake/house edge generated by your referrals — paid monthly',
        'Tier 1 (1–10 referrals): 5% revenue share on all referred players',
        'Tier 2 (11–50 referrals): 8% revenue share + priority support',
        'Tier 3 (51+ referrals): 12% revenue share + VIP status + custom promo materials',
        'Bonus: Extra 500M $Pc for every 10 active referrals in a calendar month',
      ]} />

      <SectionTitle>Rules & Requirements</SectionTitle>
      <BulletList items={[
        'You may not refer yourself or create fake accounts to earn commissions',
        'Self-referral or multi-accounting results in permanent ban and forfeiture of all commissions',
        'Referrals must be genuine new users — not existing players switching accounts',
        'Incentivized referrals (paying people to sign up) must be disclosed to the affiliate team',
        'Commissions are only earned on real-money play — not on bonus/free play wagers',
        'Commission payments are subject to the same withdrawal rules as regular balances',
        'We reserve the right to reverse commissions from players who were found cheating or banned',
      ]} />

      <SectionTitle>Tracking & Payments</SectionTitle>
      <BulletList items={[
        'Your referral dashboard shows all referred users, their activity, and your earnings in real-time',
        'Revenue share commissions are calculated monthly and credited on the 1st of each month',
        'Welcome bonuses are credited within 24 hours of the qualifying deposit',
        'Minimum payout threshold for revenue share: 1,000,000 $Pc',
        'No minimum for welcome bonuses — credited automatically per referral',
      ]} />

      <SectionTitle>Affiliate Link Rules</SectionTitle>
      <BulletList items={[
        'Do not advertise on platforms where gambling promotions are prohibited (some social networks)',
        'Do not use spam, unsolicited email, or bot-driven traffic to drive referrals',
        'Do not misrepresent the casino — affiliates are held to the same honesty standard as the platform',
        'Use of prohibited advertising methods results in affiliate account termination without payment',
      ]} />
    </div>
  );
}

function RewardsContent() {
  return (
    <div>
      <Paragraph>$Pc Casino has a comprehensive rewards system designed to reward both loyalty and high-volume play. All rewards are paid in $Pc token directly to your casino balance.</Paragraph>

      <SectionTitle>Welcome Bonus</SectionTitle>
      <BulletList items={[
        'Amount: 1,000,000,000 $Pc (1 Billion) on account creation',
        'Wagering requirement: 30× before withdrawal',
        'Example: You receive 1B $Pc. You must wager 30B $Pc total before withdrawing the bonus',
        'Valid for: 30 days from account creation',
        'Cannot be combined with deposit bonus on the same session',
      ]} />

      <SectionTitle>Daily Bonus (How to Claim)</SectionTitle>
      <BulletList items={[
        'Step 1: Log into your account',
        'Step 2: Click "Rewards" in the top navigation bar',
        'Step 3: Click "Claim Daily Bonus" — resets every 24 hours',
        'Amount: 50,000,000 $Pc per day',
        'Wagering requirement: 5× (250M $Pc must be wagered before withdrawal)',
        'Bonus available even if you have a balance — there is no maximum balance requirement',
      ]} />

      <SectionTitle>Referral Rewards</SectionTitle>
      <BulletList items={[
        'You earn 50,000,000 $Pc for each friend you refer who signs up and deposits',
        'Your friend receives an extra welcome bonus for using your code',
        'No wagering requirement on referral bonuses received from friends signing up with your code',
        'Referral bonus paid immediately after the referred user makes their first bet',
        'See the Affiliate Program tab for full referral commission details',
      ]} />

      <SectionTitle>VIP Program — 100M+ $Pc Holders</SectionTitle>
      <BulletList items={[
        'Hold 100,000,000+ $Pc in your wallet to unlock VIP status automatically',
        'VIP members can bet using fiat currencies (USD, EUR, GBP, etc.)',
        'VIP members can bet with top 25 cryptocurrencies (BTC, ETH, BNB, SOL, and more)',
        'VIP members can bet with commodities (Gold, Silver, Oil) at live market rates',
        'VIP members can deposit in any supported currency — auto-converted to $Pc',
        'VIP members receive priority withdrawals (processed within 2 hours)',
        'VIP members get a dedicated account manager and private support channel',
        'VIP badge displayed on profile and at the table for other players to see',
      ]} />

      <SectionTitle>Jackpot & Tournament Prizes</SectionTitle>
      <BulletList items={[
        'Progressive jackpot: accumulates from 1% of every slot spin, resets after each win',
        'Jackpot has no wagering requirement — full amount is withdrawable immediately',
        'Tournament prizes are always real withdrawable $Pc (no wagering requirement)',
        'Tournament entry fees are collected into the prize pool (zero house take)',
        'Regular tournaments run weekly — see Tournaments section in the app',
      ]} />

      <SectionTitle>Wagering Requirements Explained</SectionTitle>
      <BulletList items={[
        'Wagering requirement means you must bet the bonus amount × multiplier before withdrawing',
        'Example: 50M $Pc bonus with 5× wager = must bet 250M $Pc total across any game',
        'Any game counts toward wagering — poker, blackjack, roulette, slots, etc.',
        'Progress is shown in your Profile → Bonuses section',
        'If your balance reaches zero before completing wagering, the bonus is forfeited',
      ]} />

      <SectionTitle>Anti-Abuse Policy</SectionTitle>
      <BulletList items={[
        'Claiming bonuses across multiple accounts is strictly prohibited and will result in a ban',
        'Low-risk hedging strategies to clear wagering requirements may result in bonus cancellation',
        'We reserve the right to cancel any bonus and remove associated funds for abuse',
      ]} />
    </div>
  );
}

function renderContent(page: LegalPage) {
  switch (page) {
    case 'terms': return <TermsContent />;
    case 'privacy': return <PrivacyContent />;
    case 'responsible': return <ResponsibleContent />;
    case 'rules': return <RulesContent />;
    case 'crypto': return <CryptoContent />;
    case 'malfunction': return <MalfunctionContent />;
    case 'aml': return <AMLContent />;
    case 'cookies': return <CookiesContent />;
    case 'affiliate': return <AffiliateContent />;
    case 'rewards': return <RewardsContent />;
    default: return <RulesContent />;
  }
}

export function LegalPages({ isOpen, onClose, page, onChangePage }: LegalPagesProps) {
  const currentPage = pages.find(p => p.id === page) || pages[0];
  const Icon = currentPage.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[92vh] p-0 overflow-hidden" style={{
        background: 'rgba(6,6,12,0.99)',
        border: '1px solid rgba(212,175,55,0.3)',
        boxShadow: '0 0 60px rgba(0,0,0,0.9)',
      }}>
        <DialogHeader className="px-6 py-4 border-b border-white/10" style={{ background: 'linear-gradient(135deg, rgba(30,20,10,0.8), rgba(10,10,10,0.8))' }}>
          <DialogTitle className="flex items-center gap-3 font-casino text-lg" style={{ color: '#D4AF37' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #D4AF37, #B8860B)' }}>
              <Icon className="w-5 h-5 text-black" />
            </div>
            {currentPage.label}
          </DialogTitle>
        </DialogHeader>

        <div className="flex h-[calc(92vh-80px)]">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0 border-r border-white/10 py-2 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.3)' }}>
            {pages.map(p => {
              const PIcon = p.icon;
              return (
                <button key={p.id} onClick={() => onChangePage(p.id)}
                  className="w-full flex items-start gap-2 px-3 py-2.5 text-xs transition-all text-left"
                  style={{
                    color: page === p.id ? '#D4AF37' : '#9ca3af',
                    background: page === p.id ? 'rgba(212,175,55,0.1)' : 'transparent',
                    borderRight: page === p.id ? '2px solid #D4AF37' : '2px solid transparent',
                  }}>
                  <PIcon className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-6 max-w-2xl">
              {renderContent(page)}
              <div className="mt-8 pt-4 border-t border-white/10 text-xs text-gray-600">
                <p>$Pc Casino — PcCasino Holdings • pawncoinpc.com</p>
                <p className="mt-1">For questions about these policies, contact: legal@pccasino.io</p>
              </div>
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
