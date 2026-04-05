import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Check, Sparkles, Star, Crown, Gem, Upload } from 'lucide-react';
import type { CardDeckStyle } from '@/hooks/useCardDeck';

interface CardDeck {
  id: CardDeckStyle;
  name: string;
  description: string;
  image: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isCustom?: boolean;
}

interface CardDeckSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDeck: CardDeckStyle;
  allDecks: CardDeck[];
  onSelectDeck: (deckId: CardDeckStyle) => void;
  onUploadDeck?: (name: string, imageDataUrl: string) => void;
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
  allDecks,
  onSelectDeck,
  onUploadDeck,
}: CardDeckSelectorProps) {
  const [hoveredDeck, setHoveredDeck] = useState<CardDeckStyle | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      const name = uploadName.trim() || file.name.replace(/\.[^.]+$/, '');
      onUploadDeck?.(name, dataUrl);
      setShowUpload(false);
      setUploadName('');
      if (fileRef.current) fileRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const currentDeck = allDecks.find(d => d.id === selectedDeck);
  const rarity = rarityConfig[currentDeck?.rarity || 'common'];

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
                    const Icon = rarity.icon;
                    return (
                      <>
                        <div 
                          className="w-20 h-28 rounded-lg overflow-hidden shadow-lg"
                          style={{ 
                            background: currentDeck?.image 
                              ? `url(${currentDeck.image}) center/cover` 
                              : 'repeating-linear-gradient(45deg,#1a237e,#1a237e 10px,#283593 10px,#283593 20px)',
                            border: `2px solid ${rarity.color}`,
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-bold text-white">{currentDeck?.name}</span>
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
                          <p className="text-sm text-[#808080] mt-1">{currentDeck?.description}</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Deck Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {allDecks.map((deck) => {
                  const isSelected = selectedDeck === deck.id;
                  const deckRarity = rarityConfig[deck.rarity];
                  const Icon = deckRarity.icon;
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
                            border: `1px solid ${isSelected ? '#D4AF37' : isHovered ? deckRarity.color : 'rgba(93,64,55,0.5)'}`,
                          }}
                        >
                          <div 
                            className="w-full aspect-[2/3] rounded-lg mb-3 overflow-hidden shadow-lg"
                            style={{ 
                              background: deck.image 
                                ? `url(${deck.image}) center/cover` 
                                : 'repeating-linear-gradient(45deg,#1a237e,#1a237e 8px,#283593 8px,#283593 16px)',
                              boxShadow: isHovered 
                                ? `0 0 20px ${deckRarity.color}50` 
                                : '0 4px 15px rgba(0,0,0,0.5)',
                            }}
                          />
                          <div className="text-left">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm text-white truncate">{deck.name}</span>
                              {isSelected && <Check className="w-4 h-4 text-[#43A047]" />}
                            </div>
                            <span 
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold"
                              style={{ 
                                background: `${deckRarity.color}20`,
                                color: deckRarity.color,
                              }}
                            >
                              <Icon className="w-3 h-3" />
                              {deck.isCustom ? 'Custom' : deckRarity.label}
                            </span>
                          </div>
                          {isSelected && (
                            <div 
                              className="absolute inset-0 rounded-xl pointer-events-none"
                              style={{ boxShadow: 'inset 0 0 20px rgba(212,175,55,0.3)' }}
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

              {/* Upload Custom Deck */}
              <div className="mt-6 p-4 rounded-xl" style={{ background: 'rgba(212,175,55,0.06)', border: '1px solid rgba(212,175,55,0.2)' }}>
                <div className="text-sm font-bold text-[#D4AF37] mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Custom Card Back
                </div>
                {!showUpload ? (
                  <div>
                    <p className="text-xs text-[#808080] mb-3">
                      Upload your own card back image (PNG, JPG). You can upload up to 3 custom designs.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowUpload(true)}
                      className="border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10 text-xs"
                    >
                      <Upload className="w-3 h-3 mr-2" />
                      Upload Image
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder="Deck name (optional)"
                      value={uploadName}
                      onChange={e => setUploadName(e.target.value)}
                      className="w-full text-sm rounded-lg px-3 py-2 text-white outline-none"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)' }}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => fileRef.current?.click()}
                        className="btn-primary text-xs flex-1"
                      >
                        <Upload className="w-3 h-3 mr-2" />
                        Choose File
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setShowUpload(false); setUploadName(''); }}
                        className="border-[#5D4037]/50 text-[#C0C0C0] text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                    <p className="text-[10px] text-[#4b5563]">Supported: PNG, JPG, JPEG, WebP — recommended size 300×420px</p>
                  </div>
                )}
              </div>

              {/* Info Section */}
              <div className="mt-4 p-4 rounded-xl bg-[#5D4037]/20 border border-[#5D4037]/30">
                <div className="text-sm font-bold text-[#D4AF37] mb-2">About Card Decks</div>
                <p className="text-sm text-[#808080]">
                  Choose your preferred card back design. This will be used for all hidden cards 
                  in Poker, Blackjack, and other card games. Your selection is saved automatically.
                </p>
              </div>
            </div>
          </ScrollArea>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#5D4037]/30">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-[#5D4037]/50 text-[#C0C0C0]"
            >
              Cancel
            </Button>
            <Button onClick={onClose} className="btn-primary">
              <Check className="w-4 h-4 mr-2" />
              Confirm Selection
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
