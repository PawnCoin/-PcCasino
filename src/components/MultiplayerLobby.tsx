import { useState, useEffect } from 'react';
import { Users, Search, Lock, Globe, Clock, Trophy, Zap, MessageSquare, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GameTable, GameType } from '@/types';

interface MultiplayerLobbyProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinTable: (tableId: string, game: GameType) => void;
  userBalance: number;
}

// Mock tables data
const generateMockTables = (): GameTable[] => {
  const games: GameType[] = ['poker', 'blackjack', 'roulette', 'craps', 'spades', 'slots', 'sports'];
  const tableNames = [
    'High Rollers', 'Beginners Welcome', 'VIP Lounge', 'Quick Match', 
    'Tournament Prep', 'Casual Play', 'Pro Table', 'Night Owls',
    'Weekend Warriors', 'Crypto Kings', 'Diamond Hands', 'Moon Shot'
  ];
  
  const tables: GameTable[] = [];
  
  for (let i = 0; i < 20; i++) {
    const game = games[Math.floor(Math.random() * games.length)];
    const maxPlayers = game === 'poker' ? 6 : game === 'blackjack' ? 5 : 8;
    const playerCount = Math.floor(Math.random() * (maxPlayers - 1)) + 1;
    
    tables.push({
      id: `table_${i + 1}`,
      game,
      name: `${tableNames[i % tableNames.length]} #${i + 1}`,
      minBet: [5, 10, 25, 50, 100, 250, 500][Math.floor(Math.random() * 7)],
      maxBet: [100, 500, 1000, 5000, 10000, 50000][Math.floor(Math.random() * 6)],
      players: Array(playerCount).fill(null).map((_, j) => ({
        id: `player_${j}`,
        username: `Player${Math.floor(Math.random() * 999)}`,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
        balance: Math.floor(Math.random() * 10000),
        seat: j,
        isActive: true,
      })),
      maxPlayers,
      status: Math.random() > 0.3 ? 'waiting' : 'playing',
      pot: game === 'poker' ? Math.floor(Math.random() * 5000) : undefined,
    });
  }
  
  return tables;
};

const gameIcons: Record<GameType, string> = {
  poker: '♠️',
  blackjack: '🃏',
  roulette: '🎰',
  craps: '🎲',
  spades: '♠️',
  slots: '🎰',
  sports: '🏈',
  bingo: '🎱',
  dominoes: '🁣',
  pool: '🎱',
  darts: '🎯',
  vip: '👑',
};

const gameNames: Record<GameType, string> = {
  poker: "Texas Hold'em",
  blackjack: 'Blackjack',
  roulette: 'Roulette',
  craps: 'Craps',
  spades: 'Spades',
  slots: 'Slots',
  sports: 'Sportsbook',
  bingo: 'Bingo 75-Ball',
  dominoes: 'Dominoes',
  pool: 'Pool Table',
  darts: 'Darts',
  vip: 'V.I.P. Lounge',
};

