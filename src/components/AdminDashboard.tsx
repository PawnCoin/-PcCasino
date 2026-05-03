import { useState, useEffect } from 'react';
import { Shield, Users, DollarSign, AlertTriangle, Settings, BarChart3, Trophy, Zap, X, CheckCircle, XCircle, RefreshCw, Send, Key, Globe, Database, Crown, Star, BadgeCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { CasinoIcon } from '@/components/CasinoIcons';
import { adminPaymentsApi } from '@/lib/api';

const ADMIN_KEY = 'pcasino_admin_auth';

// Known AI/seed seat usernames used across the casino (poker AI seats,
// dominoes AI opponents, and the shared bingo/casino bot profile pool).
// Operators use this allowlist to pre-select rows in the bulk-flag picker so
// they can flip every existing AI account to is_bot in one click.
const AI_SEAT_NAMES = [
  // Poker AI seats
  'Taylor', 'Morgan', 'Jordan', 'Riley', 'Casey',
  // Dominoes AI opponents
  'Carlos', 'Maya', 'Zara',
  // Shared bingo/casino bot profile names
  'Jessica', 'Marcus', 'Priya', 'Tyler', 'Sofia', 'Derek', 'Aaliyah',
  'Cameron', 'Luna', 'Naomi', 'Ethan', 'Chloe', 'Ryan', 'Isabelle',
  'Nathan', 'Leo', 'Harper', 'Kevin', 'Brandon', 'Olivia', 'Dylan',
  'Aria', 'Trevor', 'Stella', 'Kai',
];
const AI_SEAT_ALLOWLIST = new Set(AI_SEAT_NAMES.map(n => n.toLowerCase()));

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
}

type AdminTab = 'overview' | 'users' | 'disputes' | 'tournaments' | 'payments' | 'affiliates' | 'kyc' | 'broadcast' | 'pcpayments' | 'vip' | 'settings';

