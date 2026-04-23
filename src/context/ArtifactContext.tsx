"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type ArtifactType = "html" | "svg" | "code" | "markdown";

export type Artifact = {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string;
  status?: 'generating' | 'complete';
};

interface ArtifactContextType {
  activeArtifact: Artifact | null;
  setActiveArtifact: (artifact: Artifact | null) => void;
  isPanelOpen: boolean;
  setIsPanelOpen: (isOpen: boolean) => void;
  artifacts: Artifact[];
  addOrUpdateArtifact: (artifact: Artifact) => void;
}

const ArtifactContext = createContext<ArtifactContextType | undefined>(undefined);

export function ArtifactProvider({ children }: { children: ReactNode }) {
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);

  const addOrUpdateArtifact = React.useCallback((artifact: Artifact) => {
    setArtifacts((prev) => {
      const exists = prev.findIndex((a) => a.id === artifact.id);
      if (exists !== -1) {
        if (prev[exists].content === artifact.content && prev[exists].title === artifact.title && prev[exists].status === artifact.status) {
          return prev;
        }
        const updated = [...prev];
        updated[exists] = artifact;
        return updated;
      }
      return [...prev, artifact];
    });
    
    // Only set as active and open if not already active or if status changed to generating/complete
    setActiveArtifact(prev => (prev?.id === artifact.id && prev?.content === artifact.content && prev?.status === artifact.status) ? prev : artifact);
    setIsPanelOpen(prev => prev ? prev : true);
  }, []); // No dependencies needed as setters are stable

  const contextValue = React.useMemo(() => ({
    activeArtifact, setActiveArtifact,
    isPanelOpen, setIsPanelOpen,
    artifacts, addOrUpdateArtifact
  }), [activeArtifact, isPanelOpen, artifacts, addOrUpdateArtifact]);

  return (
    <ArtifactContext.Provider value={contextValue}>
      {children}
    </ArtifactContext.Provider>
  );
}

export function useArtifacts() {
  const context = useContext(ArtifactContext);
  if (!context) throw new Error("useArtifacts must be used within ArtifactProvider");
  return context;
}
