import { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Search, Lock, Globe, Clock, Trophy, Zap, MessageSquare, ChevronRight, Wifi, WifiOff, RefreshCw, Crown, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { CasinoIcon } from '@/components/CasinoIcons';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AvatarSprite, ALL_AVATARS } from '@/components/AvatarSprite';
import type { GameType } from '@/types';
import { getSocket, identifyPlayer, getLobby, createRoom, joinRoom, leaveRoom, type Room } from '@/lib/socket';

function nameToAvatar(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return ALL_AVATARS[h % ALL_AVATARS.length];
}

interface MultiplayerLobbyProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinTable: (tableId: string, game: GameType) => void;
  userBalance: number;
  username?: string;
  userId?: string;
  avatarUrl?: string | null;
}

const gameIcons: Record<string, string> = {
  poker: 'spade', blackjack: 'cards', roulette: 'slot-machine', craps: 'dice', spades: 'spade',
  slots: 'slot-machine', sports: 'football', bingo: 'pool-ball', dominoes: 'domino', pool: 'pool-ball', darts: 'target', vip: 'crown',
};

const gameNames: Record<string, string> = {
  poker: "Texas Hold'em", blackjack: 'Blackjack', roulette: 'Roulette', craps: 'Craps',
  spades: 'Spades', slots: 'Slots', sports: 'Sportsbook', bingo: 'Bingo 75-Ball',
  dominoes: 'Dominoes', pool: 'Pool Table', darts: 'Darts', vip: 'V.I.P. Lounge',
};

const PLAYABLE_GAMES: GameType[] = ['poker', 'blackjack', 'roulette', 'craps', 'spades', 'slots', 'bingo', 'dominoes'];

