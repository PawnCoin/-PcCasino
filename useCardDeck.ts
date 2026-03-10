import { useState, useEffect, useCallback } from 'react';

export type CardDeckStyle = 
  | 'classic'
  | 'emerald_prestige'
  | 'vegas_gold_black'
  | 'modern_luxury_diamond'
  | 'silver_holographic'
  | 'midnight_purple'
  | 'neon_cyberpunk'
  | 'retro_classic';

export interface CardDeck {
  id: CardDeckStyle;
  name: string;
  description: string;
  image: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const CARD_DECKS: CardDeck[] = [
  {
    id: 'classic',
    name: 'Classic Vegas',
    description: 'Traditional blue diamond pattern',
    image: '', // Uses CSS pattern
    rarity: 'common',
  },
  {
    id: 'emerald_prestige',
    name: 'Emerald Prestige',
    description: 'Royal green with gold lion emblem',
    image: '/cards/emerald_prestige_deck.png',
    rarity: 'legendary',
  },
  {
    id: 'vegas_gold_black',
    name: 'Vegas Gold & Black',
    description: 'Luxurious gold on black design',
    image: '/cards/vegas_gold_&_black_deck.png',
    rarity: 'epic',
  },
  {
    id: 'modern_luxury_diamond',
    name: 'Modern Luxury Diamond',
    description: 'Silver and gold crystal spades',
    image: '/cards/modern_luxury_diamond_deck.png',
    rarity: 'epic',
  },
  {
    id: 'silver_holographic',
    name: 'Silver Holographic',
    description: 'Iridescent silver finish',
    image: '/cards/silver_holographic_deck.png',
    rarity: 'rare',
  },
  {
    id: 'midnight_purple',
    name: 'Midnight Purple',
    description: 'Deep purple with gold accents',
    image: '/cards/midnight_purple_deck.png',
    rarity: 'rare',
  },
  {
    id: 'neon_cyberpunk',
    name: 'Neon Cyberpunk',
    description: 'Futuristic neon Vegas style',
    image: '/cards/neon_cyberpunk_vegas_deck.png',
    rarity: 'epic',
  },
  {
    id: 'retro_classic',
    name: 'Retro Classic',
    description: 'Vintage casino nostalgia',
    image: '/cards/retro_classic_casino_deck.png',
    rarity: 'common',
  },
];

export function useCardDeck() {
  const [selectedDeck, setSelectedDeck] = useState<CardDeckStyle>(() => {
    const stored = localStorage.getItem('pcasino_card_deck');
    return (stored as CardDeckStyle) || 'classic';
  });

  useEffect(() => {
    localStorage.setItem('pcasino_card_deck', selectedDeck);
  }, [selectedDeck]);

  const selectDeck = useCallback((deckId: CardDeckStyle) => {
    setSelectedDeck(deckId);
  }, []);

  const getCurrentDeck = useCallback(() => {
    return CARD_DECKS.find(d => d.id === selectedDeck) || CARD_DECKS[0];
  }, [selectedDeck]);

  const getCardBackStyle = useCallback(() => {
    const deck = getCurrentDeck();
    
    if (deck.id === 'classic' || !deck.image) {
      // Return CSS-based classic pattern
      return {
        type: 'css' as const,
        style: {
          background: `
            repeating-linear-gradient(
              45deg,
              #1a237e,
              #1a237e 10px,
              #283593 10px,
              #283593 20px
            )
          `,
          border: '1px solid rgba(255,255,255,0.2)',
        }
      };
    }
    
    return {
      type: 'image' as const,
      image: deck.image,
    };
  }, [getCurrentDeck]);

  return {
    selectedDeck,
    selectDeck,
    getCurrentDeck,
    getCardBackStyle,
    allDecks: CARD_DECKS,
  };
}
