"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Candidate {
  id: string;
  nickname: string;
  fullName: string;
  department: string;
  avatarGradient: string;
}

interface VotingState {
  selectedCandidates: Candidate[];
  impressions: Record<string, string>;
  hasVoted: boolean;
}

interface VotingContextType {
  state: VotingState;
  toggleCandidate: (candidate: Candidate) => void;
  updateImpression: (candidateId: string, impression: string) => void;
  submitVote: () => void;
  clearState: () => void;
  setHasVoted: (val: boolean) => void;
}

const VotingContext = createContext<VotingContextType | undefined>(undefined);

export function VotingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VotingState>({
    selectedCandidates: [],
    impressions: {},
    hasVoted: false,
  });

  useEffect(() => {
    // Check if user has already voted
    const voted = localStorage.getItem("voteStatus") === "completed";
    if (voted) {
      setState((prev) => ({ ...prev, hasVoted: true }));
    }
    
    // Attempt to load Draft state
    const draft = sessionStorage.getItem("voteDraft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setState((prev) => ({ ...prev, ...parsed }));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    // Save draft state
    if (!state.hasVoted) {
      sessionStorage.setItem("voteDraft", JSON.stringify({
        selectedCandidates: state.selectedCandidates,
        impressions: state.impressions
      }));
    }
  }, [state.selectedCandidates, state.impressions, state.hasVoted]);

  const toggleCandidate = (candidate: Candidate) => {
    setState((prev) => {
      const isSelected = prev.selectedCandidates.some((c) => c.id === candidate.id);
      if (isSelected) {
        return {
          ...prev,
          selectedCandidates: prev.selectedCandidates.filter((c) => c.id !== candidate.id),
        };
      } else {
        if (prev.selectedCandidates.length < 3) {
          return {
            ...prev,
            selectedCandidates: [...prev.selectedCandidates, candidate],
          };
        }
        return prev;
      }
    });
  };

  const updateImpression = (candidateId: string, impression: string) => {
    setState((prev) => ({
      ...prev,
      impressions: { ...prev.impressions, [candidateId]: impression },
    }));
  };

  const submitVote = () => {
    localStorage.setItem("voteStatus", "completed");
    sessionStorage.removeItem("voteDraft");
    setState((prev) => ({ ...prev, hasVoted: true }));
  };

  const clearState = () => {
    setState({ selectedCandidates: [], impressions: {}, hasVoted: false });
    sessionStorage.removeItem("voteDraft");
  };
  
  const setHasVoted = (val: boolean) => {
    setState(prev => ({ ...prev, hasVoted: val }));
  }

  return (
    <VotingContext.Provider value={{ state, toggleCandidate, updateImpression, submitVote, clearState, setHasVoted }}>
      {children}
    </VotingContext.Provider>
  );
}

export function useVoting() {
  const context = useContext(VotingContext);
  if (context === undefined) {
    throw new Error("useVoting must be used within a VotingProvider");
  }
  return context;
}
