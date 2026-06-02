"use client";

import { createContext, useContext } from "react";

export type GameViewContextValue = {
  inviteCode: string;
  canPredict: boolean;
  isPlatformOversight: boolean;
};

const GameViewContext = createContext<GameViewContextValue | null>(null);

export function GameViewProvider({
  value,
  children,
}: {
  value: GameViewContextValue;
  children: React.ReactNode;
}) {
  return (
    <GameViewContext.Provider value={value}>{children}</GameViewContext.Provider>
  );
}

export function useGameView(): GameViewContextValue | null {
  return useContext(GameViewContext);
}
