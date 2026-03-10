// Sportsbook component
import { Trophy, ChevronRight, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { LiveEvent } from '@/types';

const mockEvents: LiveEvent[] = [
  {
    id: '1',
    sport: 'NFL',
    league: 'National Football League',
    homeTeam: 'Kansas City Chiefs',
    awayTeam: 'San Francisco 49ers',
    homeScore: 21,
    awayScore: 17,
    status: 'live',
    startTime: new Date(),
    odds: { home: -110, away: 145 },
  },
  {
    id: '2',
    sport: 'NBA',
    league: 'National Basketball Association',
    homeTeam: 'Los Angeles Lakers',
    awayTeam: 'Golden State Warriors',
    status: 'upcoming',
    startTime: new Date(Date.now() + 3600000),
    odds: { home: -120, away: 140, spread: { home: -1.5, away: 1.5 }, total: { over: -110, under: -110, line: 224.5 } },
  },
  {
    id: '3',
    sport: 'UFC',
    league: 'Ultimate Fighting Championship',
    homeTeam: 'Jon Jones',
    awayTeam: 'Stipe Miocic',
    status: 'upcoming',
    startTime: new Date(Date.now() + 86400000),
    odds: { home: -250, away: 200 },
  },
];

const sportEmojis: Record<string, string> = {
  NFL: '🏈',
  NBA: '🏀',
  UFC: '🥊',
};

interface SportsbookProps {
  onPlaceBet: (event: LiveEvent, selection: string, amount: number) => void;
}

export function Sportsbook({ onPlaceBet }: SportsbookProps) {

  return (
    <section id="sports-section" className="px-4 py-12">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-white" />
            </div>
            SPORTSBOOK
          </h2>
          <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-yellow-500/20">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {mockEvents.map((event) => {
              const sportEmoji = sportEmojis[event.sport] || '🏆';
              const isLive = event.status === 'live';
              
              return (
                <div
                  key={event.id}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 hover:border-yellow-500/50 transition-all cursor-pointer group"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{sportEmoji}</span>
                      <span className="font-bold text-sm">{event.sport}</span>
                    </div>
                    {isLive ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        LIVE
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">
                        {event.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  {/* Teams */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{event.homeTeam}</span>
                      {event.homeScore !== undefined && (
                        <span className="font-bold text-lg">{event.homeScore}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{event.awayTeam}</span>
                      {event.awayScore !== undefined && (
                        <span className="font-bold text-lg">{event.awayScore}</span>
                      )}
                    </div>
                  </div>

                  {/* Odds */}
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaceBet(event, event.homeTeam, 100);
                      }}
                      className="flex-1 py-2 rounded-lg bg-purple-600/80 hover:bg-purple-500 font-bold text-sm transition-colors"
                    >
                      {event.odds.home > 0 ? `+${event.odds.home}` : event.odds.home}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onPlaceBet(event, event.awayTeam, 100);
                      }}
                      className="flex-1 py-2 rounded-lg bg-white/10 hover:bg-white/20 font-bold text-sm transition-colors"
                    >
                      {event.odds.away > 0 ? `+${event.odds.away}` : event.odds.away}
                    </button>
                  </div>

                  {/* Spread/Total if available */}
                  {event.odds.spread && (
                    <div className="flex gap-2 mt-2 text-xs text-gray-400">
                      <span>Spread: {event.odds.spread.home}</span>
                      <span>O/U: {event.odds.total?.line}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Live Betting Banner */}
          <div className="mt-6 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-4 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-purple-400" />
              <div>
                <div className="font-bold">Live Betting Available</div>
                <div className="text-sm text-gray-400">Place bets during the game with updated odds</div>
              </div>
            </div>
            <Button variant="ghost" className="text-purple-400 hover:text-purple-300">
              Explore <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
