"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { collection, getDocs, doc, writeBatch, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface Candidate {
  id: string;
  nickname: string;
  fullName: string;
  department: string;
  avatarGradient: string;
}

export interface Category {
  id: string;
  order: number;
  title: string;
  description: string;
  color: string;
}

const INITIAL_CATEGORIES: Category[] = [
  {
    id: "teaching",
    order: 1,
    title: "1.ทักษะการสอนและการถ่ายทอดความรู้ (Teaching & Mentorship)",
    description: "เกณฑ์ประเมิน: ความสามารถในการอธิบายเคสที่ซับซ้อนให้เข้าใจง่าย, ความใจเย็นเมื่อนักเรียนทำหัตถการช้า, และการเปิดโอกาสให้ซักถามโดยไม่ทำให้รู้สึกกดดัน",
    color: "from-blue-500 to-indigo-600"
  },
  {
    id: "clinical",
    order: 2,
    title: "2.ด้านการเป็นต้นแบบความปลอดภัย (Clinical Excellence & Safety)",
    description: "เกณฑ์ประเมิน: ความเป็นมืออาชีพและความละเอียดรอบคอบในการดูแลผู้ป่วย เช่น ความพิถีพิถันในการจัดท่า (Positioning) อย่างถูกต้องเพื่อป้องกันรอยกดทับ (Pressure sore) หรือ การบาดเจ็บจากการผ่าตัด การควบคุมสัญญาณชีพ การทำงานตามมาตรฐานอย่างเคร่งครัด และการเป็นกระบอกเสียงปกป้องความปลอดภัยให้คนไข้",
    color: "from-emerald-400 to-teal-500"
  },
  {
    id: "safezone",
    order: 3,
    title: "3.ด้านความใส่ใจและสร้างบรรยากาศ: รางวัล \"เซฟโซนของน้อง\" (The Safe Zone)",
    description: "เกณฑ์ประเมิน: การเป็นที่พึ่งทางใจ สร้างบรรยากาศในห้องผ่าตัดที่ไม่กดดัน ทำให้นักเรียนรู้สึกว่ากล้าถามในสิ่งที่สงสัย กล้ารายงานปัญหาทันทีโดยไม่ต้องกลัว และคอยสังเกตความเหนื่อยล้าหรือให้กำลังใจในวันที่เจอเคสยาก",
    color: "from-pink-400 to-rose-500"
  },
  {
    id: "idol",
    order: 4,
    title: "4.ด้านความทุ่มเทและทัศนคติ: รางวัล \"ไอดอลแห่งความทุ่มเท\" (The Inspiring Role Model)",
    description: "เกณฑ์ประเมิน: แรงบรรดาลใจในการทำงาน การรับมือกับวิกฤตหรือความตึงเครียดด้วยสติและพลังบวก การประสานงานกับทีมศัลยแพทย์ได้อย่างราบรื่น และเป็นสตาฟที่นักเรียนมองแล้วรู้สึกมีไฟ อยากเติบโตไปเป็นวิสัญญีพยาบาลที่เก่งและทุ่มเทแบบนี้",
    color: "from-amber-400 to-orange-500"
  }
];

export interface CategoryVote {
  candidate: Candidate;
  reason: string;
}

interface VotingConfig {
  mode: "manual" | "scheduled";
  isManualOpen: boolean;
  closeAt: string | null;
}

interface VotingState {
  voterName: string;
  votes: Record<string, CategoryVote>;
  hasVoted: boolean;
  categories: Category[];
  loadingCategories: boolean;
  isVotingOpen: boolean;
  votingConfig: VotingConfig;
  loadingStatus: boolean;
}

interface VotingContextType {
  state: VotingState;
  setVoterName: (name: string) => void;
  setVote: (categoryId: string, candidate: Candidate, reason: string) => void;
  removeVote: (categoryId: string) => void;
  submitVote: () => void;
  clearState: () => void;
  setHasVoted: (val: boolean) => void;
}

const VotingContext = createContext<VotingContextType | undefined>(undefined);

export function VotingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VotingState>({
    voterName: "",
    votes: {},
    hasVoted: false,
    categories: [],
    loadingCategories: true,
    isVotingOpen: false,
    votingConfig: { mode: "manual", isManualOpen: false, closeAt: null },
    loadingStatus: true,
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
        setState((prev) => ({ 
          ...prev, 
          votes: parsed.votes || {},
          voterName: parsed.voterName || ""
        }));
      } catch (e) { }
    }
  }, []);

  useEffect(() => {
    const categoriesRef = collection(db, "categories");
    const unsubscribe = onSnapshot(categoriesRef, async (snapshot) => {
      if (snapshot.empty) {
        try {
          const batch = writeBatch(db);
          INITIAL_CATEGORIES.forEach(cat => {
            batch.set(doc(categoriesRef, cat.id), cat);
          });
          await batch.commit();
        } catch (err) {
          console.error("Failed to seed categories", err);
        }
      } else {
        const fetchedCategories = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Category[];
        
        fetchedCategories.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        
        setState(prev => ({ ...prev, categories: fetchedCategories, loadingCategories: false }));
      }
    }, (error) => {
      console.error("Error fetching categories:", error);
      setState(prev => ({ ...prev, loadingCategories: false }));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const statusRef = doc(db, "config", "votingStatus");
    const unsubscribe = onSnapshot(statusRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const config: VotingConfig = {
          mode: data.mode || "manual",
          isManualOpen: data.isManualOpen ?? (data.isOpen ?? false), // Fallback to old field
          closeAt: data.closeAt || null,
        };
        
        // Initial calculation, but since time passes, components will need to re-check if scheduled
        let isOpen = false;
        if (config.mode === "manual") {
          isOpen = config.isManualOpen;
        } else if (config.mode === "scheduled" && config.closeAt) {
          isOpen = new Date().getTime() < new Date(config.closeAt).getTime();
        }
        
        setState(prev => ({ ...prev, isVotingOpen: isOpen, votingConfig: config, loadingStatus: false }));
      } else {
        setState(prev => ({ ...prev, isVotingOpen: false, loadingStatus: false }));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Save draft state
    if (!state.hasVoted) {
      sessionStorage.setItem("voteDraftV2", JSON.stringify({
        voterName: state.voterName,
        votes: state.votes,
      }));
    }
  }, [state.voterName, state.votes, state.hasVoted]);

  const setVoterName = (name: string) => {
    setState((prev) => ({ ...prev, voterName: name }));
  };

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
    setState(prev => ({ ...prev, voterName: "", votes: {}, hasVoted: false }));
    sessionStorage.removeItem("voteDraftV2");
  };

  const setHasVoted = (val: boolean) => {
    setState(prev => ({ ...prev, hasVoted: val }));
  }

  return (
    <VotingContext.Provider value={{ state, setVoterName, setVote, removeVote, submitVote, clearState, setHasVoted }}>
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
