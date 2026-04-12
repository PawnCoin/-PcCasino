import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket, sendEngineAction, setEngineReady, getEngineState, createEngineRoom, joinEngineRoom, leaveEngineRoom, addBotsToRoom, joinMatchmaking, leaveMatchmaking } from '@/lib/socket';

interface UseServerGameOptions {
  gameType: string;
  autoConnect?: boolean;
}

export function useServerGame<T = Record<string, unknown>>({ gameType, autoConnect = true }: UseServerGameOptions) {
  const [gameState, setGameState] = useState<T | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [matchmaking, setMatchmaking] = useState(false);
  const socketRef = useRef(getSocket());

  useEffect(() => {
    const socket = socketRef.current;

    const handleState = (state: T) => {
      setGameState(state);
      setConnected(true);
    };

    const handleRoomCreated = ({ roomId: rid, gameType: gt }: { roomId: string; gameType: string }) => {
      if (gt === gameType) {
        setRoomId(rid);
        getEngineState(gameType);
      }
    };

    const handleRoomJoined = ({ roomId: rid, gameType: gt }: { roomId: string; gameType: string }) => {
      if (gt === gameType) {
        setRoomId(rid);
        getEngineState(gameType);
      }
    };

    const handleMatched = ({ roomId: rid, gameType: gt }: { roomId: string; gameType: string }) => {
      if (gt === gameType) {
        setRoomId(rid);
        setMatchmaking(false);
        getEngineState(gameType);
      }
    };

    const handleError = ({ error: err }: { error: string }) => {
      setError(err);
      setTimeout(() => setError(null), 3000);
    };

    const handleBalanceUpdate = ({ balance }: { balance: number }) => {
      setGameState(prev => prev ? { ...prev, updatedBalance: balance } as T : prev);
    };

    socket.on(`${gameType}:state`, handleState);
    socket.on('engine:roomCreated', handleRoomCreated);
    socket.on('engine:roomJoined', handleRoomJoined);
    socket.on('matchmaking:matched', handleMatched);
    socket.on('engine:error', handleError);
    socket.on('game:balanceUpdate', handleBalanceUpdate);

    return () => {
      socket.off(`${gameType}:state`, handleState);
      socket.off('engine:roomCreated', handleRoomCreated);
      socket.off('engine:roomJoined', handleRoomJoined);
      socket.off('matchmaking:matched', handleMatched);
      socket.off('engine:error', handleError);
      socket.off('game:balanceUpdate', handleBalanceUpdate);
    };
  }, [gameType]);

  const sendAction = useCallback((action: string, data?: unknown) => {
    sendEngineAction(gameType, action, data);
  }, [gameType]);

  const ready = useCallback(() => {
    setEngineReady(gameType);
  }, [gameType]);

  const requestState = useCallback(() => {
    getEngineState(gameType);
  }, [gameType]);

  const createRoom = useCallback((betAmount: number) => {
    createEngineRoom(gameType, betAmount);
  }, [gameType]);

  const joinRoom = useCallback((rid: string, betAmount: number) => {
    joinEngineRoom(rid, gameType, betAmount);
  }, [gameType]);

  const leaveRoom = useCallback(() => {
    leaveEngineRoom(gameType);
    setRoomId(null);
    setGameState(null);
    setConnected(false);
  }, [gameType]);

  const addBots = useCallback((count: number) => {
    addBotsToRoom(gameType, count);
  }, [gameType]);

  const findMatch = useCallback((betAmount: number) => {
    joinMatchmaking(gameType, betAmount);
    setMatchmaking(true);
  }, [gameType]);

  const cancelMatchmaking = useCallback(() => {
    leaveMatchmaking();
    setMatchmaking(false);
  }, [gameType]);

  const onEvent = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    const socket = socketRef.current;
    socket.on(`${gameType}:${event}`, handler);
    return () => { socket.off(`${gameType}:${event}`, handler); };
  }, [gameType]);

  const onAnyEvent = useCallback((event: string, handler: (...args: unknown[]) => void) => {
    const socket = socketRef.current;
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, []);

  return {
    gameState,
    roomId,
    connected,
    error,
    matchmaking,
    sendAction,
    ready,
    requestState,
    createRoom,
    joinRoom,
    leaveRoom,
    addBots,
    findMatch,
    cancelMatchmaking,
    onEvent,
    onAnyEvent,
    socketId: socketRef.current?.id,
  };
}
