"use client";

import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useVoting, Candidate, Category } from "@/context/VotingContext";
import { Search, CheckCircle2, ChevronRight, X, UserPlus, Info, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function VotePage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Modal state
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState<string>("All");
  
  // Selection state within modal
  const [tempSelectedCandidate, setTempSelectedCandidate] = useState<Candidate | null>(null);
  const [tempReason, setTempReason] = useState("");

  const { state, setVote, removeVote } = useVoting();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    if (state.hasVoted) {
      router.replace("/success");
    } else if (!state.voterName && !state.loadingCategories) {
      router.replace("/");
    }
  }, [state.hasVoted, state.voterName, state.loadingCategories, router]);

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
    setMounted(true);
  }, []);

  const departments = useMemo(() => {
    const depts = new Set(candidates.map(c => c.department));
    return ["All", ...Array.from(depts)];
  }, [candidates]);

  // All candidates currently selected in ANY category
  const allSelectedCandidateIds = useMemo(() => {
    return Object.values(state.votes).map(v => v.candidate.id);
  }, [state.votes]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => {
      const matchSearch = c.nickname.toLowerCase().includes(search.toLowerCase()) || 
                          c.fullName.toLowerCase().includes(search.toLowerCase());
      const matchDept = filterDept === "All" || c.department === filterDept;
      return matchSearch && matchDept;
    });
  }, [candidates, search, filterDept]);

  const isAllCategoriesFilled = state.categories.length > 0 && state.categories.every(c => state.votes[c.id]);

  const handleOpenModal = (category: Category) => {
    setActiveCategory(category);
    // Pre-fill if already voted
    const existingVote = state.votes[category.id];
    if (existingVote) {
      setTempSelectedCandidate(existingVote.candidate);
      setTempReason(existingVote.reason);
    } else {
      setTempSelectedCandidate(null);
      setTempReason("");
    }
    setSearch("");
    setFilterDept("All");
  };

  const handleSaveModal = () => {
    if (activeCategory && tempSelectedCandidate && tempReason.trim()) {
      setVote(activeCategory.id, tempSelectedCandidate, tempReason);
      setActiveCategory(null);
    }
  };

  const handleCloseModal = () => {
    setActiveCategory(null);
  };

  if (!mounted) return null;

  if (state.loadingCategories || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="pb-36 pt-8 px-4 flex flex-col h-full relative">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">โหวตสตาฟในดวงใจ ปี 2026</h1>
        <p className="text-sm text-slate-500 mt-1">กรุณาเลือกสตาฟ 1 ท่านสำหรับแต่ละรางวัล</p>
      </div>

      <div className="flex flex-col gap-4">
        {state.categories.map((cat, i) => {
          const vote = state.votes[cat.id];
          const isCompleted = !!vote;
          
          return (
            <motion.div 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              key={cat.id}
              onClick={() => handleOpenModal(cat)}
              className={`rounded-2xl p-5 border-2 cursor-pointer transition-all ${
                isCompleted 
                  ? "bg-white border-emerald-400 shadow-sm" 
                  : "bg-white border-slate-100 shadow-sm hover:border-indigo-200 hover:shadow-md"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1">
                  <h3 className={`font-bold text-lg bg-gradient-to-r ${cat.color} bg-clip-text text-transparent`}>
                    {cat.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{cat.description}</p>
                </div>
                {isCompleted ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                ) : (
                  <ChevronRight className="w-6 h-6 text-slate-300 shrink-0" />
                )}
              </div>
              
              {isCompleted ? (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${vote.candidate.avatarGradient}`}>
                    {vote.candidate.nickname.match(/[ก-ฮ]/)?.[0] || vote.candidate.nickname.charAt(0)}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold text-slate-800">{vote.candidate.nickname}</p>
                    <p className="text-xs text-slate-500 truncate">"{vote.reason}"</p>
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeVote(cat.id); }}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-slate-100 flex items-center text-sm font-medium text-indigo-600 gap-2">
                  <UserPlus className="w-4 h-4" />
                  แตะเพื่อเลือกสตาฟ
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 pb-8 glass rounded-t-3xl z-40">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-600">
            เลือกแล้ว: <strong className="text-indigo-600 text-lg">{Object.keys(state.votes).length}</strong> / {state.categories.length}
          </span>
          <button
            onClick={() => router.push("/confirm")}
            disabled={!isAllCategoriesFilled}
            className={`px-6 py-2.5 rounded-full font-semibold transition-all ${
              isAllCategoriesFilled 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-300 hover:bg-indigo-700 hover:scale-105 active:scale-95" 
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            ตรวจสอบการโหวต
          </button>
        </div>
        {!isAllCategoriesFilled && (
           <p className="text-xs text-slate-400 text-center">กรุณาโหวตให้ครบทุกรางวัลเพื่อดำเนินการต่อ</p>
        )}
      </div>

      {/* Selection Modal */}
      <AnimatePresence>
        {activeCategory && (
          <motion.div 
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-slate-50 flex flex-col h-[100dvh]"
          >
            {/* Modal Header */}
            <div className="bg-white px-4 pt-8 pb-4 shadow-sm z-10 flex flex-col shrink-0">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 pr-4">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-1 block">กำลังเลือกสำหรับ</span>
                  <h2 className="text-xl font-bold text-slate-800 leading-tight">{activeCategory.title}</h2>
                </div>
                <button onClick={handleCloseModal} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-xs flex gap-2 items-start">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>{activeCategory.description}</p>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 pb-32">
              {!tempSelectedCandidate ? (
                <>
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input 
                      type="text" 
                      placeholder="ค้นหาชื่อ..."
                      className="w-full bg-white shadow-sm rounded-xl py-3 pl-10 pr-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>

                  {/* Departments */}
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

                  {/* Candidates Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {filteredCandidates.map(c => {
                      // Disable if candidate is selected in ANOTHER category
                      const isSelectedInOther = allSelectedCandidateIds.includes(c.id) && state.votes[activeCategory.id]?.candidate?.id !== c.id;

                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            if (!isSelectedInOther) {
                              setTempSelectedCandidate(c);
                            }
                          }}
                          className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 ${
                            isSelectedInOther 
                              ? "bg-slate-50 border-2 border-transparent opacity-50 grayscale-[50%] cursor-not-allowed" 
                              : "bg-white border-2 border-transparent shadow-sm hover:shadow-md cursor-pointer hover:border-indigo-100"
                          }`}
                        >
                          <div className="flex flex-col items-center text-center gap-2">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-inner bg-gradient-to-br ${c.avatarGradient}`}>
                              {c.nickname.match(/[ก-ฮ]/)?.[0] || c.nickname.charAt(0)}
                            </div>
                            <div>
                              <h3 className="font-semibold text-slate-800 line-clamp-1">{c.nickname}</h3>
                              <p className="text-xs text-slate-400 line-clamp-1">{c.fullName}</p>
                              <span className="inline-block mt-1 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] uppercase font-medium tracking-wider">
                                {c.department}
                              </span>
                            </div>
                            {isSelectedInOther && (
                              <div className="mt-1 text-[10px] text-rose-500 font-medium">ถูกเลือกในรางวัลอื่นแล้ว</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {filteredCandidates.length === 0 && (
                      <div className="col-span-2 py-10 text-center text-slate-400">
                        ไม่พบรายชื่อที่ค้นหา
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col h-full animate-in fade-in zoom-in duration-300">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col items-center mb-6">
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-inner mb-4 bg-gradient-to-br ${tempSelectedCandidate.avatarGradient}`}>
                      {tempSelectedCandidate.nickname.match(/[ก-ฮ]/)?.[0] || tempSelectedCandidate.nickname.charAt(0)}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-1">{tempSelectedCandidate.nickname}</h3>
                    <p className="text-sm text-slate-500 mb-2">{tempSelectedCandidate.fullName}</p>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs uppercase font-medium tracking-wider">
                      {tempSelectedCandidate.department}
                    </span>
                    <button 
                      onClick={() => setTempSelectedCandidate(null)}
                      className="mt-6 text-sm text-indigo-600 font-medium hover:underline"
                    >
                      เปลี่ยนสตาฟ
                    </button>
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-800 mb-2 ml-1">
                      ทำไมถึงเลือกสตาฟท่านนี้? <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none shadow-sm h-32"
                      placeholder={`เขียนความประทับใจที่มีต่อ ${tempSelectedCandidate.nickname}...`}
                      value={tempReason}
                      onChange={(e) => setTempReason(e.target.value)}
                    ></textarea>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Action */}
            {tempSelectedCandidate && (
              <div className="absolute bottom-0 w-full p-4 bg-white border-t border-slate-100 pb-8">
                <button
                  onClick={handleSaveModal}
                  disabled={!tempReason.trim()}
                  className={`w-full py-3.5 rounded-full font-bold transition-all ${
                    tempReason.trim()
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-300 hover:bg-indigo-700"
                      : "bg-slate-200 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  บันทึกการเลือก
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
