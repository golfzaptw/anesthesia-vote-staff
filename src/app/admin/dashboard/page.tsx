"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2, LogOut, MessageSquareText, Trophy, Users, X, Edit2, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface VoteSelection {
  candidateId: string;
  candidateNickname: string;
  department: string;
  reason: string;
}

interface VoteDoc {
  selections: VoteSelection[];
}

interface CandidateDoc {
  id: string;
  nickname: string;
  fullName: string;
  department: string;
}

interface LeaderboardEntry {
  id: string;
  nickname: string;
  department: string;
  votes: number;
  reasons: string[];
  rank?: number;
}

export default function AdminDashboardPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [votesData, setVotesData] = useState<VoteDoc[]>([]);
  const [candidates, setCandidates] = useState<CandidateDoc[]>([]);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "staff">("leaderboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingCandidate, setEditingCandidate] = useState<CandidateDoc | null>(null);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<LeaderboardEntry | null>(null);
  const router = useRouter();

  // Auth protection
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/admin/login");
      } else {
        setAuthChecked(true);
      }
    });
    return () => unsub();
  }, [router]);

  // Fetch data
  useEffect(() => {
    if (!authChecked) return;
    
    const fetchData = async () => {
      try {
        const [votesSnap, candidatesSnap] = await Promise.all([
          getDocs(collection(db, "votes")),
          getDocs(collection(db, "candidates"))
        ]);
        
        setVotesData(votesSnap.docs.map(doc => doc.data() as VoteDoc));
        setCandidates(candidatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CandidateDoc)));
      } catch (err) {
        console.error("Failed to fetch data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [authChecked]);

  const filteredCandidates = useMemo(() => {
    return candidates.filter(c => 
      c.nickname.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.department.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [candidates, searchQuery]);

  const handleSaveCandidate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCandidate) return;
    setSavingCandidate(true);
    try {
      const { id, nickname, fullName, department } = editingCandidate;
      await updateDoc(doc(db, "candidates", id), {
        nickname,
        fullName,
        department
      });
      setCandidates(prev => prev.map(c => c.id === id ? editingCandidate : c));
      setEditingCandidate(null);
    } catch (err) {
      console.error("Failed to update candidate", err);
      alert("Failed to update. Check console.");
    } finally {
      setSavingCandidate(false);
    }
  };

  const leaderboard = useMemo(() => {
    const map = new Map<string, LeaderboardEntry>();
    
    votesData.forEach(vote => {
      vote.selections.forEach(sel => {
        if (!map.has(sel.candidateId)) {
          map.set(sel.candidateId, {
            id: sel.candidateId,
            nickname: sel.candidateNickname,
            department: sel.department,
            votes: 0,
            reasons: []
          });
        }
        
        const entry = map.get(sel.candidateId)!;
        entry.votes += 1;
        if (sel.reason.trim()) {
          entry.reasons.push(sel.reason.trim());
        }
      });
    });

    const sorted = Array.from(map.values()).sort((a, b) => {
      if (b.votes !== a.votes) {
        return b.votes - a.votes; // เรียงตามคะแนนมากไปน้อย
      }
      // ถ้าคะแนนเท่ากัน ให้เรียงตามชื่อตัวอักษร (ก-ฮ)
      return a.nickname.localeCompare(b.nickname, 'th');
    });

    let currentRank = 1;
    let currentVotes = sorted[0]?.votes || 0;
    
    return sorted.map((entry, index) => {
      if (entry.votes < currentVotes) {
        currentRank = index + 1;
        currentVotes = entry.votes;
      }
      return { ...entry, rank: currentRank };
    });
  }, [votesData]);

  const top3 = leaderboard.filter(e => (e.rank ?? 0) <= 3);
  const rest = leaderboard.filter(e => (e.rank ?? 0) > 3);

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex justify-center pb-20">
      {/* Remove max-w restriction for admin if desired, but keeping max-w-3xl for tablet readability inside the layout */}
      <div className="w-full max-w-3xl p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Admin Dashboard</h1>
            <p className="text-sm text-slate-500">Overview & Results</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-white rounded-full text-sm font-medium text-slate-600 shadow-sm border border-slate-200 hover:bg-slate-50">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-slate-200/50 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "leaderboard" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "staff" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Manage Staff
          </button>
        </div>

        {activeTab === "leaderboard" ? (
          <>
            {/* Overview Cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-slate-500 font-medium">Total Ballots</div>
              <div className="text-2xl font-bold text-slate-800">{votesData.length}</div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm text-slate-500 font-medium">Staff Voted</div>
              <div className="text-2xl font-bold text-slate-800">{leaderboard.length}</div>
            </div>
          </div>
        </div>

        {/* Top 3 Spotlight */}
        <h2 className="text-lg font-bold text-slate-800 mb-4">Top 3 Candidates</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {top3.map((entry, idx) => {
            // เช็คว่ามีคนได้คะแนนเท่ากับคนนี้มากกว่า 1 คนหรือไม่
            const isTie = leaderboard.filter(e => e.votes === entry.votes).length > 1;
            
            return (
              <div key={entry.id} className="relative bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center text-center">
                
                {/* ป้ายแจ้งเตือนคะแนนเท่ากัน */}
                {isTie && (
                  <div className="absolute top-3 left-3 bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 shadow-sm animate-pulse">
                    TIE
                  </div>
                )}

                <div className={`absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                  entry.rank === 1 ? "bg-amber-400" : entry.rank === 2 ? "bg-slate-300" : "bg-amber-700"
                }`}>
                  {entry.rank}
                </div>
                <h3 className="font-bold text-slate-800 text-lg mt-2">{entry.nickname}</h3>
                <p className="text-xs text-slate-400 mb-3">{entry.department}</p>
                <div className="text-3xl font-black text-indigo-600 mb-3">{entry.votes}</div>
                <button 
                  onClick={() => setSelectedStaff(entry)}
                  className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                >
                  View Impressions ({entry.reasons.length})
                </button>
              </div>
            );
          })}
          {top3.length === 0 && <div className="col-span-3 text-center text-slate-400 py-6">No votes yet</div>}
        </div>

        {/* Full Leaderboard */}
        <h2 className="text-lg font-bold text-slate-800 mb-4">Full Leaderboard</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {rest.map((entry, idx) => (
            <div key={entry.id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="text-slate-400 font-bold w-4 text-right">{entry.rank}</div>
                <div>
                  <div className="font-semibold text-slate-800">{entry.nickname}</div>
                  <div className="text-xs text-slate-400">{entry.department}</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="font-bold text-slate-700">{entry.votes} <span className="text-xs font-normal text-slate-400">votes</span></div>
                <button 
                  onClick={() => setSelectedStaff(entry)}
                  className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                >
                  <MessageSquareText className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
          {rest.length === 0 && top3.length > 0 && <div className="p-6 text-center text-slate-400">No other candidates</div>}
        </div>
          </>
        ) : (
          <>
            {/* Manage Staff View */}
            <div className="mb-6 relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                <Search className="w-5 h-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search staff by name or department..."
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
              />
            </div>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {filteredCandidates.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <div>
                    <div className="font-semibold text-slate-800">{c.nickname}</div>
                    <div className="text-xs text-slate-500">{c.fullName}</div>
                    <div className="text-xs font-medium text-indigo-500 mt-1">{c.department}</div>
                  </div>
                  <button 
                    onClick={() => setEditingCandidate(c)}
                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {filteredCandidates.length === 0 && (
                <div className="p-8 text-center text-slate-400">No staff found matching "{searchQuery}"</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Edit Staff Modal */}
      <AnimatePresence>
        {editingCandidate && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setEditingCandidate(null)}
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col max-h-[85vh]"
            >
              <div className="p-4 flex justify-between items-center border-b border-slate-100 shrink-0">
                <h3 className="font-bold text-slate-800">Edit Staff</h3>
                <button onClick={() => setEditingCandidate(null)} type="button" className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <form onSubmit={handleSaveCandidate} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Nickname</label>
                    <input 
                      type="text" required
                      value={editingCandidate.nickname}
                      onChange={e => setEditingCandidate({...editingCandidate, nickname: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Full Name</label>
                    <input 
                      type="text" required
                      value={editingCandidate.fullName}
                      onChange={e => setEditingCandidate({...editingCandidate, fullName: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
                    <input 
                      type="text" required
                      value={editingCandidate.department}
                      onChange={e => setEditingCandidate({...editingCandidate, department: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                    />
                  </div>
                  <button 
                    type="submit" disabled={savingCandidate}
                    className="mt-4 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {savingCandidate ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Changes"}
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Feedback Explorer Modal */}
      <AnimatePresence>
        {selectedStaff && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setSelectedStaff(null)}
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col max-h-[85vh]"
            >
              <div className="p-4 flex justify-between items-center border-b border-slate-100 shrink-0">
                <div>
                  <h3 className="font-bold text-slate-800">{selectedStaff.nickname}'s Impressions</h3>
                  <p className="text-xs text-slate-500">{selectedStaff.reasons.length} total feedback</p>
                </div>
                <button onClick={() => setSelectedStaff(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3 bg-slate-50">
                {selectedStaff.reasons.map((r, i) => (
                  <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 text-sm text-slate-700 leading-relaxed italic">
                    "{r}"
                  </div>
                ))}
                {selectedStaff.reasons.length === 0 && (
                  <div className="text-center text-slate-400 py-10">
                    No impressions written for this candidate.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
