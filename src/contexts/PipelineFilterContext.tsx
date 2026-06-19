"use client";
import { createContext, useContext, useState, useEffect, useCallback } from "react";

export type PipelineType = "mwx" | "mediawave" | null;

interface PipelineFilterContextValue {
  pipelineType: PipelineType;
  setPipelineType: (t: PipelineType) => void;
}

const PipelineFilterContext = createContext<PipelineFilterContextValue>({
  pipelineType: null,
  setPipelineType: () => {},
});

export function PipelineFilterProvider({ children }: { children: React.ReactNode }) {
  const [pipelineType, setPipelineTypeState] = useState<PipelineType>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("pipelineType");
      if (stored === "mwx" || stored === "mediawave") return stored;
    }
    return null;
  });

  const setPipelineType = useCallback((t: PipelineType) => {
    setPipelineTypeState(t);
    if (t) {
      localStorage.setItem("pipelineType", t);
    } else {
      localStorage.removeItem("pipelineType");
    }
  }, []);

  return (
    <PipelineFilterContext.Provider value={{ pipelineType, setPipelineType }}>
      {children}
    </PipelineFilterContext.Provider>
  );
}

export function usePipelineFilter() {
  return useContext(PipelineFilterContext);
}