export function MultiplayerLobby({ isOpen, onClose, onJoinTable, userBalance, username = 'Player', userId, avatarUrl }: MultiplayerLobbyProps) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minBetFilter, setMinBetFilter] = useState(0);
  const [showCreateTable, setShowCreateTable] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [connected, setConnected] = useState(false);
  const [playersOnline, setPlayersOnline] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [createForm, setCreateForm] = useState({
    game: 'poker' as GameType, name: '', minBet: 10, maxBet: 1000, isPrivate: false,
  });
  const socketRef = useRef(getSocket());

  // Setup socket listeners
  useEffect(() => {
    if (!isOpen) return;

    const sock = socketRef.current;
    setIsLoading(true);

    const onConnect = () => {
      setConnected(true);
      identifyPlayer(username, userBalance, '', avatarUrl);
      getLobby();
    };

    const onDisconnect = () => setConnected(false);

    const onLobbyUpdate = ({ rooms: updatedRooms }: { rooms: Room[] }) => {
      setRooms(updatedRooms);
      setIsLoading(false);
    };

    const onLobbyStats = ({ playersOnline: count }: { playersOnline: number }) => {
      setPlayersOnline(count);
    };

    sock.on('connect', onConnect);
    sock.on('disconnect', onDisconnect);
    sock.on('lobby:update', onLobbyUpdate);
    sock.on('lobby:stats', onLobbyStats);

    if (sock.connected) {
      setConnected(true);
      identifyPlayer(username, userBalance, '', avatarUrl);
      getLobby();
    } else {
      sock.connect();
    }

    return () => {
      sock.off('connect', onConnect);
      sock.off('disconnect', onDisconnect);
      sock.off('lobby:update', onLobbyUpdate);
      sock.off('lobby:stats', onLobbyStats);
    };
  }, [isOpen, username, userBalance]);

  // Filter rooms
  useEffect(() => {
    let filtered = rooms;
    if (selectedGame !== 'all') filtered = filtered.filter(r => r.game === selectedGame);
    if (searchQuery) filtered = filtered.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
    if (minBetFilter > 0) filtered = filtered.filter(r => r.minBet >= minBetFilter);
    setFilteredRooms(filtered);
  }, [rooms, selectedGame, searchQuery, minBetFilter]);

  const handleJoinRoom = useCallback((room: Room) => {
    if (userBalance < room.minBet) {
      alert(`You need at least ${room.minBet.toLocaleString()} $Pc to join this table`);
      return;
    }
    if (room.players.length >= room.maxPlayers) {
      alert('This table is full');
      return;
    }

    joinRoom(room.id, username, userBalance, '', (res) => {
      if (res.success) {
        onJoinTable(room.id, room.game as GameType);
        onClose();
      } else {
        alert(res.error || 'Failed to join table');
      }
    }, avatarUrl);
  }, [userBalance, username, avatarUrl, onJoinTable, onClose]);

  const handleCreateRoom = useCallback(() => {
    if (!createForm.name.trim()) {
      alert('Please enter a table name');
      return;
    }
    createRoom(
      createForm.game,
      createForm.name,
      createForm.minBet,
      createForm.maxBet,
      createForm.isPrivate,
      username,
      userBalance,
      '',
      (res) => {
        if (res.success && res.roomId) {
          setShowCreateTable(false);
          onJoinTable(res.roomId, createForm.game);
          onClose();
        } else {
          alert(res.error || 'Failed to create table');
        }
      },
      avatarUrl
    );
  }, [createForm, username, userBalance, avatarUrl, onJoinTable, onClose]);

  const getStatusStyle = (status: string) => {
    if (status === 'waiting') return { color: '#4ade80', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)' };
    if (status === 'playing') return { color: '#facc15', background: 'rgba(250,204,21,0.15)', border: '1px solid rgba(250,204,21,0.3)' };
    return { color: '#94a3b8', background: 'rgba(148,163,184,0.1)', border: '1px solid rgba(148,163,184,0.2)' };
  };

  const waitingCount = rooms.filter(r => r.status === 'waiting').length;
  const totalPlayers = rooms.reduce((sum, r) => sum + r.players.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[92vh] p-0 overflow-hidden" style={{
        background: 'rgba(8,8,16,0.98)',
        border: '1px solid rgba(147,51,234,0.4)',
        boxShadow: '0 0 60px rgba(147,51,234,0.2)',
      }}>
        {/* Header */}
        <div className="p-5 border-b border-purple-500/20" style={{ background: 'linear-gradient(180deg, rgba(88,28,135,0.3) 0%, transparent 100%)' }}>
          <div className="flex items-center justify-between">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #9333ea, #ec4899)' }}>
                  <Users className="w-5 h-5 text-white" />
                </div>
                <span style={{ color: '#e879f9' }}>Live Multiplayer Lobby</span>
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-5 text-sm">
              <div className="flex items-center gap-2">
                {connected ? (
                  <Wifi className="w-4 h-4 text-green-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-red-400" />
                )}
                <span style={{ color: connected ? '#4ade80' : '#f87171' }}>
                  {connected ? 'Live' : 'Connecting...'}
                </span>
              </div>
              <div className="text-gray-400">
                <span style={{ color: '#4ade80', fontWeight: 700 }}>{waitingCount}</span> open tables
              </div>
              <div className="text-gray-400">
                <span style={{ color: '#facc15', fontWeight: 700 }}>{playersOnline || totalPlayers}</span> online
              </div>
              <button
                onClick={() => { setIsLoading(true); getLobby(); }}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={`w-4 h-4 text-gray-400 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-white/10" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedGame('all')}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: selectedGame === 'all' ? 'linear-gradient(135deg, #9333ea, #7c3aed)' : 'rgba(255,255,255,0.07)',
                  color: selectedGame === 'all' ? 'white' : '#9ca3af',
                }}
              >All Games</button>
              {PLAYABLE_GAMES.slice(0, 6).map(game => (
                <button
                  key={game}
                  onClick={() => setSelectedGame(game)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: selectedGame === game ? 'linear-gradient(135deg, #9333ea, #7c3aed)' : 'rgba(255,255,255,0.07)',
                    color: selectedGame === game ? 'white' : '#9ca3af',
                  }}
                >
                  {gameIcons[game]} {gameNames[game]}
                </button>
              ))}
            </div>

            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tables..."
                className="pl-9 h-9 text-sm"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
              />
            </div>

            <select
              value={minBetFilter}
              onChange={(e) => setMinBetFilter(Number(e.target.value))}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
            >
              <option value={0}>Any Min Bet</option>
              <option value={10}>10+ $Pc</option>
              <option value={50}>50+ $Pc</option>
              <option value={100}>100+ $Pc</option>
              <option value={500}>500+ $Pc</option>
            </select>

            <Button
              onClick={() => setShowCreateTable(true)}
              className="h-9 px-4"
              style={{ background: 'linear-gradient(135deg, #9333ea, #7c3aed)', color: 'white', border: 'none' }}
            >
              <Zap className="w-3.5 h-3.5 mr-1.5" />
              Create Table
            </Button>
          </div>
        </div>

        {/* Tables List */}
        <ScrollArea className="h-[420px]">
          <div className="p-4 space-y-2">
            {isLoading ? (
              <div className="text-center py-16">
                <RefreshCw className="w-10 h-10 mx-auto mb-3 text-purple-400 animate-spin" />
                <p className="text-gray-400">Connecting to live server...</p>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Users className="w-14 h-14 mx-auto mb-3 opacity-30" />
                <p className="text-lg font-medium">No tables found</p>
                <p className="text-sm mt-1">Try different filters or create a new table</p>
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => setSelectedRoom(room)}
                  className="p-4 rounded-xl cursor-pointer transition-all group"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(147,51,234,0.08)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(147,51,234,0.4)';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)';
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.25), rgba(236,72,153,0.25))' }}>
                        <CasinoIcon name={gameIcons[room.game] || 'gamepad'} size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white truncate">{room.name}</span>
                          {room.hostId === userId && (
                            <Crown className="w-3.5 h-3.5 text-yellow-400" />
                          )}
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
                            style={getStatusStyle(room.status)}>
                            {room.status === 'waiting' ? '⬤ Waiting' : '⬤ Playing'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                          <span className="text-purple-400">{gameNames[room.game] || room.game}</span>
                          <span className="text-yellow-400">Min: {room.minBet.toLocaleString()} $Pc</span>
                          <span className="text-gray-500">Max: {room.maxBet.toLocaleString()} $Pc</span>
                          {room.pot > 0 && <span className="text-green-400">Pot: {room.pot.toLocaleString()} $Pc</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Player count and avatars */}
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex -space-x-2">
                          {room.players.slice(0, 4).map((player, i) => (
                            <div key={i} className="w-7 h-7 rounded-full overflow-hidden border-2"
                              style={{ borderColor: '#0a0a10' }}>
                              <AvatarSprite avatar={nameToAvatar(player.username)} size={28} style={{ borderRadius: 0 }} />
                            </div>
                          ))}
                          {room.players.length > 4 && (
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2"
                              style={{ background: 'rgba(147,51,234,0.4)', borderColor: '#0a0a10', color: '#e879f9' }}>
                              +{room.players.length - 4}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{room.players.length}/{room.maxPlayers} players</span>
                      </div>

                      <Button
                        onClick={(e) => { e.stopPropagation(); handleJoinRoom(room); }}
                        disabled={room.players.length >= room.maxPlayers || room.status === 'playing'}
                        size="sm"
                        style={{
                          background: room.players.length >= room.maxPlayers || room.status === 'playing'
                            ? 'rgba(255,255,255,0.1)'
                            : 'linear-gradient(135deg, #9333ea, #7c3aed)',
                          color: 'white',
                          border: 'none',
                        }}
                      >
                        {room.players.length >= room.maxPlayers ? 'Full' : room.status === 'playing' ? 'Live' : 'Join'}
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer Stats */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between text-xs text-gray-500"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="flex gap-4">
            <span>Showing {filteredRooms.length} of {rooms.length} tables</span>
            <span className="flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-yellow-400" />
              Tournament mode available
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span>Live server • Real-time updates</span>
          </div>
        </div>
      </DialogContent>

      {/* Room Details Dialog */}
      <Dialog open={!!selectedRoom} onOpenChange={() => setSelectedRoom(null)}>
        <DialogContent className="max-w-md" style={{
          background: 'rgba(8,8,16,0.98)',
          border: '1px solid rgba(147,51,234,0.4)',
          boxShadow: '0 0 40px rgba(147,51,234,0.15)',
        }}>
          <DialogHeader>
            <DialogTitle className="font-bold text-xl text-white">{selectedRoom?.name}</DialogTitle>
          </DialogHeader>
          {selectedRoom && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl" style={{ background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.2)' }}>
                <CasinoIcon name={gameIcons[selectedRoom.game] || 'gamepad'} size={40} />
                <div>
                  <div className="font-bold text-white">{gameNames[selectedRoom.game] || selectedRoom.game}</div>
                  <div className="text-sm text-gray-400">
                    Min: {selectedRoom.minBet.toLocaleString()} $Pc • Max: {selectedRoom.maxBet.toLocaleString()} $Pc
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Created {new Date(selectedRoom.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-2 flex items-center justify-between">
                  <span>Players in Room ({selectedRoom.players.length}/{selectedRoom.maxPlayers})</span>
                  <span className="px-2 py-0.5 rounded-full text-xs" style={getStatusStyle(selectedRoom.status)}>
                    {selectedRoom.status}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {selectedRoom.players.map((player, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
                      <div className="w-8 h-8 rounded-full overflow-hidden">
                        <AvatarSprite avatar={nameToAvatar(player.username)} size={32} style={{ borderRadius: 0 }} />
                      </div>
                      <span className="font-medium text-white flex-1">{player.username}</span>
                      {selectedRoom.hostId === player.id && <Crown className="w-4 h-4 text-yellow-400" />}
                      {player.isReady && <CheckCircle className="w-4 h-4 text-green-400" />}
                      <span className="text-xs text-gray-400">{player.balance.toLocaleString()} $Pc</span>
                    </div>
                  ))}
                  {Array.from({ length: selectedRoom.maxPlayers - selectedRoom.players.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center gap-3 p-2.5 rounded-lg opacity-40"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-gray-500 text-xs">?</div>
                      <span className="text-gray-500 text-sm">Open Seat</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleJoinRoom(selectedRoom)}
                  disabled={selectedRoom.players.length >= selectedRoom.maxPlayers}
                  className="flex-1"
                  style={{ background: 'linear-gradient(135deg, #9333ea, #7c3aed)', color: 'white', border: 'none' }}
                >
                  {selectedRoom.players.length >= selectedRoom.maxPlayers ? 'Table Full' : 'Join Table'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRoom(null)}
                  style={{ borderColor: 'rgba(255,255,255,0.15)', color: '#9ca3af' }}
                >
                  <MessageSquare className="w-4 h-4 mr-1.5" />
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Table Dialog */}
      <Dialog open={showCreateTable} onOpenChange={setShowCreateTable}>
        <DialogContent className="max-w-md" style={{
          background: 'rgba(8,8,16,0.98)',
          border: '1px solid rgba(147,51,234,0.4)',
        }}>
          <DialogHeader>
            <DialogTitle className="font-bold text-xl text-white">Create New Table</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Table Name</label>
              <Input
                value={createForm.name}
                onChange={(e) => setCreateForm(f => ({ ...f, name: e.target.value }))}
                placeholder={`${username}'s Table`}
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Select Game</label>
              <div className="grid grid-cols-2 gap-2">
                {PLAYABLE_GAMES.map(game => (
                  <button
                    key={game}
                    onClick={() => setCreateForm(f => ({ ...f, game }))}
                    className="p-2.5 rounded-lg text-left text-sm transition-all"
                    style={{
                      background: createForm.game === game ? 'rgba(147,51,234,0.3)' : 'rgba(255,255,255,0.04)',
                      border: createForm.game === game ? '1px solid rgba(147,51,234,0.6)' : '1px solid rgba(255,255,255,0.1)',
                      color: createForm.game === game ? '#e879f9' : '#9ca3af',
                    }}
                  >
                    <span className="mr-2">{gameIcons[game]}</span>
                    {gameNames[game]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Min Bet ($Pc)</label>
                <select
                  value={createForm.minBet}
                  onChange={(e) => setCreateForm(f => ({ ...f, minBet: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                >
                  {[5, 10, 25, 50, 100, 250, 500].map(v => <option key={v} value={v}>{v.toLocaleString()}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Max Bet ($Pc)</label>
                <select
                  value={createForm.maxBet}
                  onChange={(e) => setCreateForm(f => ({ ...f, maxBet: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'white' }}
                >
                  {[500, 1000, 5000, 10000, 50000, 0].map(v => (
                    <option key={v} value={v}>{v === 0 ? 'No Limit' : v.toLocaleString()}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setCreateForm(f => ({ ...f, isPrivate: false }))}
                className="flex-1 p-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
                style={{
                  background: !createForm.isPrivate ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.04)',
                  border: !createForm.isPrivate ? '1px solid rgba(74,222,128,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  color: !createForm.isPrivate ? '#4ade80' : '#9ca3af',
                }}
              >
                <Globe className="w-4 h-4" /> Public
              </button>
              <button
                onClick={() => setCreateForm(f => ({ ...f, isPrivate: true }))}
                className="flex-1 p-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
                style={{
                  background: createForm.isPrivate ? 'rgba(147,51,234,0.15)' : 'rgba(255,255,255,0.04)',
                  border: createForm.isPrivate ? '1px solid rgba(147,51,234,0.4)' : '1px solid rgba(255,255,255,0.1)',
                  color: createForm.isPrivate ? '#e879f9' : '#9ca3af',
                }}
              >
                <Lock className="w-4 h-4" /> Private
              </button>
            </div>

            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              Your balance: {userBalance.toLocaleString()} $Pc
            </div>

            <Button
              onClick={handleCreateRoom}
              className="w-full"
              style={{ background: 'linear-gradient(135deg, #9333ea, #7c3aed)', color: 'white', border: 'none' }}
            >
              <Zap className="w-4 h-4 mr-2" />
              Create & Join Table
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
