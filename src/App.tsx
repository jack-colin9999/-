/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Diamond, 
  Club, 
  Spade, 
  RotateCcw, 
  Trophy, 
  User, 
  Cpu, 
  Plus,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Card, Suit, Rank, GameStatus, GameState } from './types';
import { createDeck, shuffle, isValidMove } from './utils/gameLogic';

const SUIT_ICONS = {
  [Suit.HEARTS]: <Heart className="w-full h-full text-red-500 fill-red-500" />,
  [Suit.DIAMONDS]: <Diamond className="w-full h-full text-red-500 fill-red-500" />,
  [Suit.CLUBS]: <Club className="w-full h-full text-zinc-800 fill-zinc-800" />,
  [Suit.SPADES]: <Spade className="w-full h-full text-zinc-800 fill-zinc-800" />,
};

const SUIT_COLORS = {
  [Suit.HEARTS]: 'text-red-500',
  [Suit.DIAMONDS]: 'text-red-500',
  [Suit.CLUBS]: 'text-zinc-900',
  [Suit.SPADES]: 'text-zinc-900',
};

interface CardViewProps {
  key?: React.Key;
  card?: Card;
  isFaceDown?: boolean;
  onClick?: () => void;
  isPlayable?: boolean;
  isSmall?: boolean;
  className?: string;
}