export function MultiplayerLobby({ isOpen, onClose, onJoinTable, userBalance }: MultiplayerLobbyProps) {
  const [tables, setTables] = useState<GameTable[]>([]);
  const [filteredTables, setFilteredTables] = useState<GameTable[]>([]);
  const [selectedGame, setSelectedGame] = useState<GameType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [minBetFilter, setMinBetFilter] = useState(0);
  const [showCreateTable, setShowCreateTable] = useState(false);
  const [selectedTable, setSelectedTable] = useState<GameTable | null>(null);

  // Load tables
  useEffect(() => {
    if (isOpen) {
      const mockTables = generateMockTables();
      setTables(mockTables);
      setFilteredTables(mockTables);
    }
  }, [isOpen]);

  // Filter tables
  useEffect(() => {
    let filtered = tables;
    
    if (selectedGame !== 'all') {
      filtered = filtered.filter(t => t.game === selectedGame);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (minBetFilter > 0) {
      filtered = filtered.filter(t => t.minBet >= minBetFilter);
    }
    
    setFilteredTables(filtered);
  }, [tables, selectedGame, searchQuery, minBetFilter]);

  // Join table handler
  const handleJoinTable = (table: GameTable) => {
    if (userBalance < table.minBet) {
      alert(`You need at least ${table.minBet} $Pc to join this table`);
      return;
    }
    
    if (table.players.length >= table.maxPlayers) {
      alert('This table is full');
      return;
    }
    
    onJoinTable(table.id, table.game as GameType);
    onClose();
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'text-green-400 bg-green-500/20';
      case 'playing': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl glass-panel-strong max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <Users className="w-5 h-5 text-white" />
                </div>
                Multiplayer Lobby
              </DialogTitle>
            </DialogHeader>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                <span className="text-green-400 font-bold">{tables.filter(t => t.status === 'waiting').length}</span> tables waiting
              </div>
              <div className="text-sm text-gray-400">
                <span className="text-yellow-400 font-bold">{tables.reduce((sum, t) => sum + t.players.length, 0)}</span> players online
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-white/10 bg-black/20">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Game Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedGame('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  selectedGame === 'all' ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                All Games
              </button>
              {(['poker', 'blackjack', 'roulette', 'craps', 'spades'] as GameType[]).map(game => (
                <button
                  key={game}
                  onClick={() => setSelectedGame(game)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedGame === game ? 'bg-purple-600' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {gameIcons[game]} {gameNames[game]}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tables..."
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>

            {/* Min Bet Filter */}
            <select
              value={minBetFilter}
              onChange={(e) => setMinBetFilter(Number(e.target.value))}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white"
            >
              <option value={0}>Any Min Bet</option>
              <option value={10}>10+ $Pc</option>
              <option value={50}>50+ $Pc</option>
              <option value={100}>100+ $Pc</option>
              <option value={500}>500+ $Pc</option>
            </select>

            {/* Create Table Button */}
            <Button onClick={() => setShowCreateTable(true)} className="btn-primary">
              <Zap className="w-4 h-4 mr-2" />
              Create Table
            </Button>
          </div>
        </div>

        {/* Tables List */}
        <ScrollArea className="h-[500px]">
          <div className="p-4 space-y-3">
            {filteredTables.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No tables found</p>
                <p className="text-sm">Try adjusting your filters or create a new table</p>
              </div>
            ) : (
              filteredTables.map((table) => (
                <div
                  key={table.id}
                  onClick={() => setSelectedTable(table)}
                  className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Game Icon */}
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600/30 to-pink-600/30 flex items-center justify-center text-2xl">
                        {gameIcons[table.game as GameType]}
                      </div>
                      
                      {/* Table Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{table.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(table.status)}`}>
                            {table.status === 'waiting' ? 'Waiting' : 'Playing'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span>{gameNames[table.game as GameType]}</span>
                          <span>•</span>
                          <span className="text-yellow-400">Min: {table.minBet} $Pc</span>
                          <span>•</span>
                          <span>Max: {table.maxBet} $Pc</span>
                          {table.pot && (
                            <>
                              <span>•</span>
                              <span className="text-green-400">Pot: {table.pot} $Pc</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Players & Action */}
                    <div className="flex items-center gap-4">
                      {/* Player Avatars */}
                      <div className="flex -space-x-2">
                        {table.players.slice(0, 4).map((player, i) => (
                          <img
                            key={i}
                            src={player.avatar}
                            alt={player.username}
                            className="w-8 h-8 rounded-full border-2 border-[#0a0a0f]"
                          />
                        ))}
                        {table.players.length > 4 && (
                          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold border-2 border-[#0a0a0f]">
                            +{table.players.length - 4}
                          </div>
                        )}
                      </div>
                      
                      {/* Player Count */}
                      <div className="text-sm text-gray-400">
                        {table.players.length}/{table.maxPlayers}
                      </div>

                      {/* Join Button */}
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleJoinTable(table);
                        }}
                        disabled={table.players.length >= table.maxPlayers || table.status === 'playing'}
                        className="btn-primary"
                      >
                        {table.players.length >= table.maxPlayers ? 'Full' : table.status === 'playing' ? 'In Game' : 'Join'}
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer Stats */}
        <div className="p-4 border-t border-white/10 bg-black/20">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex gap-6">
              <span>Showing {filteredTables.length} tables</span>
              <span>|</span>
              <span className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-yellow-400" />
                Tournament mode available
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Tables refresh every 30 seconds
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Table Details Dialog */}
      <Dialog open={!!selectedTable} onOpenChange={() => setSelectedTable(null)}>
        <DialogContent className="glass-panel-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{selectedTable?.name}</DialogTitle>
          </DialogHeader>
          
          {selectedTable && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5">
                <div className="text-4xl">{gameIcons[selectedTable.game as GameType]}</div>
                <div>
                  <div className="font-bold">{gameNames[selectedTable.game as GameType]}</div>
                  <div className="text-sm text-gray-400">
                    Min: {selectedTable.minBet} $Pc • Max: {selectedTable.maxBet} $Pc
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-gray-400 mb-2">Players ({selectedTable.players.length}/{selectedTable.maxPlayers})</div>
                <div className="space-y-2">
                  {selectedTable.players.map((player, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-white/5">
                      <img src={player.avatar} alt={player.username} className="w-8 h-8 rounded-full" />
                      <span className="font-medium">{player.username}</span>
                      <span className="ml-auto text-sm text-gray-400">{player.balance.toLocaleString()} $Pc</span>
                    </div>
                  ))}
                  {Array.from({ length: selectedTable.maxPlayers - selectedTable.players.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="flex items-center gap-3 p-2 rounded-lg bg-white/5 opacity-50">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs">?</div>
                      <span className="text-gray-400">Open Seat</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleJoinTable(selectedTable)}
                  disabled={selectedTable.players.length >= selectedTable.maxPlayers}
                  className="flex-1 btn-primary"
                >
                  Join Table
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedTable(null)}
                  className="border-white/20"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Spectate
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Table Dialog */}
      <Dialog open={showCreateTable} onOpenChange={setShowCreateTable}>
        <DialogContent className="glass-panel-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">Create New Table</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Select Game</label>
              <div className="grid grid-cols-2 gap-2">
                {(['poker', 'blackjack', 'roulette', 'craps', 'spades'] as GameType[]).map(game => (
                  <button
                    key={game}
                    className="p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/50 transition-all text-left"
                  >
                    <span className="text-2xl mr-2">{gameIcons[game]}</span>
                    <span className="font-medium">{gameNames[game]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Table Name</label>
              <Input placeholder="Enter table name..." className="bg-white/5 border-white/10" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Min Bet</label>
                <select className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
                  <option>5 $Pc</option>
                  <option>10 $Pc</option>
                  <option>25 $Pc</option>
                  <option>50 $Pc</option>
                  <option>100 $Pc</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Max Bet</label>
                <select className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white">
                  <option>500 $Pc</option>
                  <option>1000 $Pc</option>
                  <option>5000 $Pc</option>
                  <option>10000 $Pc</option>
                  <option>No Limit</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <button className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-green-500/50 transition-all flex items-center justify-center gap-2">
                <Globe className="w-4 h-4" />
                Public
              </button>
              <button className="flex-1 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/50 transition-all flex items-center justify-center gap-2">
                <Lock className="w-4 h-4" />
                Private
              </button>
            </div>

            <Button 
              onClick={() => {
                setShowCreateTable(false);
                alert('Table created! (Demo)');
              }}
              className="w-full btn-primary"
            >
              <Zap className="w-4 h-4 mr-2" />
              Create Table
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
