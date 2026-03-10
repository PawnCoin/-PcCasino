import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Sparkles, Star, Crown, Gem } from 'lucide-react';
import { CARD_DECKS, type CardDeckStyle } from '@/hooks/useCardDeck';

interface CardDeckSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDeck: CardDeckStyle;
  onSelectDeck: (deckId: CardDeckStyle) => void;
}

const rarityConfig = {
  common: { color: '#808080', icon: Star, label: 'Common' },
  rare: { color: '#1E88E5', icon: Gem, label: 'Rare' },
  epic: { color: '#9C27B0', icon: Sparkles, label: 'Epic' },
  legendary: { color: '#D4AF37', icon: Crown, label: 'Legendary' },
};

export function CardDeckSelector({ 
  isOpen, 
  onClose, 
  selectedDeck, 
  onSelectDeck 
}: CardDeckSelectorProps) {
  const [hoveredDeck, setHoveredDeck] = useState<CardDeckStyle | null>(null);

  return (
    <TooltipProvider delayDuration={200}>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent 
          className="max-w-4xl max-h-[85vh] overflow-hidden"
          style={{ 
            background: 'rgba(10,10,10,0.98)',
            border: '1px solid rgba(212,175,55,0.4)',
            boxShadow: '0 25px 80px rgba(0,0,0,0.9)'
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-casino text-2xl text-gradient-gold flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-[#D4AF37]" />
              Select Card Deck
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="h-[600px]">
            <div className="p-4">
              {/* Current Selection */}
              <div 
                className="mb-6 p-4 rounded-xl"
                style={{ 
                  background: 'linear-gradient(135deg, rgba(212,175,55,0.15), rgba(212,175,55,0.05))',
                  border: '1px solid rgba(212,175,55,0.3)'
                }}
              >
                <div className="text-sm text-[#808080] mb-2">Currently Selected</div>
                <div className="flex items-center gap-4">
                  {(() => {
                    const deck = CARD_DECKS.find(d => d.id === selectedDeck);
                    const rarity = rarityConfig[deck?.rarity || 'common'];
                    const Icon = rarity.icon;
                    
                    return (
                      <>
                        <div 
                          className="w-20 h-28 rounded-lg overflow-hidden shadow-lg"
                          style={{ 
                            background: deck?.image 
                              ? `url(${deck.image}) center/cover` 
                              : 'linear-gradient(45deg, #1a237e, #283593)',
                            border: `2px solid ${rarity.color}`,
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-white">{deck?.name}</span>
                            <span 
                              className="px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1"
                              style={{ 
                                background: `${rarity.color}30`,
                                color: rarity.color,
                                border: `1px solid ${rarity.color}50`
                              }}
                            >
                              <Icon className="w-3 h-3" />
                              {rarity.label}
                            </span>
                          </div>
                          <p className="text-sm text-[#808080] mt-1">{deck?.description}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Deck Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {CARD_DECKS.map((deck) => {
                  const isSelected = selectedDeck === deck.id;
                  const rarity = rarityConfig[deck.rarity];
                  const Icon = rarity.icon;
                  const isHovered = hoveredDeck === deck.id;

                  return (
                    <Tooltip key={deck.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onSelectDeck(deck.id)}
                          onMouseEnter={() => setHoveredDeck(deck.id)}
                          onMouseLeave={() => setHoveredDeck(null)}
                          className={`
                            relative p-3 rounded-xl transition-all duration-300
                            ${isSelected 
                              ? 'ring-2 ring-[#D4AF37] ring-offset-2 ring-offset-black' 
                              : 'hover:scale-105'
                            }
                          `}
                          style={{
                            background: isSelected 
                              ? 'linear-gradient(135deg, rgba(212,175,55,0.2), rgba(212,175,55,0.05))'
                              : 'rgba(20,20,20,0.8)',
                            border: `1px solid ${isSelected ? '#D4AF37' : isHovered ? rarity.color : 'rgba(93,64,55,0.5)'}`,
                          }}
                        >
                          {/* Card Preview */}
                          <div 
                            className="w-full aspect-[2/3] rounded-lg mb-3 overflow-hidden shadow-lg"
                            style={{ 
                              background: deck.image 
                                ? `url(${deck.image}) center/cover` 
                                : 'linear-gradient(45deg, #1a237e, #283593)',
                              boxShadow: isHovered 
                                ? `0 0 20px ${rarity.color}50` 
                                : '0 4px 15px rgba(0,0,0,0.5)',
                            }}
                          />

                          {/* Deck Info */}
                          <div className="text-left">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm text-white truncate">{deck.name}</span>
                              {isSelected && (
                                <Check className="w-4 h-4 text-[#43A047]" />
                              )}
                            </div>
                            
                            {/* Rarity Badge */}
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                              style={{ 
                                background: `${rarity.color}20`,
                                color: rarity.color,
                              }}
                            >
                              <Icon className="w-3 h-3" />
                              {rarity.label}
                            </span>
                          </div>

                          {/* Selection Glow */}
                          {isSelected && (
                            <div 
                              className="absolute inset-0 rounded-xl pointer-events-none"
                              style={{
                                boxShadow: 'inset 0 0 20px rgba(212,175,55,0.3)',
                              }}
                            />
                          )}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="font-bold">{deck.name}</p>
                        <p className="text-xs text-[#808080]">{deck.description}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Info Section */}
              <div className="mt-6 p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                <div className="text-sm font-bold text-[#D4AF37] mb-2">About Card Decks</div>
                <p className="text-sm text-[#808080]">
                  Choose your preferred card back design. This will be used for all hidden cards 
                  in Poker, Blackjack, and other card games. Your selection is saved automatically.
                </p>
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[#5D4037]/30">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#5D4037]/50 text-[#C0C0C0]"
            >
              Cancel
            </Button>
            <Button
              onClick={onClose}
              className="btn-primary"
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
