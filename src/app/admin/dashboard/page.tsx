"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import * as XLSX from "xlsx";
import { collection, getDocs, doc, updateDoc, writeBatch, setDoc, deleteDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2, LogOut, MessageSquareText, Trophy, Users, X, Edit2, Search, UploadCloud, FileSpreadsheet, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Category } from "@/context/VotingContext";

const gradients = [
  { bg: 'bg-rose-100', text: 'text-rose-600' },
  { bg: 'bg-pink-100', text: 'text-pink-600' },
  { bg: 'bg-fuchsia-100', text: 'text-fuchsia-600' },
  { bg: 'bg-purple-100', text: 'text-purple-600' },
  { bg: 'bg-violet-100', text: 'text-violet-600' },
  { bg: 'bg-indigo-100', text: 'text-indigo-600' },
  { bg: 'bg-blue-100', text: 'text-blue-600' },
  { bg: 'bg-sky-100', text: 'text-sky-600' },
  { bg: 'bg-cyan-100', text: 'text-cyan-600' },
  { bg: 'bg-teal-100', text: 'text-teal-600' },
  { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  { bg: 'bg-amber-100', text: 'text-amber-600' },
  { bg: 'bg-orange-100', text: 'text-orange-600' },
];

const tailwindGradients = [
  "from-amber-400 to-orange-500",
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-rose-400 to-pink-500",
  "from-purple-400 to-violet-500",
  "from-cyan-400 to-blue-500",
  "from-fuchsia-400 to-purple-500",
];

const getRandomGradient = () => gradients[Math.floor(Math.random() * gradients.length)];

interface VoteSelection {
  categoryId: string;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "staff" | "categories">("leaderboard");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Staff Editing
  const [editingCandidate, setEditingCandidate] = useState<CandidateDoc | null>(null);
  const [savingCandidate, setSavingCandidate] = useState(false);
  const [uploadingStaff, setUploadingStaff] = useState(false);
  const [showUploadGuide, setShowUploadGuide] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<any[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Category Editing
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [savingCategory, setSavingCategory] = useState(false);

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
        const [votesSnap, candidatesSnap, categoriesSnap] = await Promise.all([
          getDocs(collection(db, "votes")),
          getDocs(collection(db, "candidates")),
          getDocs(collection(db, "categories"))
        ]);
        
        setVotesData(votesSnap.docs.map(doc => doc.data() as VoteDoc));
        setCandidates(candidatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CandidateDoc)));
        const cats = categoriesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        cats.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
        setCategories(cats);
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

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    setSavingCategory(true);
    try {
      if (isNewCategory) {
        const newDocRef = doc(collection(db, "categories"));
        const newCat = { ...editingCategory, id: newDocRef.id };
        await setDoc(newDocRef, newCat);
        setCategories(prev => [...prev, newCat].sort((a, b) => (a.order ?? 99) - (b.order ?? 99)));
      } else {
        const catRef = doc(db, "categories", editingCategory.id);
        await updateDoc(catRef, { ...editingCategory });
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? editingCategory : c).sort((a, b) => (a.order ?? 99) - (b.order ?? 99)));
      }
      setEditingCategory(null);
      setIsNewCategory(false);
    } catch (err) {
      console.error(err);
      alert("Failed to save category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Are you sure you want to delete this category? This cannot be undone.")) return;
    try {
      await deleteDoc(doc(db, "categories", id));
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      console.error(err);
      alert("Failed to delete category");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        if (jsonData.length > 0 && !('Nickname' in (jsonData[0] as object))) {
          alert("Invalid file format. Please ensure the header row includes 'Nickname', 'FullName', and 'Department'.");
          return;
        }

        setUploadPreview(jsonData);
        setShowUploadGuide(false);
      } catch (err) {
        console.error(err);
        alert("Error parsing file.");
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleConfirmUpload = async () => {
    if (!uploadPreview) return;
    setUploadingStaff(true);
    try {
      const batch = writeBatch(db);
      
      // Delete old candidates
      candidates.forEach(c => {
        batch.delete(doc(db, "candidates", c.id));
      });

      // Insert new candidates
      const newCandidates: CandidateDoc[] = [];
      uploadPreview.forEach((row: any) => {
        if (!row.Nickname) return;
        const docRef = doc(collection(db, "candidates"));
        const color = getRandomGradient();
        const newCandidate = {
          nickname: row.Nickname?.toString() || "",
          fullName: row.FullName?.toString() || "",
          department: row.Department?.toString() || "",
          bgColor: color.bg,
          textColor: color.text,
        };
        batch.set(docRef, newCandidate);
        newCandidates.push({ id: docRef.id, ...newCandidate });
      });

      await batch.commit();
      setCandidates(newCandidates);
      setUploadPreview(null);
      alert("Staff list replaced successfully!");
    } catch (err) {
      console.error(err);
      alert("Error saving to database.");
    } finally {
      setUploadingStaff(false);
    }
  };

  // Group by category, and rank candidates within each category
  const leaderboardByCategory = useMemo(() => {
    const result: Record<string, LeaderboardEntry[]> = {};
    
    categories.forEach(cat => {
      const map = new Map<string, LeaderboardEntry>();
      
      votesData.forEach(vote => {
        vote.selections.forEach(sel => {
          if (sel.categoryId === cat.id) {
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
            if (sel.reason.trim()) entry.reasons.push(sel.reason.trim());
          }
        });
      });
      
      const sorted = Array.from(map.values()).sort((a, b) => b.votes - a.votes || a.nickname.localeCompare(b.nickname, 'th'));
      
      let currentRank = 1;
      let currentVotes = sorted[0]?.votes || 0;
      result[cat.id] = sorted.map((entry, index) => {
        if (entry.votes < currentVotes) {
          currentRank = index + 1;
          currentVotes = entry.votes;
        }
        return { ...entry, rank: currentRank };
      });
    });
    
    return result;
  }, [votesData, categories]);

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
        <div className="flex gap-2 mb-8 bg-slate-200/50 p-1 rounded-xl w-fit overflow-x-auto">
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "leaderboard" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Leaderboard
          </button>
          <button
            onClick={() => setActiveTab("staff")}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "staff" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Manage Staff
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === "categories" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            Categories
          </button>
        </div>

        {activeTab === "leaderboard" && (
          <>
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
            </div>

            {/* Winners per Category */}
            <h2 className="text-lg font-bold text-slate-800 mb-4">Category Winners (Top 1)</h2>
            <div className="flex flex-col gap-6 mb-8">
              {categories.map((cat) => {
                const leaderboard = leaderboardByCategory[cat.id] || [];
                const top1 = leaderboard.filter(e => e.rank === 1);
                
                return (
                  <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className={`p-4 bg-gradient-to-r ${cat.color} text-white`}>
                      <h3 className="font-bold text-lg">{cat.title}</h3>
                    </div>
                    <div className="p-4 flex flex-col gap-4">
                      {top1.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {top1.map(entry => (
                            <div key={entry.id} className="relative bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col items-center text-center">
                              {top1.length > 1 && (
                                <div className="absolute top-2 left-2 bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-200 shadow-sm animate-pulse">
                                  TIE
                                </div>
                              )}
                              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center font-bold text-white shadow-lg">1</div>
                              <h4 className="font-bold text-slate-800 text-lg">{entry.nickname}</h4>
                              <p className="text-xs text-slate-400 mb-2">{entry.department}</p>
                              <div className="text-2xl font-black text-indigo-600 mb-2">{entry.votes}</div>
                              <button 
                                onClick={() => setSelectedStaff(entry)}
                                className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors"
                              >
                                View Impressions ({entry.reasons.length})
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 py-6">No votes in this category yet.</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <h2 className="text-lg font-bold text-slate-800 mb-4">Full Leaderboards</h2>
            <div className="flex flex-col gap-6">
              {categories.map((cat) => {
                const rest = (leaderboardByCategory[cat.id] || []).filter(e => (e.rank ?? 0) > 1);
                
                return (
                  <div key={cat.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                     <div className="p-3 bg-slate-50 border-b border-slate-100">
                      <h4 className="font-bold text-slate-700 text-sm">Runner-ups: {cat.title}</h4>
                    </div>
                    {rest.map((entry) => (
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
                    {rest.length === 0 && <div className="p-6 text-center text-slate-400">No other candidates</div>}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {activeTab === "staff" && (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
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
              <input 
                type="file" 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />
              <button 
                onClick={() => setShowUploadGuide(true)}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition-colors shrink-0"
              >
                <UploadCloud className="w-5 h-5" />
                Import Data
              </button>
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

        {activeTab === "categories" && (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => {
                  setEditingCategory({ id: "", order: categories.length + 1, title: "", description: "", color: tailwindGradients[0] });
                  setIsNewCategory(true);
                }}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Category
              </button>
            </div>
            <div className="flex flex-col gap-4">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 relative">
                  <div className="flex justify-between items-start mb-2 pr-16">
                    <h3 className={`font-bold text-lg bg-gradient-to-r ${cat.color} bg-clip-text text-transparent`}>
                      <span className="text-slate-400 font-medium mr-2">#{cat.order}</span>
                      {cat.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-2 font-semibold">{cat.description}</p>
                  
                  <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                      onClick={() => { setEditingCategory(cat); setIsNewCategory(false); }}
                      className="p-2 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-full transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 rounded-full transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-100">
                  No categories found.
                </div>
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

      {/* Edit Category Modal */}
      <AnimatePresence>
        {editingCategory && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setEditingCategory(null)}
            />
            <motion.div 
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white rounded-t-3xl shadow-2xl z-50 flex flex-col max-h-[85vh]"
            >
              <div className="p-4 flex justify-between items-center border-b border-slate-100 shrink-0">
                <h3 className="font-bold text-slate-800">{isNewCategory ? "Add Category" : "Edit Category"}</h3>
                <button onClick={() => setEditingCategory(null)} type="button" className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto flex-1">
                <form onSubmit={handleSaveCategory} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Order</label>
                    <input 
                      type="number" required
                      value={editingCategory.order ?? ''}
                      onChange={e => setEditingCategory({...editingCategory, order: parseInt(e.target.value) || 0})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                    <input 
                      type="text" required
                      value={editingCategory.title}
                      onChange={e => setEditingCategory({...editingCategory, title: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Description</label>
                    <input 
                      type="text" required
                      value={editingCategory.description}
                      onChange={e => setEditingCategory({...editingCategory, description: e.target.value})}
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Color Gradient</label>
                    <div className="grid grid-cols-4 gap-2 mt-2">
                      {tailwindGradients.map((grad, i) => (
                        <div 
                          key={i} 
                          onClick={() => setEditingCategory({...editingCategory, color: grad})}
                          className={`h-10 rounded-lg cursor-pointer bg-gradient-to-r ${grad} ${editingCategory.color === grad ? 'ring-2 ring-slate-800 ring-offset-2' : ''}`}
                        />
                      ))}
                    </div>
                  </div>
                  <button 
                    type="submit" disabled={savingCategory}
                    className="mt-6 w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    {savingCategory ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Save Category"}
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

      {/* Upload Confirm Modal */}
      <AnimatePresence>
        {uploadPreview && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => !uploadingStaff && setUploadPreview(null)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileSpreadsheet className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Confirm Import</h3>
                <p className="text-slate-500 mb-6">
                  You are about to upload <strong className="text-slate-800">{uploadPreview.length}</strong> staff members. 
                  <br/><br/>
                  <span className="text-rose-600 font-semibold text-sm bg-rose-50 px-3 py-2 rounded-lg inline-block">
                    ⚠️ Warning: This will DELETE all existing candidates and replace them with this new list.
                  </span>
                </p>
                <div className="flex gap-3">
                  <button 
                    disabled={uploadingStaff}
                    onClick={() => setUploadPreview(null)}
                    className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={uploadingStaff}
                    onClick={handleConfirmUpload}
                    className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center"
                  >
                    {uploadingStaff ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Replace"}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Upload Guide Modal */}
      <AnimatePresence>
        {showUploadGuide && !uploadPreview && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setShowUploadGuide(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-3xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-slate-800">Import Staff Data</h3>
                  <button onClick={() => setShowUploadGuide(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <p className="text-slate-600 mb-4 text-sm leading-relaxed">
                  Please prepare your Excel (<code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700">.xlsx</code>) or CSV file with the following column headers exactly as shown below:
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6 text-sm">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-semibold text-slate-700">Nickname</th>
                        <th className="py-3 px-4 font-semibold text-slate-700">FullName</th>
                        <th className="py-3 px-4 font-semibold text-slate-700">Department</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600">
                      <tr className="border-b border-slate-100">
                        <td className="py-3 px-4 bg-white">พี่บาส</td>
                        <td className="py-3 px-4 bg-white">นายณัฐดนัย สมทรง</td>
                        <td className="py-3 px-4 bg-white">Surgery 1</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">น้องมิ้น</td>
                        <td className="py-3 px-4">นางสาวชุติกาญจน์ วันดี</td>
                        <td className="py-3 px-4">ENT</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  <UploadCloud className="w-5 h-5" />
                  Select File to Upload
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