const CardView = ({ 
  card, 
  isFaceDown = false, 
  onClick, 
  isPlayable = false,
  isSmall = false,
  className = ""
}: CardViewProps) => {
  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: -20 }}
      whileHover={isPlayable ? { y: -10, scale: 1.05 } : {}}
      onClick={onClick}
      className={`
        relative rounded-xl shadow-lg cursor-pointer transition-shadow
        ${isSmall ? 'w-16 h-24' : 'w-24 h-36 md:w-32 md:h-48'}
        ${isFaceDown ? 'bg-indigo-600 border-4 border-white' : 'bg-white border border-zinc-200'}
        ${isPlayable ? 'ring-4 ring-emerald-400 shadow-emerald-200' : ''}
        ${className}
      `}
    >
      {isFaceDown ? (
        <div className="w-full h-full flex items-center justify-center overflow-hidden opacity-20">
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="w-2 h-2 bg-white rounded-full" />
            ))}
          </div>
        </div>
      ) : card ? (
        <div className="w-full h-full flex flex-col p-2 md:p-3">
          <div className={`flex justify-between items-start ${SUIT_COLORS[card.suit]}`}>
            <span className="text-lg md:text-2xl font-bold leading-none">{card.rank}</span>
            <div className="w-4 h-4 md:w-6 md:h-6">{SUIT_ICONS[card.suit]}</div>
          </div>
          <div className="flex-grow flex items-center justify-center">
            <div className="w-8 h-8 md:w-16 md:h-16 opacity-10">
              {SUIT_ICONS[card.suit]}
            </div>
          </div>
          <div className={`flex justify-between items-end rotate-180 ${SUIT_COLORS[card.suit]}`}>
            <span className="text-lg md:text-2xl font-bold leading-none">{card.rank}</span>
            <div className="w-4 h-4 md:w-6 md:h-6">{SUIT_ICONS[card.suit]}</div>
          </div>
        </div>
      ) : null}
    </motion.div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [pendingEight, setPendingEight] = useState<Card | null>(null);
  const [message, setMessage] = useState<string>("欢迎来到杰克疯狂8点！");

  const initGame = useCallback(() => {
    const deck = shuffle(createDeck());
    const playerHand = deck.splice(0, 8);
    const aiHand = deck.splice(0, 8);
    
    // Find a non-8 card for the start
    let firstCardIndex = 0;
    while (deck[firstCardIndex].rank === Rank.EIGHT) {
      firstCardIndex++;
    }
    const discardPile = [deck.splice(firstCardIndex, 1)[0]];

    setGameState({
      deck,
      playerHand,
      aiHand,
      discardPile,
      currentSuit: discardPile[0].suit,
      currentRank: discardPile[0].rank,
      turn: 'player',
      status: 'playing',
      winner: null,
    });
    setPendingEight(null);
    setMessage("轮到你了！请匹配花色或点数。");
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const checkWin = useCallback((state: GameState) => {
    if (state.playerHand.length === 0) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      return { ...state, status: 'won' as GameStatus, winner: 'player' as const };
    }
    if (state.aiHand.length === 0) {
      return { ...state, status: 'lost' as GameStatus, winner: 'ai' as const };
    }
    return state;
  }, []);

  const drawCard = useCallback(() => {
    if (!gameState || gameState.turn !== 'player' || gameState.status !== 'playing') return;

    const { deck, playerHand } = gameState;
    if (deck.length === 0) {
      setMessage("牌堆已空！跳过回合。");
      setGameState(prev => prev ? { ...prev, turn: 'ai' } : null);
      return;
    }

    const newCard = deck[0];
    const newDeck = deck.slice(1);
    const newHand = [...playerHand, newCard];

    setGameState(prev => prev ? {
      ...prev,
      deck: newDeck,
      playerHand: newHand,
      turn: 'ai'
    } : null);
    setMessage("你摸了一张牌。轮到 AI 了。");
  }, [gameState]);

  const playCard = useCallback((card: Card) => {
    if (!gameState || gameState.turn !== 'player' || gameState.status !== 'playing') return;

    if (!isValidMove(card, gameState.currentSuit, gameState.currentRank)) {
      setMessage("无效出牌！请匹配花色或点数。");
      return;
    }

    const newPlayerHand = gameState.playerHand.filter(c => c.id !== card.id);
    
    if (card.rank === Rank.EIGHT) {
      setPendingEight(card);
      setGameState(prev => prev ? {
        ...prev,
        playerHand: newPlayerHand,
        status: 'choosing_suit'
      } : null);
      return;
    }

    const newState: GameState = {
      ...gameState,
      playerHand: newPlayerHand,
      discardPile: [card, ...gameState.discardPile],
      currentSuit: card.suit,
      currentRank: card.rank,
      turn: 'ai',
    };

    setGameState(checkWin(newState));
    setMessage("出得好！AI 正在思考...");
  }, [gameState, checkWin]);

  const selectSuit = useCallback((suit: Suit) => {
    if (!gameState || !pendingEight) return;

    const newState: GameState = {
      ...gameState,
      discardPile: [pendingEight, ...gameState.discardPile],
      currentSuit: suit,
      currentRank: Rank.EIGHT,
      turn: gameState.turn === 'player' ? 'ai' : 'player',
      status: 'playing',
    };

    setGameState(checkWin(newState));
    setPendingEight(null);
    const suitNames = {
      [Suit.HEARTS]: '红心',
      [Suit.DIAMONDS]: '方块',
      [Suit.CLUBS]: '梅花',
      [Suit.SPADES]: '黑桃',
    };
    setMessage(`花色已更改为 ${suitNames[suit]}！`);
  }, [gameState, pendingEight, checkWin]);

  // AI Logic
  useEffect(() => {
    if (gameState?.turn === 'ai' && gameState.status === 'playing') {
      const timer = setTimeout(() => {
        const { aiHand, currentSuit, currentRank, deck } = gameState;
        
        // Try to play a non-8 first
        let playableCard = aiHand.find(c => c.rank !== Rank.EIGHT && isValidMove(c, currentSuit, currentRank));
        
        // If no non-8, try to play an 8
        if (!playableCard) {
          playableCard = aiHand.find(c => c.rank === Rank.EIGHT);
        }

        if (playableCard) {
          const newAiHand = aiHand.filter(c => c.id !== playableCard!.id);
          
          if (playableCard.rank === Rank.EIGHT) {
            // AI picks its most frequent suit
            const suitCounts = newAiHand.reduce((acc, c) => {
              acc[c.suit] = (acc[c.suit] || 0) + 1;
              return acc;
            }, {} as Record<Suit, number>);
            
            const bestSuit = (Object.keys(SUIT_ICONS) as Suit[]).sort((a, b) => (suitCounts[b] || 0) - (suitCounts[a] || 0))[0];
            
            const suitNames = {
              [Suit.HEARTS]: '红心',
              [Suit.DIAMONDS]: '方块',
              [Suit.CLUBS]: '梅花',
              [Suit.SPADES]: '黑桃',
            };
            
            const newState: GameState = {
              ...gameState,
              aiHand: newAiHand,
              discardPile: [playableCard, ...gameState.discardPile],
              currentSuit: bestSuit,
              currentRank: Rank.EIGHT,
              turn: 'player',
            };
            setGameState(checkWin(newState));
            setMessage(`AI 出了一个 8 并选择了 ${suitNames[bestSuit]}！`);
          } else {
            const newState: GameState = {
              ...gameState,
              aiHand: newAiHand,
              discardPile: [playableCard, ...gameState.discardPile],
              currentSuit: playableCard.suit,
              currentRank: playableCard.rank,
              turn: 'player',
            };
            setGameState(checkWin(newState));
            const suitNames = {
              [Suit.HEARTS]: '红心',
              [Suit.DIAMONDS]: '方块',
              [Suit.CLUBS]: '梅花',
              [Suit.SPADES]: '黑桃',
            };
            setMessage(`AI 出了 ${suitNames[playableCard.suit]} ${playableCard.rank}。轮到你了！`);
          }
        } else {
          // AI draws
          if (deck.length > 0) {
            const newCard = deck[0];
            const newDeck = deck.slice(1);
            const newAiHand = [...aiHand, newCard];
            setGameState({
              ...gameState,
              deck: newDeck,
              aiHand: newAiHand,
              turn: 'player',
            });
            setMessage("AI 摸了一张牌。轮到你了！");
          } else {
            setGameState({ ...gameState, turn: 'player' });
            setMessage("AI 跳过（牌堆已空）。轮到你了！");
          }
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [gameState, checkWin]);

  if (!gameState) return null;

  return (
    <div className="min-h-screen bg-emerald-900 text-white font-sans selection:bg-emerald-500/30 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="p-4 md:p-6 flex justify-between items-center bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold">8</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight italic">杰克疯狂8点</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-sm">
            <Info className="w-4 h-4" />
            <span>8 是万能牌！</span>
          </div>
          <button 
            onClick={initGame}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
            title="重新开始"
          >
            <RotateCcw className="w-6 h-6" />
          </button>
        </div>
      </header>

      {/* Game Board */}
      <main className="flex-grow relative flex flex-col items-center justify-between p-4 md:p-8">
        {/* AI Hand */}
        <div className="w-full flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-emerald-200/60 mb-2">
            <Cpu className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-bold">AI 对手 ({gameState.aiHand.length})</span>
          </div>
          <div className="flex justify-center -space-x-8 md:-space-x-12">
            {gameState.aiHand.map((_, i) => (
              <CardView key={i} isFaceDown isSmall />
            ))}
          </div>
        </div>

        {/* Center Area: Deck and Discard */}
        <div className="flex items-center gap-8 md:gap-16 my-8">
          {/* Draw Deck */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              {gameState.deck.length > 0 ? (
                <CardView 
                  isFaceDown 
                  onClick={drawCard}
                  isPlayable={gameState.turn === 'player' && gameState.status === 'playing'}
                  className="hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-24 h-36 md:w-32 md:h-48 border-2 border-dashed border-white/20 rounded-xl flex items-center justify-center">
                  <span className="text-white/20 font-bold">已空</span>
                </div>
              )}
              {gameState.deck.length > 1 && (
                <div className="absolute -top-1 -left-1 w-full h-full bg-indigo-700 border-4 border-white rounded-xl -z-10 shadow-lg" />
              )}
            </div>
            <span className="text-xs font-mono text-emerald-200/60 uppercase tracking-tighter">牌堆 ({gameState.deck.length})</span>
          </div>

          {/* Discard Pile */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <AnimatePresence mode="popLayout">
                <CardView 
                  key={gameState.discardPile[0].id}
                  card={gameState.discardPile[0]} 
                />
              </AnimatePresence>
              {/* Visual stack effect */}
              {gameState.discardPile.length > 1 && (
                <div className="absolute top-2 left-2 w-full h-full bg-white/5 border border-white/10 rounded-xl -z-10 rotate-3" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-emerald-200/60 uppercase tracking-tighter">弃牌堆</span>
              <div className={`w-4 h-4 ${SUIT_COLORS[gameState.currentSuit]}`}>
                {SUIT_ICONS[gameState.currentSuit]}
              </div>
            </div>
          </div>
        </div>

        {/* Status Message */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={message}
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.1, y: -10 }}
              className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 shadow-2xl"
            >
              <p className="text-sm md:text-base font-medium text-center whitespace-nowrap">{message}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Player Hand */}
        <div className="w-full flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-emerald-200 mb-2">
            <User className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-bold">你的手牌 ({gameState.playerHand.length})</span>
          </div>
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 max-w-4xl">
            {gameState.playerHand.map((card) => (
              <CardView 
                key={card.id} 
                card={card} 
                onClick={() => playCard(card)}
                isPlayable={gameState.turn === 'player' && gameState.status === 'playing' && isValidMove(card, gameState.currentSuit, gameState.currentRank)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {gameState.status === 'choosing_suit' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-8 rounded-3xl shadow-2xl max-w-md w-full"
            >
              <h2 className="text-2xl font-bold mb-2 text-center">万能牌！</h2>
              <p className="text-zinc-400 text-center mb-8">选择接下来的花色：</p>
              <div className="grid grid-cols-2 gap-4">
                {(Object.keys(Suit) as Array<keyof typeof Suit>).map((key) => {
                  const suit = Suit[key];
                  const suitNames = {
                    [Suit.HEARTS]: '红心',
                    [Suit.DIAMONDS]: '方块',
                    [Suit.CLUBS]: '梅花',
                    [Suit.SPADES]: '黑桃',
                  };
                  return (
                    <button
                      key={suit}
                      onClick={() => selectSuit(suit)}
                      className="flex flex-col items-center gap-3 p-6 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 transition-all group"
                    >
                      <div className="w-12 h-12 group-hover:scale-110 transition-transform">
                        {SUIT_ICONS[suit]}
                      </div>
                      <span className="text-sm font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100">{suitNames[suit]}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}

        {(gameState.status === 'won' || gameState.status === 'lost') && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-zinc-900 border border-white/10 p-12 rounded-[2rem] shadow-2xl max-w-md w-full text-center"
            >
              <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${gameState.status === 'won' ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50'} shadow-2xl`}>
                {gameState.status === 'won' ? <Trophy className="w-12 h-12" /> : <RotateCcw className="w-12 h-12" />}
              </div>
              <h2 className="text-4xl font-black mb-4 tracking-tight">
                {gameState.status === 'won' ? '大获全胜！' : '游戏结束'}
              </h2>
              <p className="text-zinc-400 mb-10 text-lg">
                {gameState.status === 'won' 
                  ? "你清空了所有手牌！策略非常出色。" 
                  : "AI 这次更快。想再来一局吗？"}
              </p>
              <button
                onClick={initGame}
                className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 text-lg"
              >
                <RotateCcw className="w-5 h-5" />
                再玩一次
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <footer className="p-4 text-center text-[10px] uppercase tracking-[0.2em] text-emerald-200/30 font-bold">
        标准 52 张牌堆 • 无大小王 • 8 是万能牌
      </footer>
    </div>
  );
}
