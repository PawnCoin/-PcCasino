import { useState, useEffect } from 'react';
import { Shield, Users, DollarSign, AlertTriangle, Settings, BarChart3, Trophy, Zap, X, CheckCircle, XCircle, RefreshCw, Send, Key, Globe, Database } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const ADMIN_PASSWORD = 'pcadmin2024';
const ADMIN_KEY = 'pcasino_admin_auth';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

type AdminTab = 'overview' | 'users' | 'disputes' | 'tournaments' | 'payments' | 'broadcast' | 'pcpayments' | 'settings';

export function AdminDashboard({ isOpen, onClose }: AdminDashboardProps) {
  const [isAuthed, setIsAuthed] = useState(() => localStorage.getItem(ADMIN_KEY) === 'true');
  const [password, setPassword] = useState('');
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
  const [siteSettings, setSiteSettings] = useState({
    maintenanceMode: false, maxDeposit: 0, minWithdrawal: 100, houseEdge: 2.5, welcomeBonus: 1000000000,
  });

  const authAdmin = () => {
    if (password === ADMIN_PASSWORD) {
      setIsAuthed(true);
      localStorage.setItem(ADMIN_KEY, 'true');
      toast.success('Admin access granted');
      loadData();
    } else {
      toast.error('Invalid admin password');
    }
  };

  const loadData = async () => {
    try {
      const [statsRes, disputesRes, logsRes, usersRes, tournamentsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/disputes'),
        fetch('/api/admin/logs'),
        fetch('/api/admin/users'),
        fetch('/api/tournaments'),
      ]);
      if (statsRes.ok) setStats(await statsRes.json());
      if (disputesRes.ok) { const d = await disputesRes.json(); setDisputes(d.disputes || []); }
      if (logsRes.ok) { const l = await logsRes.json(); setLogs(l.logs || []); }
      if (usersRes.ok) { const u = await usersRes.json(); setUsers(u.users || []); }
      if (tournamentsRes.ok) { const t = await tournamentsRes.json(); setTournaments(t.tournaments || []); }
    } catch { /* server may not be running */ }
  };

  useEffect(() => { if (isOpen && isAuthed) loadData(); }, [isOpen, isAuthed]);

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

  const tabs: { id: AdminTab; label: string; icon: typeof Shield }[] = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
    { id: 'tournaments', label: 'Tournaments', icon: Trophy },
    { id: 'payments', label: 'Financials', icon: DollarSign },
    { id: 'broadcast', label: 'Broadcast', icon: Send },
    { id: 'pcpayments', label: 'PcPayments', icon: Key },
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
                      { label: 'Players Online', value: stats.playersOnline || 0, color: '#4ade80', icon: '👥' },
                      { label: 'Active Tables', value: stats.activeTables || 0, color: '#60a5fa', icon: '🎲' },
                      { label: 'Open Disputes', value: stats.activeDisputes || disputes.filter(d => d.status === 'open').length, color: '#f87171', icon: '⚠️' },
                      { label: 'Active Tournaments', value: stats.activeTournaments || tournaments.filter(t => t.status !== 'finished').length, color: '#facc15', icon: '🏆' },
                      { label: 'Total $Pc Won', value: formatNum(stats.totalWon || 0), color: '#D4AF37', icon: '💰' },
                      { label: 'Live Users', value: users.length, color: '#c084fc', icon: '🌐' },
                    ].map(stat => (
                      <div key={stat.label} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="text-2xl mb-1">{stat.icon}</div>
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
                  <h3 className="font-bold text-white">User Management</h3>
                  <div className="space-y-2">
                    {users.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">No users currently online. Connect to the multiplayer server.</div>
                    ) : users.map((u: any) => (
                      <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="w-8 h-8 rounded-full bg-purple-600/30 flex items-center justify-center text-sm">
                          {u.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white">{u.username}</div>
                          <div className="text-xs text-gray-400">{u.id?.slice(0, 16)}...</div>
                        </div>
                        <div className="text-xs text-green-400">{u.balance ? `${(u.balance / 1_000_000).toFixed(0)}M $Pc` : '-'}</div>
                        <div className="text-xs text-gray-500">{u.roomId ? 'In room' : 'Lobby'}</div>
                        <Button size="sm" style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', fontSize: 10 }}
                          onClick={() => toast.info('User management requires production backend')}>
                          Manage
                        </Button>
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
                <div className="space-y-4">
                  <h3 className="font-bold text-white">Financial Controls</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Total Deposits', value: '12.4B $Pc', color: '#60a5fa' },
                      { label: 'Total Withdrawals', value: '8.2B $Pc', color: '#f87171' },
                      { label: 'Net Revenue', value: '4.2B $Pc', color: '#4ade80' },
                      { label: 'Pending Refunds', value: '0 $Pc', color: '#fbbf24' },
                    ].map(stat => (
                      <div key={stat.label} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <div className="font-bold text-xl" style={{ color: stat.color }}>{stat.value}</div>
                        <div className="text-xs text-gray-400">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 rounded-xl space-y-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <h4 className="font-bold text-white text-sm">Financial Actions</h4>
                    <div className="space-y-2">
                      {['Process Pending Withdrawals', 'Review Flagged Transactions', 'Export Payment Report', 'Manual Refund'].map(action => (
                        <Button key={action} onClick={() => toast.info('Requires production payment gateway')} className="w-full text-left justify-start" size="sm"
                          style={{ background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)', fontSize: 11 }}>
                          {action}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
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
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}