export function AdminDashboard({ isOpen, onClose, isAdmin }: AdminDashboardProps) {
  const [isAuthed, setIsAuthed] = useState(() => isAdmin === true || localStorage.getItem(ADMIN_KEY) === 'true');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (isAdmin) setIsAuthed(true);
  }, [isAdmin]);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState({ playersOnline: 0, activeTables: 0, activeDisputes: 0, activeTournaments: 0, totalWon: 0 });
  const [disputes, setDisputes] = useState<any[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [broadcastType, setBroadcastType] = useState('info');
  const [pcpaymentsKey, setPcpaymentsKey] = useState('');
  const [pcpaymentsEndpoint, setPcpaymentsEndpoint] = useState('https://api.pcpayments.io/v1');
  const [pcpaymentsEnabled, setPcpaymentsEnabled] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [cashbackLog, setCashbackLog] = useState<any[]>([]);
  const [affiliatePayouts, setAffiliatePayouts] = useState<any[]>([]);
  const [kycQueue, setKycQueue] = useState<any[]>([]);
  const [kycRejectReason, setKycRejectReason] = useState<Record<number, string>>({});
  const [kycDocPreviews, setKycDocPreviews] = useState<Record<string, string | null>>({});
  const [kycDocLoading, setKycDocLoading] = useState<Record<string, boolean>>({});
  const [siteSettings, setSiteSettings] = useState({
    maintenanceMode: false, maxDeposit: 0, minWithdrawal: 100, houseEdge: 2.5, welcomeBonus: 1000000000,
  });

  // Demo-mode "Launch Reset" state — typed-confirmation modal
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetAmount, setResetAmount] = useState('10000');
  const [resetBusy, setResetBusy] = useState(false);
  const [resetExcluded, setResetExcluded] = useState<ExcludedCount | null>(null);

  // DB-backed user list (with bot/house flag columns) used by the Users tab.
  const [dbUsers, setDbUsers] = useState<DbUser[]>([]);
  const [dbUsersLoading, setDbUsersLoading] = useState(false);
  const [flagBusy, setFlagBusy] = useState<Record<number, boolean>>({});

  // Bulk-flag modal state
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Record<number, boolean>>({});
  const [bulkPrefix, setBulkPrefix] = useState('');
  const [bulkSetBot, setBulkSetBot] = useState(true);
  const [bulkSetHouse, setBulkSetHouse] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const loadDbUsers = async (): Promise<DbUser[]> => {
    const token = getToken();
    if (!token) return [];
    setDbUsersLoading(true);
    let users: DbUser[] = [];
    try {
      const res = await fetch('/api/admin/users/list', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data: { users: DbUser[] } = await res.json();
        users = data.users || [];
        setDbUsers(users);
      }
    } catch { /* ignore */ }
    setDbUsersLoading(false);
    return users;
  };

  const openBulkModal = async () => {
    const list = dbUsers.length === 0 ? await loadDbUsers() : dbUsers;
    const preselected: Record<number, boolean> = {};
    list.forEach(u => {
      if (!u.isBot && AI_SEAT_ALLOWLIST.has(u.username.toLowerCase())) preselected[u.id] = true;
    });
    setBulkSelected(preselected);
    setBulkPrefix('');
    setBulkSetBot(true);
    setBulkSetHouse(false);
    setBulkOpen(true);
  };

  const submitBulkFlags = async () => {
    const ids = Object.entries(bulkSelected).filter(([, v]) => v).map(([k]) => parseInt(k));
    if (ids.length === 0) { toast.error('Select at least one account'); return; }
    if (!bulkSetBot && !bulkSetHouse) { toast.error('Choose Bot and/or House to apply'); return; }
    const token = getToken();
    if (!token) { toast.error('Admin login required'); return; }
    const body: { userIds: number[]; isBot?: boolean; isHouse?: boolean } = { userIds: ids };
    if (bulkSetBot) body.isBot = true;
    if (bulkSetHouse) body.isHouse = true;
    setBulkBusy(true);
    try {
      const res = await fetch('/api/admin/users/flags-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || 'Bulk update failed');
      } else {
        const n = data.updatedCount ?? 0;
        toast.success(`Updated ${n} account${n === 1 ? '' : 's'}`);
        setBulkOpen(false);
        await loadDbUsers();
      }
    } catch {
      toast.error('Server unavailable');
    } finally {
      setBulkBusy(false);
    }
  };

  const toggleUserFlag = async (userId: number, key: 'isBot' | 'isHouse', value: boolean) => {
    const token = getToken();
    if (!token) { toast.error('Admin login required'); return; }
    setFlagBusy(prev => ({ ...prev, [userId]: true }));
    setDbUsers(prev => prev.map(u => u.id === userId ? { ...u, [key]: value } : u));
    try {
      const res = await fetch(`/api/admin/users/${userId}/flags`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [key]: value }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error || 'Failed to update flag');
        setDbUsers(prev => prev.map(u => u.id === userId ? { ...u, [key]: !value } : u));
      } else {
        toast.success(`${key === 'isBot' ? 'Bot' : 'House'} flag ${value ? 'set' : 'cleared'}`);
      }
    } catch {
      toast.error('Server unavailable');
      setDbUsers(prev => prev.map(u => u.id === userId ? { ...u, [key]: !value } : u));
    } finally {
      setFlagBusy(prev => ({ ...prev, [userId]: false }));
    }
  };

  const fetchExcludedCount = async (): Promise<ExcludedCount | null> => {
    const token = getToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/admin/users/excluded-count', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) return await res.json();
    } catch { /* ignore */ }
    return null;
  };

  const openResetModal = async () => {
    setResetConfirm('');
    setResetExcluded(null);
    setResetModalOpen(true);
    const counts = await fetchExcludedCount();
    if (counts) setResetExcluded(counts);
  };

  const runLaunchReset = async () => {
    if (resetConfirm !== 'RESET') {
      toast.error('Type RESET to confirm.');
      return;
    }
    const token = getToken();
    if (!token) {
      toast.error('Admin login required.');
      return;
    }
    setResetBusy(true);
    try {
      const res = await fetch('/api/admin/reset-balances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseInt(resetAmount) || 10000 }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Reset ${data.usersReset} players to ${data.resetAmount.toLocaleString()} $Pc`);
        setResetConfirm('');
        setResetModalOpen(false);
        loadData();
      } else {
        toast.error(data.error || 'Reset failed');
      }
    } catch {
      toast.error('Server unavailable');
    } finally {
      setResetBusy(false);
    }
  };

  const authAdmin = () => {
    toast.error('Direct admin access is disabled. Use your admin account.');
  };

  const getToken = () => localStorage.getItem('pcasino_token');

  const loadData = async () => {
    const token = getToken();
    const authHeader: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    try {
      const [statsRes, disputesRes, logsRes, usersRes, tournamentsRes, cashbackRes, affiliateRes, kycRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/disputes'),
        fetch('/api/admin/logs'),
        fetch('/api/admin/users'),
        fetch('/api/tournaments'),
        fetch('/api/admin/cashback-log'),
        fetch('/api/admin/affiliate-payouts', { headers: authHeader }),
        fetch('/api/kyc/admin/queue', { headers: authHeader }),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (disputesRes.ok) { const d = await disputesRes.json(); setDisputes(d.disputes || []); }
      if (logsRes.ok) { const l = await logsRes.json(); setLogs(l.logs || []); }
      if (usersRes.ok) { const u = await usersRes.json(); setUsers(u.users || []); }
      if (tournamentsRes.ok) { const t = await tournamentsRes.json(); setTournaments(t.tournaments || []); }
      if (cashbackRes.ok) { const c = await cashbackRes.json(); setCashbackLog(c.payments || []); }
      if (affiliateRes.ok) { const a = await affiliateRes.json(); setAffiliatePayouts(a.payouts || []); }
      if (kycRes.ok) { const k = await kycRes.json(); setKycQueue(k.queue || []); }
    } catch { /* server may not be running */ }
  };

  const loadKycDoc = async (submissionId: number, type: 'id' | 'selfie') => {
    const key = `${submissionId}_${type}`;
    if (kycDocPreviews[key] !== undefined) return; // already loaded
    const token = getToken();
    setKycDocLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await fetch(`/api/kyc/admin/${submissionId}/document/${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const d = await res.json();
        setKycDocPreviews(prev => ({ ...prev, [key]: d.data || null }));
      } else {
        setKycDocPreviews(prev => ({ ...prev, [key]: null }));
      }
    } catch {
      setKycDocPreviews(prev => ({ ...prev, [key]: null }));
    }
    setKycDocLoading(prev => ({ ...prev, [key]: false }));
  };

  const approveKyc = async (id: number, force = false) => {
    const token = getToken();
    try {
      const res = await fetch(`/api/kyc/admin/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ force }),
      });
      if (res.ok) { toast.success('KYC approved!'); loadData(); }
      else {
        const d = await res.json();
        if (d.code === 'IDENTITY_CONFLICT') {
          const accounts = (d.conflictingAccounts || []).map((a: any) => a.username).join(', ');
          toast.error(`Identity conflict: document already approved on ${accounts}. Use force approve to override.`);
          return;
        }
        toast.error(d.error || 'Failed');
      }
    } catch { toast.error('Server not available'); }
  };

  const rejectKyc = async (id: number) => {
    const reason = kycRejectReason[id];
    if (!reason?.trim()) { toast.error('Enter a rejection reason'); return; }
    const token = getToken();
    try {
      const res = await fetch(`/api/kyc/admin/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) { toast.success('KYC rejected'); loadData(); }
      else { const d = await res.json(); toast.error(d.error || 'Failed'); }
    } catch { toast.error('Server not available'); }
  };

  useEffect(() => { if (isOpen && isAuthed) loadData(); }, [isOpen, isAuthed]);
  useEffect(() => { if (isOpen && isAuthed && activeTab === 'users') loadDbUsers(); }, [isOpen, isAuthed, activeTab]);

  const resolveDispute = async (id: string, status: string, refundAmount: number, resolution: string) => {
    try {
      const res = await fetch(`/api/admin/disputes/${id}/resolve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, refundAmount, resolution }),
      });
      if (res.ok) { toast.success('Dispute resolved'); loadData(); }
    } catch { toast.error('Server not available'); }
  };

  const sendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    try {
      await fetch('/api/admin/broadcast', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: broadcastMsg, type: broadcastType }),
      });
      toast.success('Broadcast sent!');
      setBroadcastMsg('');
    } catch { toast.error('Server not available'); }
  };

  const savePcPayments = async () => {
    try {
      await fetch('/api/pcpayments/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: pcpaymentsKey, endpoint: pcpaymentsEndpoint, enabled: pcpaymentsEnabled }),
      });
      toast.success('PcPayments API configured');
    } catch { toast.error('Server not available'); }
  };

  const logout = () => { setIsAuthed(false); localStorage.removeItem(ADMIN_KEY); };

  const approveAffiliatePayout = async (id: number) => {
    const token = getToken();
    try {
      const res = await fetch(`/api/admin/affiliate-payouts/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({}),
      });
      if (res.ok) { toast.success('Payout approved'); loadData(); }
      else { const d = await res.json(); toast.error(d.error || 'Failed'); }
    } catch { toast.error('Server not available'); }
  };

  const rejectAffiliatePayout = async (id: number, note: string) => {
    const token = getToken();
    try {
      const res = await fetch(`/api/admin/affiliate-payouts/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ note }),
      });
      if (res.ok) { toast.success('Payout rejected'); loadData(); }
      else { const d = await res.json(); toast.error(d.error || 'Failed'); }
    } catch { toast.error('Server not available'); }
  };

  const tabs: { id: AdminTab; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { id: 'kyc', label: 'KYC Queue', icon: BadgeCheck },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy },
    { id: 'payments', label: 'Financials', icon: DollarSign },
    { id: 'affiliates', label: 'Affiliates', icon: Star },
    { id: 'broadcast', label: 'Broadcast', icon: Send },
    { id: 'pcpayments', label: 'PcPayments', icon: Key },
    { id: 'vip', label: 'VIP Cashback', icon: Crown },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const formatNum = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}K` : String(n);

  if (!isAuthed) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-sm" style={{ background: 'rgba(6,6,12,0.99)', border: '1px solid rgba(248,113,113,0.4)' }}>
          <DialogHeader>
            <DialogTitle className="text-red-400 flex items-center gap-2"><Shield className="w-5 h-5" /> Admin Access</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">This area is restricted to authorized administrators only.</p>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && authAdmin()}
              placeholder="Admin password"
              className="w-full px-3 py-2 rounded-lg outline-none text-sm"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
            />
            <Button onClick={authAdmin} className="w-full" style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171', border: '1px solid rgba(248,113,113,0.4)' }}>
              <Shield className="w-4 h-4 mr-2" /> Authenticate
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden" style={{ background: 'rgba(6,6,12,0.99)', border: '1px solid rgba(248,113,113,0.4)', boxShadow: '0 0 60px rgba(0,0,0,0.9)' }}>
        {/* Header */}
        <div className="px-5 py-3 border-b border-red-500/20 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, rgba(30,5,5,0.9), rgba(10,10,10,0.9))' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)' }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-red-400">$Pc Casino Admin</span>
            <span className="text-xs px-2 py-0.5 rounded-full text-red-300" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}>RESTRICTED</span>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={loadData} size="sm" style={{ background: 'rgba(255,255,255,0.07)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
            <Button onClick={logout} size="sm" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}>
              Logout
            </Button>
          </div>
        </div>

        <div className="flex h-[calc(92vh-56px)]">
          {/* Sidebar */}
          <div className="w-40 flex-shrink-0 border-r border-white/10 py-3" style={{ background: 'rgba(0,0,0,0.4)' }}>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium transition-all"
                  style={{
                    color: activeTab === tab.id ? '#f87171' : '#9ca3af',
                    background: activeTab === tab.id ? 'rgba(239,68,68,0.1)' : 'transparent',
                    borderRight: activeTab === tab.id ? '2px solid #ef4444' : '2px solid transparent',
                  }}>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {tab.label}
                  {tab.id === 'disputes' && disputes.filter(d => d.status === 'open').length > 0 && (
                    <span className="ml-auto text-xs bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center">
                      {disputes.filter(d => d.status === 'open').length}
                    </span>
                  )}
                  {tab.id === 'affiliates' && affiliatePayouts.filter(p => p.status === 'pending').length > 0 && (
                    <span className="ml-auto text-xs bg-yellow-500 text-black rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {affiliatePayouts.filter(p => p.status === 'pending').length}
                    </span>
                  )}
                  {tab.id === 'kyc' && kycQueue.length > 0 && (
                    <span className="ml-auto text-xs bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold">
                      {kycQueue.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <ScrollArea className="flex-1">
            <div className="p-5">

              {/* OVERVIEW */}
              {activeTab === 'overview' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white">Dashboard Overview</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Players Online', value: stats.playersOnline || 0, color: '#4ade80', iconName: 'people' },
                      { label: 'Active Tables', value: stats.activeTables || 0, color: '#60a5fa', iconName: 'dice' },
                      { label: 'Open Disputes', value: stats.activeDisputes || disputes.filter(d => d.status === 'open').length, color: '#f87171', iconName: 'warning' },
                      { label: 'Active Tournaments', value: stats.activeTournaments || tournaments.filter(t => t.status !== 'finished').length, color: '#facc15', iconName: 'trophy' },
                      { label: 'Total $Pc Won', value: formatNum(stats.totalWon || 0), color: '#D4AF37', iconName: 'money-bag' },
                      { label: 'Live Users', value: users.length, color: '#c084fc', iconName: 'globe' },
                    ].map(stat => (
                      <div key={stat.label} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="mb-1"><CasinoIcon name={stat.iconName} size={28} /></div>
                        <div className="font-bold text-xl" style={{ color: stat.color }}>{stat.value}</div>
                        <div className="text-xs text-gray-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="font-bold text-white text-sm mb-3">Recent Admin Activity</h4>
                    <div className="space-y-1.5">
                      {logs.slice(0, 10).map((log: any) => (
                        <div key={log.id} className="flex items-center gap-3 p-2.5 rounded-lg text-xs" style={{ background: 'rgba(255,255,255,0.03)' }}>
                          <span className="text-gray-500 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString()}</span>
                          <span className="text-yellow-400 font-medium">{log.action}</span>
                          <span className="text-gray-400 truncate">{JSON.stringify(log.data).slice(0, 60)}</span>
                        </div>
                      ))}
                      {logs.length === 0 && <div className="text-xs text-gray-500 text-center py-4">No activity logs yet</div>}
                    </div>
                  </div>
                </div>
              )}

              {/* USERS */}
              {activeTab === 'users' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white">User Management</h3>
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={openBulkModal}
                        size="sm"
                        data-testid="admin-bulk-flag-bots-btn"
                        style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.35)', fontSize: 12 }}
                      >
                        Bulk flag bot accounts
                      </Button>
                      <Button onClick={loadDbUsers} size="sm" style={{ background: 'rgba(255,255,255,0.07)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <RefreshCw className={`w-3.5 h-3.5 ${dbUsersLoading ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500" data-testid="admin-users-summary">
                    {dbUsers.length} accounts • bots: {dbUsers.filter(u => u.isBot).length} • house: {dbUsers.filter(u => u.isHouse).length} • admins: {dbUsers.filter(u => u.isAdmin).length}
                  </div>
                  <div className="space-y-2">
                    {dbUsers.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">{dbUsersLoading ? 'Loading users…' : 'No users found.'}</div>
                    ) : dbUsers.map(u => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                        data-testid={`admin-user-row-${u.id}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-sm">
                          {u.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white flex items-center gap-2">
                            <span className="truncate">{u.username}</span>
                            {u.isAdmin && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>ADMIN</span>}
                            {u.isBot && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>BOT</span>}
                            {u.isHouse && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>HOUSE</span>}
                          </div>
                          <div className="text-xs text-gray-400 truncate">#{u.id} • {u.email || 'no email'}</div>
                        </div>
                        <div className="text-xs text-green-400 hidden md:block">{u.balance ? `${(u.balance / 1_000_000).toFixed(1)}M $Pc` : '0'}</div>
                        <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none" data-testid={`admin-user-${u.id}-bot-toggle`}>
                          <input
                            type="checkbox"
                            checked={u.isBot}
                            disabled={!!flagBusy[u.id]}
                            onChange={e => toggleUserFlag(u.id, 'isBot', e.target.checked)}
                            className="accent-blue-500"
                          />
                          Bot
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none" data-testid={`admin-user-${u.id}-house-toggle`}>
                          <input
                            type="checkbox"
                            checked={u.isHouse}
                            disabled={!!flagBusy[u.id]}
                            onChange={e => toggleUserFlag(u.id, 'isHouse', e.target.checked)}
                            className="accent-yellow-500"
                          />
                          House
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 className="font-bold text-white text-sm mb-3">User Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {['Ban User', 'Adjust Balance', 'Reset Password', 'Force Logout', 'Add Bonus', 'View Session'].map(action => (
                        <Button key={action} onClick={() => toast.info('Requires production backend with DB')} size="sm"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }}>
                          {action}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* DISPUTES */}
              {activeTab === 'disputes' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white">Dispute Management</h3>
                  {disputes.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No open disputes</p>
                    </div>
                  ) : disputes.map((d: any) => (
                    <div key={d.id} className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${d.status === 'open' ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.2)'}` }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white text-sm">{d.username}</span>
                          <span className="ml-2 text-xs text-gray-400">• {d.game}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: d.status === 'open' ? 'rgba(248,113,113,0.15)' : 'rgba(74,222,128,0.1)', color: d.status === 'open' ? '#f87171' : '#4ade80' }}>
                          {d.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{d.description}</p>
                      <div className="text-xs text-gray-500">Amount: {d.amount.toLocaleString()} $Pc • {new Date(d.createdAt).toLocaleString()}</div>
                      {d.status === 'open' && (
                        <div className="flex gap-2">
                          <Button onClick={() => resolveDispute(d.id, 'approved', d.amount, 'Malfunction confirmed - full refund issued')} size="sm"
                            style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)', fontSize: 11 }}>
                            <CheckCircle className="w-3 h-3 mr-1" /> Approve & Refund
                          </Button>
                          <Button onClick={() => resolveDispute(d.id, 'denied', 0, 'No malfunction detected')} size="sm"
                            style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', fontSize: 11 }}>
                            <XCircle className="w-3 h-3 mr-1" /> Deny
                          </Button>
                          <Button onClick={() => resolveDispute(d.id, 'partial', Math.floor(d.amount / 2), 'Partial refund issued')} size="sm"
                            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', fontSize: 11 }}>
                            Partial Refund
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* KYC QUEUE */}
              {activeTab === 'kyc' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white">KYC Review Queue</h3>
                    <Button onClick={loadData} size="sm" style={{ background: 'rgba(255,255,255,0.07)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {kycQueue.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No pending KYC submissions</p>
                    </div>
                  ) : kycQueue.map((sub: any) => (
                    <div key={sub.id} className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(59,130,246,0.3)' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-bold text-white text-sm">{sub.username}</span>
                          <span className="ml-2 text-xs text-gray-400">• ID: {sub.user_id}</span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                          PENDING
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div><span className="text-gray-500">Email:</span> <span className="text-gray-300">{sub.email || '\u2014'}</span> {sub.email_verified ? <span className="text-green-400">\u2713</span> : <span className="text-red-400">\u2717</span>}</div>
                        <div><span className="text-gray-500">Phone:</span> <span className="text-gray-300">{sub.phone_number || '\u2014'}</span> {sub.phone_verified ? <span className="text-green-400">\u2713</span> : <span className="text-red-400">\u2717</span>}</div>
                        <div><span className="text-gray-500">Submitted:</span> <span className="text-gray-300">{new Date(sub.submitted_at).toLocaleString()}</span></div>
                        <div><span className="text-gray-500">Doc ID:</span> <span className="text-gray-400 font-mono text-[10px]">{(sub.id_document_path || '—').slice(0, 30)}</span></div>
                      </div>

                      {sub.linked_profiles?.length > 0 && (
                        <div className="p-2 rounded-lg text-xs" style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)' }}>
                          <span className="text-red-400 font-bold">IDENTITY MATCH DETECTED</span>
                          <span className="text-gray-400 ml-2">Same document used by: {sub.linked_profiles.map((p: any) => `${p.username} (ID: ${p.user_id})`).join(', ')}</span>
                        </div>
                      )}

                      <div className="p-3 rounded-lg text-xs space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <p className="text-gray-500 mb-1 font-medium">Document Preview</p>
                        <div className="flex gap-2">
                          {(['id', 'selfie'] as const).map(docType => {
                            const key = `${sub.id}_${docType}`;
                            const docData = kycDocPreviews[key];
                            const loading = kycDocLoading[key];
                            return (
                              <div key={docType} className="flex-1">
                                {docData === undefined ? (
                                  <button onClick={() => loadKycDoc(sub.id, docType)}
                                    className="w-full py-1.5 rounded-lg text-center transition-colors"
                                    style={{ background: docType === 'id' ? 'rgba(59,130,246,0.1)' : 'rgba(168,85,247,0.1)', border: `1px solid ${docType === 'id' ? 'rgba(59,130,246,0.3)' : 'rgba(168,85,247,0.3)'}`, color: docType === 'id' ? '#60a5fa' : '#c084fc' }}>
                                    {loading ? 'Loading...' : docType === 'id' ? 'Load ID Doc' : 'Load Selfie'}
                                  </button>
                                ) : docData ? (
                                  <img src={docData} alt={docType === 'id' ? 'ID Document' : 'Selfie'} className="w-full rounded-lg max-h-32 object-contain" style={{ border: '1px solid rgba(255,255,255,0.15)' }} />
                                ) : (
                                  <div className="w-full py-2 text-center text-gray-500 rounded-lg" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>No doc</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-gray-600 font-mono text-[9px] break-all">{sub.id_document_path}</div>
                      </div>

                      <div className="flex gap-2 items-center flex-wrap">
                        <Button onClick={() => approveKyc(sub.id)} size="sm"
                          style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)', fontSize: 11 }}>
                          <CheckCircle className="w-3 h-3 mr-1" /> Approve
                        </Button>
                        {sub.linked_profiles?.length > 0 && (
                          <Button onClick={() => approveKyc(sub.id, true)} size="sm"
                            style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.4)', fontSize: 11 }}>
                            Force Approve
                          </Button>
                        )}
                        <input
                          type="text"
                          value={kycRejectReason[sub.id] || ''}
                          onChange={e => setKycRejectReason(prev => ({ ...prev, [sub.id]: e.target.value }))}
                          placeholder="Rejection reason..."
                          className="flex-1 px-2 py-1 rounded-lg text-xs"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                        />
                        <Button onClick={() => rejectKyc(sub.id)} size="sm"
                          style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', fontSize: 11 }}>
                          <XCircle className="w-3 h-3 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TOURNAMENTS */}
              {activeTab === 'tournaments' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white">Tournament Management</h3>
                  {tournaments.map((t: any) => (
                    <div key={t.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white text-sm">{t.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full text-green-400" style={{ background: 'rgba(74,222,128,0.1)' }}>{t.status}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div><div className="text-gray-400">Entry Fee</div><div className="text-yellow-400">{(t.entryFee / 1000).toFixed(0)}K $Pc</div></div>
                        <div><div className="text-gray-400">Prize Pool</div><div className="text-green-400">{(t.prizePool / 1000).toFixed(0)}K $Pc</div></div>
                        <div><div className="text-gray-400">Players</div><div className="text-white">{t.registeredPlayers}/{t.maxPlayers}</div></div>
                        <div><div className="text-gray-400">Type</div><div className="text-purple-400">{t.type}</div></div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button onClick={() => toast.info('Feature requires production DB')} size="sm" style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)', fontSize: 11 }}>Start</Button>
                        <Button onClick={() => toast.info('Feature requires production DB')} size="sm" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', fontSize: 11 }}>Cancel</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PAYMENTS */}
              {activeTab === 'payments' && (
                <PaymentsAdminTab />
              )}

              {/* BROADCAST */}
              {activeTab === 'broadcast' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white">Site-wide Broadcast</h3>
                  <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div>
                      <label className="text-sm text-gray-300 mb-2 block">Message Type</label>
                      <div className="flex gap-2">
                        {['info', 'warning', 'success', 'promo'].map(type => (
                          <button key={type} onClick={() => setBroadcastType(type)}
                            className="px-3 py-1.5 rounded-lg text-xs capitalize transition-all"
                            style={{
                              background: broadcastType === type ? 'rgba(212,175,55,0.2)' : 'rgba(255,255,255,0.05)',
                              color: broadcastType === type ? '#D4AF37' : '#9ca3af',
                              border: broadcastType === type ? '1px solid rgba(212,175,55,0.4)' : '1px solid rgba(255,255,255,0.1)',
                            }}>
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-300 mb-2 block">Message</label>
                      <textarea
                        value={broadcastMsg}
                        onChange={e => setBroadcastMsg(e.target.value)}
                        placeholder="Enter broadcast message for all users..."
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                      />
                    </div>
                    <Button onClick={sendBroadcast} className="w-full" style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.4)' }}>
                      <Send className="w-4 h-4 mr-2" /> Broadcast to All Users
                    </Button>
                  </div>
                  <EmailTestPanel getToken={getToken} />
                </div>
              )}

              {/* AFFILIATES */}
              {activeTab === 'affiliates' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white">Affiliate Payout Requests</h3>
                    <span className="text-xs px-2 py-1 rounded-full" style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.2)' }}>
                      {affiliatePayouts.filter(p => p.status === 'pending').length} pending
                    </span>
                  </div>
                  {affiliatePayouts.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 text-sm">No payout requests yet</div>
                  ) : (
                    <div className="space-y-3">
                      {affiliatePayouts.map(payout => (
                        <div key={payout.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${payout.status === 'pending' ? 'rgba(212,175,55,0.3)' : payout.status === 'approved' ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.08)'}` }}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-white text-sm">{payout.username}</span>
                                <span
                                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                                  style={{
                                    background: payout.status === 'pending' ? 'rgba(212,175,55,0.15)' : payout.status === 'approved' ? 'rgba(74,222,128,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: payout.status === 'pending' ? '#D4AF37' : payout.status === 'approved' ? '#4ade80' : '#f87171',
                                    border: `1px solid ${payout.status === 'pending' ? 'rgba(212,175,55,0.3)' : payout.status === 'approved' ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                  }}
                                >
                                  {payout.status.toUpperCase()}
                                </span>
                              </div>
                              <div className="text-lg font-bold" style={{ color: '#D4AF37' }}>
                                {parseInt(payout.amount).toLocaleString()} $Pc
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                Requested: {new Date(payout.created_at).toLocaleString()}
                                {payout.processed_at && ` • Processed: ${new Date(payout.processed_at).toLocaleString()}`}
                              </div>
                              {payout.admin_note && (
                                <div className="text-xs text-gray-400 mt-1">Note: {payout.admin_note}</div>
                              )}
                            </div>
                            {payout.status === 'pending' && (
                              <div className="flex flex-col gap-2 flex-shrink-0">
                                <Button
                                  onClick={() => approveAffiliatePayout(payout.id)}
                                  size="sm"
                                  style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)', fontSize: 11 }}
                                >
                                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                                </Button>
                                <Button
                                  onClick={() => rejectAffiliatePayout(payout.id, 'Rejected by admin')}
                                  size="sm"
                                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11 }}
                                >
                                  <XCircle className="w-3 h-3 mr-1" /> Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PCPAYMENTS */}
              {activeTab === 'pcpayments' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white">PcPayments Command Center API</h3>
                  <div className="p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)' }}>
                    <div className="flex items-center gap-3 mb-3">
                      <img src="/logos/pc-logo.png" alt="$Pc" className="w-8 h-8" />
                      <div>
                        <div className="font-bold text-yellow-400 text-sm">$PcPay Integration</div>
                        <div className="text-xs text-gray-400">Connect to the PcPayments Command Center for deposits, withdrawals & crypto settlements</div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-300 mb-1.5 block">API Endpoint</label>
                      <input value={pcpaymentsEndpoint} onChange={e => setPcpaymentsEndpoint(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-300 mb-1.5 block">API Key</label>
                      <input type="password" value={pcpaymentsKey} onChange={e => setPcpaymentsKey(e.target.value)} placeholder="pk_live_..."
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }} />
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <button onClick={() => setPcpaymentsEnabled(!pcpaymentsEnabled)}
                        className="w-10 h-5 rounded-full transition-all relative flex-shrink-0"
                        style={{ background: pcpaymentsEnabled ? '#D4AF37' : 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: pcpaymentsEnabled ? '1.25rem' : '0.125rem' }} />
                      </button>
                      <span className="text-sm text-gray-300">Enable PcPayments Integration</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
                      <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="font-bold text-white mb-0.5">Webhook URL</div>
                        <code className="text-yellow-400">/api/pcpayments/webhook</code>
                      </div>
                      <div className="p-2 rounded" style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <div className="font-bold text-white mb-0.5">Supported Events</div>
                        <div>deposit, withdrawal, refund</div>
                      </div>
                    </div>
                    <Button onClick={savePcPayments} className="w-full" style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.4)' }}>
                      <Key className="w-4 h-4 mr-2" /> Save PcPayments Configuration
                    </Button>
                  </div>
                </div>
              )}

              {/* VIP CASHBACK */}
              {activeTab === 'vip' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white flex items-center gap-2">
                      <Crown className="w-4 h-4 text-purple-400" />
                      VIP Cashback Payment Log
                    </h3>
                    <span className="text-xs text-gray-400">{cashbackLog.length} total payments</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-2">
                    {['silver', 'gold', 'platinum', 'diamond'].map(tier => {
                      const tierPayments = cashbackLog.filter(p => p.tier === tier);
                      const tierTotal = tierPayments.reduce((s: number, p: any) => s + p.amount, 0);
                      const colors: Record<string, string> = { silver: '#C0C0C0', gold: '#FFD700', platinum: '#E5E4E2', diamond: '#B9F2FF' };
                      return (
                        <div key={tier} className="p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div className="text-xs font-bold capitalize mb-0.5" style={{ color: colors[tier] }}>{tier}</div>
                          <div className="font-bold text-sm text-white">{tierPayments.length} payments</div>
                          <div className="text-xs text-gray-400">{formatNum(tierTotal)} $Pc</div>
                        </div>
                      );
                    })}
                  </div>

                  {cashbackLog.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <Crown className="w-10 h-10 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">No cashback payments processed yet.</p>
                      <p className="text-xs mt-1">Payments run every Monday at midnight UTC.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cashbackLog.map((payment: any) => {
                        const tierColors: Record<string, string> = { silver: '#C0C0C0', gold: '#FFD700', platinum: '#E5E4E2', diamond: '#B9F2FF' };
                        const tierColor = tierColors[payment.tier] || '#c084fc';
                        return (
                          <div key={payment.id} className="flex items-center gap-3 p-3 rounded-xl text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(160,32,240,0.2)' }}>
                              <Crown className="w-3.5 h-3.5" style={{ color: tierColor }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-bold text-white">{payment.username}</span>
                              <span className="ml-2 px-1.5 py-0.5 rounded text-xs capitalize" style={{ background: `${tierColor}20`, color: tierColor }}>{payment.tier}</span>
                            </div>
                            <div className="text-gray-400 hidden md:block">
                              {new Date(payment.weekStart).toLocaleDateString()} – {new Date(payment.weekEnd).toLocaleDateString()}
                            </div>
                            <div className="text-gray-400 text-xs">
                              Losses: {formatNum(payment.netLosses)}
                            </div>
                            <div className="font-bold text-green-400">+{formatNum(payment.amount)} $Pc</div>
                            <div className="text-gray-500 flex-shrink-0">{new Date(payment.createdAt).toLocaleDateString()}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS */}
              {activeTab === 'settings' && (
                <div className="space-y-4">
                  <h3 className="font-bold text-white">Site Settings</h3>
                  <div className="p-4 rounded-xl space-y-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-white font-medium">Maintenance Mode</div>
                        <div className="text-xs text-gray-400">Block all players except admins</div>
                      </div>
                      <button onClick={() => setSiteSettings(s => ({ ...s, maintenanceMode: !s.maintenanceMode }))}
                        className="w-10 h-5 rounded-full transition-all relative"
                        style={{ background: siteSettings.maintenanceMode ? '#ef4444' : 'rgba(255,255,255,0.1)' }}>
                        <div className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                          style={{ left: siteSettings.maintenanceMode ? '1.25rem' : '0.125rem' }} />
                      </button>
                    </div>
                    {[
                      { key: 'houseEdge', label: 'House Edge %', type: 'number', step: 0.1, min: 0, max: 25 },
                      { key: 'minWithdrawal', label: 'Min Withdrawal ($Pc)', type: 'number' },
                      { key: 'maxDeposit', label: 'Max Deposit ($Pc, 0=unlimited)', type: 'number' },
                      { key: 'welcomeBonus', label: 'Welcome Bonus ($Pc)', type: 'number' },
                    ].map(field => (
                      <div key={field.key}>
                        <label className="text-sm text-gray-300 mb-1.5 block">{field.label}</label>
                        <input
                          type={field.type}
                          value={(siteSettings as any)[field.key]}
                          onChange={e => setSiteSettings(s => ({ ...s, [field.key]: Number(e.target.value) }))}
                          className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                        />
                      </div>
                    ))}
                    <Button onClick={() => toast.success('Settings saved')} className="w-full" style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)' }}>
                      Save Settings
                    </Button>
                  </div>

                  {/* DEMO LAUNCH RESET CARD */}
                  <div
                    className="p-4 rounded-xl space-y-3"
                    style={{
                      background: 'linear-gradient(135deg, rgba(239,68,68,0.10), rgba(251,191,36,0.06))',
                      border: '1px solid rgba(239,68,68,0.45)',
                    }}
                    data-testid="admin-launch-reset-card"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-red-300">Reset all balances for launch</div>
                        <div className="text-xs text-gray-400 mt-1 leading-snug">
                          Wipes every non-admin, non-bot, non-house account's balance, total wagered, total won, and VIP tier. Use this once when toggling demo mode off to give every player a clean starting balance for the real launch. <span className="text-red-300 font-semibold">This cannot be undone.</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-gray-300 mb-1 block">New starting balance ($Pc)</label>
                      <input
                        type="number"
                        min="0"
                        value={resetAmount}
                        onChange={e => setResetAmount(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                        data-testid="admin-reset-amount-input"
                      />
                    </div>

                    <Button
                      onClick={openResetModal}
                      className="w-full"
                      style={{ background: 'rgba(239,68,68,0.25)', color: '#fecaca', border: '1px solid rgba(239,68,68,0.5)' }}
                      data-testid="admin-reset-open-modal-button"
                    >
                      Reset all balances for launch…
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>

      {/* Typed-confirmation modal for "Launch Reset" */}
      <Dialog open={resetModalOpen} onOpenChange={(o) => { if (!resetBusy) setResetModalOpen(o); }}>
        <DialogContent
          className="max-w-md"
          style={{ background: 'rgba(6,6,12,0.99)', border: '1px solid rgba(239,68,68,0.5)' }}
          data-testid="admin-reset-confirm-modal"
        >
          <DialogHeader>
            <DialogTitle className="text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Confirm Launch Reset
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-300">
            <p>
              You are about to wipe every non-admin, non-bot, non-house balance and reset
              total wagered, total won, and VIP tier. New starting balance:{' '}
              <span className="text-amber-300 font-semibold">
                {(parseInt(resetAmount) || 10000).toLocaleString()} $Pc
              </span>.
            </p>
            <div
              className="text-xs px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
              data-testid="admin-reset-excluded-summary"
            >
              {resetExcluded ? (
                <>
                  <div>
                    <span className="text-amber-300 font-semibold">{resetExcluded.resettable.toLocaleString()}</span> account(s) will be reset.
                  </div>
                  <div className="text-gray-400 mt-0.5">
                    <span className="text-gray-200 font-semibold">{resetExcluded.excluded.toLocaleString()}</span> will be skipped — admins: {resetExcluded.admins}, bots: {resetExcluded.bots}, house: {resetExcluded.house}.
                  </div>
                </>
              ) : (
                <span className="text-gray-400">Loading exclusion preview…</span>
              )}
            </div>
            <p className="text-red-300 text-xs">This cannot be undone.</p>
            <div>
              <label className="text-xs text-gray-300 mb-1 block">
                Type <span className="font-mono text-red-300">RESET</span> to confirm
              </label>
              <input
                type="text"
                autoFocus
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
                placeholder="RESET"
                className="w-full px-3 py-2 rounded-lg text-sm outline-none font-mono"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(239,68,68,0.4)', color: 'white' }}
                data-testid="admin-reset-confirm-input"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setResetModalOpen(false)}
                disabled={resetBusy}
                className="flex-1"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.15)' }}
                data-testid="admin-reset-cancel-button"
              >
                Cancel
              </Button>
              <Button
                onClick={runLaunchReset}
                disabled={resetBusy || resetConfirm !== 'RESET'}
                className="flex-1"
                style={{
                  background: resetConfirm === 'RESET' ? 'rgba(239,68,68,0.35)' : 'rgba(255,255,255,0.05)',
                  color: resetConfirm === 'RESET' ? '#fecaca' : '#6b7280',
                  border: '1px solid rgba(239,68,68,0.5)',
                }}
                data-testid="admin-reset-launch-button"
              >
                {resetBusy ? 'Resetting…' : 'Launch Reset'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk-flag picker — used for the one-click "mark all AI seat accounts as bots" workflow */}
      <Dialog open={bulkOpen} onOpenChange={(o) => { if (!bulkBusy) setBulkOpen(o); }}>
        <DialogContent
          className="max-w-lg"
          style={{ background: 'rgba(6,6,12,0.99)', border: '1px solid rgba(96,165,250,0.4)' }}
          data-testid="admin-bulk-flag-modal"
        >
          <DialogHeader>
            <DialogTitle className="text-blue-300">Bulk flag bot accounts</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-gray-300">
            <p className="text-xs text-gray-400">
              Pre-selected: every account whose username matches a known AI-seat name and that
              isn't already flagged. Refine with a username prefix and adjust the checkboxes
              below before applying.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={bulkPrefix}
                onChange={(e) => setBulkPrefix(e.target.value)}
                placeholder="Username prefix filter (e.g. ai_, bot_, taylor)"
                className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                data-testid="admin-bulk-prefix-input"
              />
              <Button
                size="sm"
                onClick={() => {
                  const pfx = bulkPrefix.trim().toLowerCase();
                  if (!pfx) { toast.error('Enter a prefix first'); return; }
                  setBulkSelected(prev => {
                    const next = { ...prev };
                    dbUsers.forEach(u => {
                      if (u.username.toLowerCase().startsWith(pfx)) next[u.id] = true;
                    });
                    return next;
                  });
                }}
                style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.35)', fontSize: 11 }}
                data-testid="admin-bulk-prefix-apply"
              >
                Add matches
              </Button>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={bulkSetBot} onChange={e => setBulkSetBot(e.target.checked)} className="accent-blue-500" data-testid="admin-bulk-set-bot" />
                Set Bot = true
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer select-none">
                <input type="checkbox" checked={bulkSetHouse} onChange={e => setBulkSetHouse(e.target.checked)} className="accent-yellow-500" data-testid="admin-bulk-set-house" />
                Set House = true
              </label>
              <span className="ml-auto text-gray-400" data-testid="admin-bulk-selected-count">
                {Object.values(bulkSelected).filter(Boolean).length} selected
              </span>
            </div>
            <div
              className="rounded-lg max-h-72 overflow-y-auto p-2 space-y-1"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
              data-testid="admin-bulk-user-list"
            >
              {dbUsers.length === 0 ? (
                <div className="text-xs text-gray-500 py-4 text-center">No users loaded.</div>
              ) : dbUsers.map(u => {
                const known = AI_SEAT_ALLOWLIST.has(u.username.toLowerCase());
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs hover:bg-white/5"
                    data-testid={`admin-bulk-row-${u.id}`}
                  >
                    <input
                      type="checkbox"
                      checked={!!bulkSelected[u.id]}
                      onChange={(e) => setBulkSelected(prev => ({ ...prev, [u.id]: e.target.checked }))}
                      className="accent-blue-500"
                    />
                    <span className="text-white truncate flex-1">{u.username}</span>
                    {known && <span className="text-[10px] text-blue-300">AI seat</span>}
                    {u.isBot && <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa' }}>BOT</span>}
                    {u.isHouse && <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>HOUSE</span>}
                    {u.isAdmin && <span className="text-[10px] px-1 rounded" style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171' }}>ADMIN</span>}
                    <span className="text-gray-500">#{u.id}</span>
                  </label>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => setBulkOpen(false)}
                disabled={bulkBusy}
                className="flex-1"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.15)' }}
                data-testid="admin-bulk-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={submitBulkFlags}
                disabled={bulkBusy || Object.values(bulkSelected).filter(Boolean).length === 0}
                className="flex-1"
                style={{ background: 'rgba(96,165,250,0.25)', color: '#bfdbfe', border: '1px solid rgba(96,165,250,0.5)' }}
                data-testid="admin-bulk-apply"
              >
                {bulkBusy ? 'Applying…' : 'Apply flags'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

interface DbUser {
  id: number;
  username: string;
  email: string | null;
  balance: number;
  vipTier: string | null;
  isAdmin: boolean;
  isBot: boolean;
  isHouse: boolean;
  createdAt: string | null;
  lastSeen: string | null;
}

interface ExcludedCount {
  admins: number;
  bots: number;
  house: number;
  excluded: number;
  resettable: number;
  total: number;
}

interface EmailStatusCounters { day: string | null; sent: number; failed: number }
interface EmailStatus {
  ready: boolean;
  reason: string;
  from: string;
  replyTo: string | null;
  counters?: EmailStatusCounters;
}
interface EmailTestResponse {
  success?: boolean;
  messageId?: string;
  response?: string;
  error?: string;
  code?: string | number;
  status?: EmailStatus;
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'unknown';
}

type DepositRow = {
  id: number; user_id: number; username: string; email?: string;
  amount: string; tx_hash: string | null; from_address: string | null;
  network: string; status: string; admin_note: string | null;
  created_at: string; processed_at: string | null;
};
type WithdrawRow = {
  id: number; user_id: number; username: string; email?: string;
  amount: string; to_address: string; network: string; status: string;
  tx_hash: string | null; admin_note: string | null;
  created_at: string; processed_at: string | null;
};

type PayoutHealth = {
  configured: boolean;
  demoMode: boolean;
  address: string | null;
  pcBalance: string | null;
  ethBalance: string | null;
  balanceError: string | null;
  breaker: {
    tripped: boolean;
    reason: string | null;
    consecutiveFailures: number;
    lastResetAt: string | null;
    limits: Record<string, string | number>;
  };
  totals: { burst1h: string; sent24h: string; count24h: number };
  explorerBase?: string;
  recent: Array<{
    id: number; withdraw_id: number | null; status: string; tx_hash: string | null;
    amount: string; to_address: string | null; error_message: string | null;
    nonce: number | null; created_at: string; username: string | null;
  }>;
};

function PayoutHealthPanel() {
  const [data, setData] = useState<PayoutHealth | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const h = await adminPaymentsApi.payoutHealth();
      setData(h);
    } catch (err) { toast.error(errorMessage(err)); }
    setLoading(false);
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = async () => {
    if (!window.confirm('Reset the payout circuit breaker? Auto-payouts will resume immediately.')) return;
    setResetting(true);
    try {
      await adminPaymentsApi.resetPayoutBreaker();
      toast.success('Circuit breaker reset');
      await load();
    } catch (err) { toast.error(errorMessage(err)); }
    setResetting(false);
  };

  // Safe BigInt formatter — returns '—' for null/empty/non-numeric inputs so
  // the panel never crashes while data is still loading.
  const fmtPc = (s: string | number | null | undefined) => {
    if (s === null || s === undefined || s === '') return '—';
    try { return BigInt(s).toLocaleString() + ' $Pc'; } catch { return '—'; }
  };
  const tripped = data?.breaker.tripped;

  return (
    <div className="p-4 rounded-xl space-y-3" data-testid="admin-payout-health"
      style={{ background: tripped ? 'rgba(239,68,68,0.06)' : 'rgba(74,222,128,0.04)', border: `1px solid ${tripped ? 'rgba(239,68,68,0.4)' : 'rgba(74,222,128,0.3)'}` }}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-bold text-white text-sm">Payout System Health</h4>
          <div className="text-xs text-gray-400 mt-0.5">
            {data?.configured
              ? <>Hot wallet: <span className="font-mono text-gray-300">{data.address || '—'}</span></>
              : <span className="text-yellow-400">PAYOUT_WALLET_PRIVATE_KEY / PC_TOKEN_CONTRACT not configured — auto-send disabled.</span>}
            {data?.demoMode && <span className="ml-2 text-yellow-400">• DEMO_MODE active</span>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={load} disabled={loading} size="sm"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }}>
            <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          {tripped && (
            <Button onClick={reset} disabled={resetting} size="sm" data-testid="admin-payout-reset-breaker"
              style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.5)', fontSize: 11 }}>
              {resetting ? 'Resetting…' : 'Reset Breaker'}
            </Button>
          )}
        </div>
      </div>

      {tripped && (
        <div className="p-2 rounded text-xs" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5' }}>
          <strong>BREAKER TRIPPED</strong> — auto-payouts are paused. Reason: {data?.breaker.reason || 'unknown'}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="text-gray-500">Hot $Pc Balance</div>
          <div className="text-white font-bold mt-0.5">{fmtPc(data?.pcBalance ?? null)}</div>
          {data?.balanceError && <div className="text-red-400 text-[10px] mt-0.5">{data.balanceError}</div>}
        </div>
        <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="text-gray-500">Hot ETH Balance</div>
          <div className="text-white font-bold mt-0.5">
            {data?.ethBalance ? `${(Number(BigInt(data.ethBalance)) / 1e18).toFixed(4)} ETH` : '—'}
          </div>
        </div>
        <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="text-gray-500">1h Burst</div>
          <div className="text-white font-bold mt-0.5">{fmtPc(data?.totals.burst1h)}</div>
          <div className="text-gray-500 text-[10px]">limit {fmtPc(data?.breaker.limits.burst1h)}</div>
        </div>
        <div className="p-2 rounded" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="text-gray-500">24h Sent ({data?.totals.count24h ?? 0})</div>
          <div className="text-white font-bold mt-0.5">{fmtPc(data?.totals.sent24h)}</div>
          <div className="text-gray-500 text-[10px]">limit {fmtPc(data?.breaker.limits.limit24h)}</div>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Floor {fmtPc(data?.breaker.limits.floor)} • Single-max {fmtPc(data?.breaker.limits.singleMax)} • Consecutive failures: {data?.breaker.consecutiveFailures ?? 0} / {data?.breaker.limits.maxConsecutiveFailures ?? 3}
        {data?.breaker.lastResetAt && <> • Last reset: {new Date(data.breaker.lastResetAt).toLocaleString()}</>}
      </div>

      <div>
        <div className="text-xs font-bold text-gray-400 mb-1">Recent payout activity</div>
        <div className="rounded-lg max-h-56 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(data?.recent || []).length === 0 ? (
            <div className="text-xs text-gray-500 p-3 text-center">No payout activity yet.</div>
          ) : (data?.recent || []).map(r => {
            const ok = r.status === 'confirmed' || r.status === 'sent';
            const bad = r.status === 'send_failed' || r.status === 'reverted' || r.status === 'breaker_blocked';
            const fg = ok ? '#4ade80' : bad ? '#f87171' : '#fbbf24';
            // Backend supplies explorerBase from PAYOUT_EXPLORER_BASE_URL
            // (chain-aware); fall back to Etherscan mainnet so links still
            // work in dev/local without env config.
            const explorerBase = data?.explorerBase || 'https://etherscan.io/tx/';
            return (
              <div key={r.id} className="flex items-center gap-2 text-xs px-2 py-1.5 border-b border-white/5 last:border-0">
                <span style={{ color: fg, minWidth: 110 }}>{r.status}</span>
                <span className="text-gray-300 truncate flex-1">
                  #{r.withdraw_id ?? '—'} {r.username ? `(${r.username})` : ''} → {(r.to_address || '').slice(0, 12)}…
                  {' '}• {parseInt(r.amount).toLocaleString()} $Pc
                  {r.tx_hash && (
                    <a href={`${explorerBase}${r.tx_hash}`} target="_blank" rel="noopener noreferrer"
                       className="text-blue-300 hover:text-blue-200 underline ml-1"
                       data-testid={`payout-explorer-${r.id}`}>
                      tx {r.tx_hash.slice(0, 10)}…
                    </a>
                  )}
                  {r.error_message && <span className="text-red-400"> • {r.error_message.slice(0, 60)}</span>}
                </span>
                <span className="text-gray-600 text-[10px]">{new Date(r.created_at).toLocaleTimeString()}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PaymentsAdminTab() {
  const [deposits, setDeposits] = useState<DepositRow[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [d, w] = await Promise.all([
        adminPaymentsApi.listDeposits(),
        adminPaymentsApi.listWithdrawals(),
      ]);
      setDeposits(d.deposits || []);
      setWithdrawals(w.withdrawals || []);
    } catch (err) {
      toast.error(errorMessage(err) || 'Failed to load payments');
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const markSent = async (id: number) => {
    const txHash = window.prompt('Optional: paste the on-chain tx hash for this withdrawal (leave blank to skip)') || undefined;
    setBusyId(`w-sent-${id}`);
    try {
      await adminPaymentsApi.markWithdrawSent(id, txHash);
      toast.success('Withdrawal marked as sent');
      await load();
    } catch (err) { toast.error(errorMessage(err)); }
    setBusyId(null);
  };

  const rejectWithdraw = async (id: number) => {
    const note = window.prompt('Reason for rejection (sent to user):') || '';
    if (!note) return;
    setBusyId(`w-rej-${id}`);
    try {
      await adminPaymentsApi.rejectWithdraw(id, note);
      toast.success('Withdrawal rejected and balance refunded');
      await load();
    } catch (err) { toast.error(errorMessage(err)); }
    setBusyId(null);
  };

  const approveDeposit = async (id: number) => {
    setBusyId(`d-app-${id}`);
    try {
      await adminPaymentsApi.approveDeposit(id);
      toast.success('Deposit approved & credited');
      await load();
    } catch (err) { toast.error(errorMessage(err)); }
    setBusyId(null);
  };

  const rejectDeposit = async (id: number) => {
    const note = window.prompt('Reason for rejection:') || '';
    if (!note) return;
    setBusyId(`d-rej-${id}`);
    try {
      await adminPaymentsApi.rejectDeposit(id, note);
      toast.success('Deposit rejected');
      await load();
    } catch (err) { toast.error(errorMessage(err)); }
    setBusyId(null);
  };

  const pendingChecks = withdrawals.filter(w => w.status === 'pending');
  // Includes 'sending' so admins can see and recover any auto-payout that
  // crashed mid-broadcast or timed out waiting for confirmation.
  const awaitingSend = withdrawals.filter(w => w.status === 'approved' || w.status === 'sending');
  const completedW = withdrawals.filter(w => w.status === 'completed').slice(0, 10);
  const rejectedW = withdrawals.filter(w => w.status === 'rejected').slice(0, 5);

  const approveWithdraw = async (id: number) => {
    setBusyId(`w-app-${id}`);
    try {
      await adminPaymentsApi.approveWithdraw(id);
      toast.success('Withdrawal approved — awaiting send');
      await load();
    } catch (err) { toast.error(errorMessage(err)); }
    setBusyId(null);
  };
  const pendingDeposits = deposits.filter(d => ['pending', 'needs_review'].includes(d.status));
  const recentDeposits = deposits.filter(d => !['pending', 'needs_review'].includes(d.status)).slice(0, 10);

  const statusColor = (s: string) => {
    if (s === 'approved') return { bg: 'rgba(212,175,55,0.15)', fg: '#D4AF37', border: 'rgba(212,175,55,0.4)' };
    if (s === 'completed' || s === 'auto_credited') return { bg: 'rgba(74,222,128,0.15)', fg: '#4ade80', border: 'rgba(74,222,128,0.3)' };
    if (s === 'rejected' || s === 'auto_rejected') return { bg: 'rgba(239,68,68,0.15)', fg: '#f87171', border: 'rgba(239,68,68,0.3)' };
    if (s === 'needs_review') return { bg: 'rgba(251,191,36,0.15)', fg: '#fbbf24', border: 'rgba(251,191,36,0.3)' };
    return { bg: 'rgba(255,255,255,0.05)', fg: '#9ca3af', border: 'rgba(255,255,255,0.1)' };
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white">Financials</h3>
        <Button onClick={load} disabled={loading} size="sm"
          style={{ background: 'rgba(255,255,255,0.05)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.3)', fontSize: 11 }}>
          <RefreshCw className={`w-3 h-3 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {/* Payout System Health — Task #91 (auto-send + circuit breaker) */}
      <PayoutHealthPanel />

      {/* Pending checks queue — manual review withdrawals (e.g. needs-review,
          paused safety checks). Admin must approve or reject before they can
          move into the awaiting-send queue. */}
      <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.3)' }}>
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-white text-sm">Pending Checks — Needs Manual Approval</h4>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
            {pendingChecks.length} pending
          </span>
        </div>
        {pendingChecks.length === 0 ? (
          <div className="text-xs text-gray-500 py-3 text-center">No withdrawals awaiting manual review.</div>
        ) : pendingChecks.map(w => (
          <div key={w.id} className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white text-sm">{w.username}</span>
                  <span className="text-xs text-gray-500">#{w.id}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)' }}>PENDING</span>
                </div>
                <div className="text-lg font-bold" style={{ color: '#D4AF37' }}>
                  {parseInt(w.amount).toLocaleString()} $Pc
                </div>
                <div className="text-xs text-gray-400 break-all mt-1">→ {w.to_address}</div>
                <div className="text-xs text-gray-500 mt-1">{w.network} • {new Date(w.created_at).toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button onClick={() => approveWithdraw(w.id)} disabled={busyId !== null} size="sm"
                  style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.4)', fontSize: 11 }}>
                  <CheckCircle className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button onClick={() => rejectWithdraw(w.id)} disabled={busyId !== null} size="sm"
                  style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11 }}>
                  <XCircle className="w-3 h-3 mr-1" /> Reject (refund)
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Awaiting send queue (auto-approved withdrawals) */}
      <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.3)' }}>
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-white text-sm">Approved — Awaiting Send</h4>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}>
            {awaitingSend.length} queued
          </span>
        </div>
        {awaitingSend.length === 0 ? (
          <div className="text-xs text-gray-500 py-3 text-center">No pending sends — all withdrawals up to date.</div>
        ) : awaitingSend.map(w => {
          const isSending = w.status === 'sending';
          return (
          <div key={w.id} className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${isSending ? 'rgba(96,165,250,0.3)' : 'rgba(212,175,55,0.2)'}` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-white text-sm">{w.username}</span>
                  <span className="text-xs text-gray-500">#{w.id}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded uppercase tracking-wide"
                    style={{ background: isSending ? 'rgba(96,165,250,0.15)' : 'rgba(212,175,55,0.15)',
                             color: isSending ? '#60a5fa' : '#D4AF37' }}>
                    {w.status}
                  </span>
                </div>
                <div className="text-lg font-bold" style={{ color: '#D4AF37' }}>
                  {parseInt(w.amount).toLocaleString()} $Pc
                </div>
                <div className="text-xs text-gray-400 break-all mt-1">→ {w.to_address}</div>
                {w.tx_hash && <div className="text-xs text-blue-300 break-all mt-1 font-mono">tx: {w.tx_hash}</div>}
                {w.admin_note && <div className="text-xs text-yellow-300 mt-1">{w.admin_note}</div>}
                <div className="text-xs text-gray-500 mt-1">{w.network} • {new Date(w.created_at).toLocaleString()}</div>
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button onClick={() => markSent(w.id)} disabled={busyId !== null} size="sm"
                  style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)', fontSize: 11 }}>
                  <CheckCircle className="w-3 h-3 mr-1" /> {isSending ? 'Finalize' : 'Mark sent'}
                </Button>
                {!isSending && (
                  <Button onClick={async () => {
                    setBusyId(`retry-${w.id}`);
                    try { const r = await adminPaymentsApi.retryPayout(w.id); toast.success(r?.broadcast ? `Re-broadcast: ${r.txHash?.slice(0, 12)}…` : `Skipped: ${r?.reason}`); load(); }
                    catch (err) { toast.error(errorMessage(err)); }
                    setBusyId(null);
                  }} disabled={busyId !== null} size="sm" data-testid={`admin-payout-retry-${w.id}`}
                    style={{ background: 'rgba(96,165,250,0.15)', color: '#60a5fa', border: '1px solid rgba(96,165,250,0.3)', fontSize: 11 }}>
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry auto-send
                  </Button>
                )}
                {!isSending && (
                  <Button onClick={() => rejectWithdraw(w.id)} disabled={busyId !== null} size="sm"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11 }}>
                    <XCircle className="w-3 h-3 mr-1" /> Reject (refund)
                  </Button>
                )}
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {/* Pending deposits (no tx hash / needs review) */}
      <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-white text-sm">Deposits Needing Review</h4>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
            {pendingDeposits.length} pending
          </span>
        </div>
        {pendingDeposits.length === 0 ? (
          <div className="text-xs text-gray-500 py-3 text-center">No deposits awaiting review.</div>
        ) : pendingDeposits.map(d => {
          const c = statusColor(d.status);
          return (
            <div key={d.id} className="p-3 rounded-lg" style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-white text-sm">{d.username}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.fg, border: `1px solid ${c.border}` }}>
                      {d.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-lg font-bold" style={{ color: '#D4AF37' }}>
                    {parseInt(d.amount).toLocaleString()} $Pc
                  </div>
                  {d.tx_hash && <div className="text-xs text-gray-400 break-all mt-1">tx: {d.tx_hash}</div>}
                  {d.admin_note && <div className="text-xs text-yellow-400 mt-1">{d.admin_note}</div>}
                  <div className="text-xs text-gray-500 mt-1">{new Date(d.created_at).toLocaleString()}</div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <Button onClick={() => approveDeposit(d.id)} disabled={busyId !== null} size="sm"
                    style={{ background: 'rgba(74,222,128,0.2)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.4)', fontSize: 11 }}>
                    <CheckCircle className="w-3 h-3 mr-1" /> Credit
                  </Button>
                  <Button onClick={() => rejectDeposit(d.id)} disabled={busyId !== null} size="sm"
                    style={{ background: 'rgba(239,68,68,0.15)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)', fontSize: 11 }}>
                    <XCircle className="w-3 h-3 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent history */}
      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 className="font-bold text-white text-sm">Recent Deposits</h4>
          {recentDeposits.length === 0 ? <div className="text-xs text-gray-500">None</div> : recentDeposits.map(d => {
            const c = statusColor(d.status);
            return (
              <div key={d.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                <span className="text-gray-300 truncate flex-1">{d.username} • {parseInt(d.amount).toLocaleString()} $Pc</span>
                <span className="px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.fg }}>{d.status}</span>
              </div>
            );
          })}
        </div>
        <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h4 className="font-bold text-white text-sm">Recent Sent / Rejected Withdrawals</h4>
          {[...completedW, ...rejectedW].length === 0 ? <div className="text-xs text-gray-500">None</div> : [...completedW, ...rejectedW].map(w => {
            const c = statusColor(w.status);
            return (
              <div key={w.id} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                <span className="text-gray-300 truncate flex-1">{w.username} • {parseInt(w.amount).toLocaleString()} $Pc{w.tx_hash ? ` • ${w.tx_hash.slice(0, 10)}…` : ''}</span>
                <span className="px-2 py-0.5 rounded-full" style={{ background: c.bg, color: c.fg }}>{w.status}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EmailTestPanel({ getToken }: { getToken: () => string | null }) {
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  const loadStatus = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/admin/email/status', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data: EmailStatus = await res.json();
        setStatus(data);
      }
    } catch { /* ignore */ }
  };
  useEffect(() => { loadStatus(); }, []);

  const sendTest = async () => {
    if (!to.trim() || !to.includes('@')) {
      toast.error('Enter a valid recipient email');
      return;
    }
    const token = getToken();
    if (!token) { toast.error('Admin login required'); return; }
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: to.trim() }),
      });
      const data: EmailTestResponse = await res.json();
      if (res.ok && data.success) {
        setResult({ ok: true, text: `Sent. messageId=${data.messageId || '-'}  response=${(data.response || '').slice(0, 120)}` });
        toast.success('Test email sent');
      } else {
        setResult({ ok: false, text: `Failed: ${data.error || 'unknown'}${data.code ? ` (code=${data.code})` : ''}` });
        toast.error(data.error || 'Send failed');
      }
      if (data.status) setStatus(data.status);
    } catch (e: unknown) {
      setResult({ ok: false, text: `Network error: ${errorMessage(e)}` });
      toast.error('Server unavailable');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-xl space-y-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }} data-testid="admin-email-test-panel">
      <div className="flex items-center justify-between">
        <h4 className="font-bold text-white text-sm">SMTP Diagnostics</h4>
        <Button size="sm" onClick={loadStatus} style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }}>
          Refresh
        </Button>
      </div>
      {status && (
        <div className="text-xs space-y-1" style={{ color: '#9ca3af' }}>
          <div>Status: <span style={{ color: status.ready ? '#4ade80' : '#f87171' }}>{status.ready ? 'READY' : 'DISABLED'}</span> — {status.reason}</div>
          <div>From: <span className="text-white">{status.from}</span></div>
          {status.replyTo && <div>Reply-To: <span className="text-white">{status.replyTo}</span></div>}
          {status.counters && (
            <div>Today ({status.counters.day}): sent={status.counters.sent}, failed={status.counters.failed}</div>
          )}
        </div>
      )}
      <div>
        <label className="text-sm text-gray-300 mb-2 block">Send a test email</label>
        <div className="flex gap-2">
          <input
            type="email"
            value={to}
            onChange={e => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
            data-testid="admin-email-test-to"
          />
          <Button onClick={sendTest} disabled={busy} style={{ background: 'rgba(212,175,55,0.2)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.4)' }} data-testid="admin-email-test-send">
            {busy ? 'Sending…' : 'Send Test'}
          </Button>
        </div>
      </div>
      {result && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{
          background: result.ok ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
          border: `1px solid ${result.ok ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
          color: result.ok ? '#4ade80' : '#f87171',
        }}>
          {result.text}
        </div>
      )}
    </div>
  );
}
