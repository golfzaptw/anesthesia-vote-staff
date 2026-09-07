"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useVoting, Candidate } from "@/context/VotingContext";
import { Search, CheckCircle2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function VotePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string>("All");
  
  const { state, toggleCandidate } = useVoting();
  const router = useRouter();

  useEffect(() => {
    if (state.hasVoted) {
      router.replace("/success");
    }
  }, [state.hasVoted, router]);

  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const q = query(collection(db, "candidates"), orderBy("department"));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => doc.data() as Candidate);
        setCandidates(data);
      } catch (err) {
        console.error("Error fetching candidates", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCandidates();
  }, []);

  const departments = useMemo(() => {
    const depts = new Set(candidates.map(c => c.department));
    return ["All", ...Array.from(depts)];
  }, [candidates]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = c.nickname.toLowerCase().includes(search.toLowerCase()) || 
                          c.fullName.toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept === "All" || c.department === filterDept;
      return matchSearch && matchDept;
    });
  }, [candidates, search, filterDept]);

  const selectedCount = state.selectedCandidates.length;
  const isMaxReached = selectedCount === 3;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-slate-500">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p>กำลังโหลดรายชื่อ...</p>
      </div>
    );
  }

  return (
    <div className="pb-36 pt-8 px-4 flex flex-col h-full relative">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Vote your favorite staff</h1>
        <p className="text-sm text-slate-500 mt-1">Select exactly 3 candidates to proceed.</p>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="ค้นหาชื่อ..."
          className="w-full bg-white border-0 shadow-sm rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Categories */}
      <div className="flex overflow-x-auto gap-2 pb-2 mb-4 scrollbar-hide snap-x">
        {departments.map(dept => (
          <button
            key={dept}
            onClick={() => setFilterDept(dept)}
            className={`snap-start whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition-all ${
              filterDept === dept 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" 
                : "bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            }`}
          >
            {dept}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-4">
        <AnimatePresence>
          {filteredCandidates.map(c => {
            const isSelected = state.selectedCandidates.some(sel => sel.id === c.id);
            const isDisabled = isMaxReached && !isSelected;
            
            // Extract first thai char
            const initial = c.nickname.match(/[ก-ฮ]/)?.[0] || c.nickname.charAt(0);

            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={c.id}
                onClick={() => !isDisabled && toggleCandidate(c)}
                className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 cursor-pointer ${
                  isSelected 
                    ? "bg-indigo-50 border-2 border-indigo-500 shadow-md scale-[1.02]" 
                    : isDisabled 
                      ? "bg-white/50 border-2 border-transparent opacity-50 grayscale-[50%]" 
                      : "bg-white border-2 border-transparent shadow-sm hover:shadow-md"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 text-indigo-600">
                    <CheckCircle2 className="w-5 h-5 fill-indigo-100" />
                  </div>
                )}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-inner bg-gradient-to-br ${c.avatarGradient}`}>
                    {initial}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800 line-clamp-1">{c.nickname}</h3>
                    <p className="text-xs text-slate-400 line-clamp-1">{c.fullName}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] uppercase font-medium tracking-wider">
                      {c.department}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        
        {filteredCandidates.length === 0 && (
          <div className="col-span-2 py-10 text-center text-slate-400">
            ไม่พบรายชื่อที่ค้นหา
          </div>
        )}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 pb-8 glass rounded-t-3xl z-50">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium text-slate-600">
            Selected: <strong className="text-indigo-600 text-lg">{selectedCount}</strong> / 3
          </span>
          <button
            onClick={() => router.push("/impressions")}
            disabled={!isMaxReached}
            className={`px-6 py-2.5 rounded-full font-semibold transition-all ${
              isMaxReached 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-300 hover:bg-indigo-700 hover:scale-105 active:scale-95" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            Next Step
          </button>
        </div>
        
        {/* Selected Chips */}
        <div className="flex gap-2 h-10 items-center overflow-x-auto scrollbar-hide">
          <AnimatePresence>
            {state.selectedCandidates.map(c => (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.8 }}
                key={`chip-${c.id}`} 
                className="flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full text-xs font-medium text-indigo-700 whitespace-nowrap"
              >
                {c.nickname}
                <button onClick={(e) => { e.stopPropagation(); toggleCandidate(c); }} className="hover:bg-indigo-200 rounded-full p-0.5 transition-colors">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
          {selectedCount === 0 && (
            <span className="text-xs text-slate-400 italic">Select candidates to proceed...</span>
          )}
        </div>
      </div>
    </div>
  );
}
