import { useState, useEffect, useCallback } from 'react';

export type CardDeckStyle = 
  | 'classic'
  | 'emerald_prestige'
  | 'vegas_gold_black'
  | 'modern_luxury_diamond'
  | 'silver_holographic'
  | 'midnight_purple'
  | 'neon_cyberpunk'
  | 'retro_classic'
  | 'custom_1'
  | 'custom_2'
  | 'custom_3';

export interface CardDeck {
  id: CardDeckStyle;
  name: string;
  description: string;
  image: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  isCustom?: boolean;
}

export const BUILTIN_DECKS: CardDeck[] = [
  {
    id: 'classic',
    name: 'Classic Vegas',
    description: 'Traditional blue diamond pattern',
    image: '',
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

function loadCustomDecks(): CardDeck[] {
  try {
    const stored = localStorage.getItem('pcasino_custom_decks');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomDecks(decks: CardDeck[]) {
  localStorage.setItem('pcasino_custom_decks', JSON.stringify(decks));
}

export let CARD_DECKS: CardDeck[] = [...BUILTIN_DECKS, ...loadCustomDecks()];

export function useCardDeck() {
  const [selectedDeck, setSelectedDeck] = useState<CardDeckStyle>(() => {
    const stored = localStorage.getItem('pcasino_card_deck');
    return (stored as CardDeckStyle) || 'classic';
  });

  const [allDecks, setAllDecks] = useState<CardDeck[]>(() => [...BUILTIN_DECKS, ...loadCustomDecks()]);

  useEffect(() => {
    localStorage.setItem('pcasino_card_deck', selectedDeck);
  }, [selectedDeck]);

  const selectDeck = useCallback((deckId: CardDeckStyle) => {
    setSelectedDeck(deckId);
  }, []);

  const getCurrentDeck = useCallback(() => {
    return allDecks.find(d => d.id === selectedDeck) || allDecks[0];
  }, [selectedDeck, allDecks]);

  const addCustomDeck = useCallback((name: string, imageDataUrl: string) => {
    const customDecks = loadCustomDecks();
    const idx = customDecks.length;
    const deckId = (['custom_1', 'custom_2', 'custom_3'] as CardDeckStyle[])[idx % 3];
    const newDeck: CardDeck = {
      id: deckId,
      name,
      description: 'Custom uploaded card back',
      image: imageDataUrl,
      rarity: 'epic',
      isCustom: true,
    };
    const updated = customDecks.filter(d => d.id !== deckId).concat(newDeck);
    saveCustomDecks(updated);
    const newAll = [...BUILTIN_DECKS, ...updated];
    CARD_DECKS = newAll;
    setAllDecks(newAll);
    setSelectedDeck(deckId);
  }, []);

  const getCardBackStyle = useCallback(() => {
    const deck = getCurrentDeck();
    
    if (deck.id === 'classic' || !deck.image) {
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
    addCustomDeck,
    allDecks,
  };
}
