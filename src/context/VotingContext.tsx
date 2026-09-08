"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface Candidate {
  id: string;
  nickname: string;
  fullName: string;
  department: string;
  avatarGradient: string;
}

export interface Category {
  id: string;
  title: string;
  description: string;
  criteria: string;
  color: string;
}

export const VOTING_CATEGORIES: Category[] = [
  {
    id: "teaching",
    title: "Teaching & Mentorship",
    description: "ทักษะการสอนและการถ่ายทอดความรู้",
    criteria: "ความสามารถในการอธิบายเคสที่ซับซ้อนให้เข้าใจง่าย, ความใจเย็นเมื่อนักเรียนทำหัตถการช้า, และการเปิดโอกาสให้ซักถามโดยไม่ทำให้รู้สึกกดดัน",
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: "clinical",
    title: "Clinical Excellence & Safety",
    description: "ด้านการเป็นต้นแบบความปลอดภัย",
    criteria: "ความเป็นมืออาชีพและความละเอียดรอบคอบในการดูแลผู้ป่วย เช่น ความพิถีพิถันในการจัดท่า (Positioning) อย่างถูกต้องเพื่อป้องกันรอยกดทับ (Pressure sore) หรือ การบาดเจ็บจากการผ่าตัด การควบคุมสัญญาณชีพ การทำงานตามมาตรฐานอย่างเคร่งครัด และการเป็นกระบอกเสียงปกป้องความปลอดภัยให้คนไข้",
    color: "from-emerald-400 to-teal-500"
  },
  {
    id: "safezone",
    title: "The Safe Zone",
    description: "ด้านความใส่ใจและสร้างบรรยากาศ: รางวัล \"เซฟโซนของน้อง\"",
    criteria: "การเป็นที่พึ่งทางใจ สร้างบรรยากาศในห้องผ่าตัดที่ไม่กดดัน ทำให้นักเรียนรู้สึกว่ากล้าถามในสิ่งที่สงสัย กล้ารายงานปัญหาทันทีโดยไม่ต้องกลัว และคอยสังเกตความเหนื่อยล้าหรือให้กำลังใจในวันที่เจอเคสยาก",
    color: "from-pink-400 to-rose-500"
  },
  {
    id: "idol",
    title: "The Inspiring Role Model",
    description: "ด้านความทุ่มเทและทัศนคติ: รางวัล \"ไอดอลแห่งความทุ่มเท\"",
    criteria: "แรงบรรดาลใจในการทำงาน การรับมือกับวิกฤตหรือความตึงเครียดด้วยสติและพลังบวก การประสานงานกับทีมศัลยแพทย์ได้อย่างราบรื่น และเป็นสตาฟที่นักเรียนมองแล้วรู้สึกมีไฟ อยากเติบโตไปเป็นวิสัญญีพยาบาลที่เก่งและทุ่มเทแบบนี้",
    color: "from-amber-400 to-orange-500"
  }
];

export interface CategoryVote {
  candidate: Candidate;
  reason: string;
}

interface VotingState {
  votes: Record<string, CategoryVote>;
  hasVoted: boolean;
}

interface VotingContextType {
  state: VotingState;
  setVote: (categoryId: string, candidate: Candidate, reason: string) => void;
  removeVote: (categoryId: string) => void;
  submitVote: () => void;
  clearState: () => void;
  setHasVoted: (val: boolean) => void;
}

const VotingContext = createContext<VotingContextType | undefined>(undefined);

export function VotingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VotingState>({
    votes: {},
    hasVoted: false,
  });

  useEffect(() => {
    // Check if user has already voted
    const voted = localStorage.getItem("voteStatus") === "completed";
    if (voted) {
      setState((prev) => ({ ...prev, hasVoted: true }));
    }

    // Attempt to load Draft state
    const draft = sessionStorage.getItem("voteDraftV2");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        setState((prev) => ({ ...prev, votes: parsed.votes || {} }));
      } catch (e) { }
    }
  }, []);

  useEffect(() => {
    // Save draft state
    if (!state.hasVoted) {
      sessionStorage.setItem("voteDraftV2", JSON.stringify({
        votes: state.votes,
      }));
    }
  }, [state.votes, state.hasVoted]);

  const setVote = (categoryId: string, candidate: Candidate, reason: string) => {
    setState((prev) => ({
      ...prev,
      votes: {
        ...prev.votes,
        [categoryId]: { candidate, reason }
      }
    }));
  };

  const removeVote = (categoryId: string) => {
    setState((prev) => {
      const newVotes = { ...prev.votes };
      delete newVotes[categoryId];
      return { ...prev, votes: newVotes };
    });
  };

  const submitVote = () => {
    localStorage.setItem("voteStatus", "completed");
    sessionStorage.removeItem("voteDraftV2");
    setState((prev) => ({ ...prev, hasVoted: true }));
  };

  const clearState = () => {
    setState({ votes: {}, hasVoted: false });
    sessionStorage.removeItem("voteDraftV2");
  };

  const setHasVoted = (val: boolean) => {
    setState(prev => ({ ...prev, hasVoted: val }));
  }

  return (
    <VotingContext.Provider value={{ state, setVote, removeVote, submitVote, clearState, setHasVoted }}>
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
