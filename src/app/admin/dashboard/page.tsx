"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, signOut } from "firebase/auth";
import * as XLSX from "xlsx";
import { collection, getDocs, doc, updateDoc, writeBatch, setDoc, deleteDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { Loader2, LogOut, MessageSquareText, Trophy, Users, X, Edit2, Search, UploadCloud, FileSpreadsheet, Plus, Trash2, LayoutDashboard, Menu, CheckCircle2, History, Power, Settings, Clock, Check } from "lucide-react";
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
  id: string;
  voterName?: string;
  votedAt?: { toDate: () => Date };
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
  reasons: { voterName: string; reason: string }[];
  rank?: number;
}

export default function AdminDashboardPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [votesData, setVotesData] = useState<VoteDoc[]>([]);
  const [candidates, setCandidates] = useState<CandidateDoc[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<"leaderboard" | "staff" | "categories" | "voters">("leaderboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [votingConfig, setVotingConfig] = useState<{ mode: "manual" | "scheduled"; isManualOpen: boolean; closeAt: string | null }>({ mode: "manual", isManualOpen: false, closeAt: null });
  const [isVotingSettingsOpen, setIsVotingSettingsOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<{ mode: "manual" | "scheduled"; isManualOpen: boolean; closeAt: string | null }>({ mode: "manual", isManualOpen: false, closeAt: null });
  const [savingConfig, setSavingConfig] = useState(false);
  
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

  // Detailed Voter inspection
  const [inspectingVote, setInspectingVote] = useState<VoteDoc | null>(null);

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
        
        setVotesData(votesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as VoteDoc)).sort((a, b) => (b.votedAt?.toDate()?.getTime() || 0) - (a.votedAt?.toDate()?.getTime() || 0)));
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

    // Listen to voting status
    const statusUnsub = onSnapshot(doc(db, "config", "votingStatus"), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setVotingConfig({
          mode: data.mode || "manual",
          isManualOpen: data.isManualOpen ?? (data.isOpen ?? false),
          closeAt: data.closeAt || null
        });
      }
    });

    return () => statusUnsub();
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
            if (sel.reason.trim()) {
              entry.reasons.push({
                voterName: vote.voterName || "Unknown",
                reason: sel.reason.trim()
              });
            }
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

  const handleSaveVotingConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const statusRef = doc(db, "config", "votingStatus");
      await setDoc(statusRef, { 
        mode: editingConfig.mode, 
        isManualOpen: editingConfig.isManualOpen, 
        closeAt: editingConfig.closeAt 
      }, { merge: true });
      setIsVotingSettingsOpen(false);
    } catch (err) {
      console.error(err);
      alert("Failed to update voting status");
    } finally {
      setSavingConfig(false);
    }
  };

  const currentIsOpen = useMemo(() => {
    if (votingConfig.mode === "manual") return votingConfig.isManualOpen;
    if (votingConfig.mode === "scheduled" && votingConfig.closeAt) {
      return new Date().getTime() < new Date(votingConfig.closeAt).getTime();
    }
    return false;
  }, [votingConfig]);

  if (!authChecked || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
      </div>
    );
  }

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/admin/login");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white border-b border-slate-200 p-4 flex justify-between items-center sticky top-0 z-30">
        <div className="font-bold text-lg text-slate-800">Admin Portal</div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 z-40 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="p-6 hidden md:block">
          <h1 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 tracking-tight">Admin Portal</h1>
        </div>
        
        <div className="flex-1 py-4 px-3 flex flex-col gap-1">
          <button
            onClick={() => { setActiveTab("leaderboard"); setSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "leaderboard" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => { setActiveTab("staff"); setSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "staff" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <Users className="w-5 h-5" />
            Staff List
          </button>
          <button
            onClick={() => { setActiveTab("categories"); setSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "categories" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <Trophy className="w-5 h-5" />
            Categories
          </button>
          <button
            onClick={() => { setActiveTab("voters"); setSidebarOpen(false); }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${activeTab === "voters" ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"}`}
          >
            <History className="w-5 h-5" />
            Voter Records
          </button>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button onClick={handleLogout} className="flex w-full items-center justify-center gap-2 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl text-sm font-semibold text-slate-700 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
        
        {activeTab === "leaderboard" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard Overview</h2>
                <p className="text-slate-500 mt-1">Real-time statistics and voting results</p>
              </div>
              
              {/* System Settings Button */}
              <button 
                onClick={() => {
                  setEditingConfig(votingConfig);
                  setIsVotingSettingsOpen(true);
                }}
                className="bg-white p-2 pl-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Voting System</span>
                  <span className={`text-sm font-bold flex items-center gap-1 ${currentIsOpen ? 'text-emerald-600' : 'text-slate-500'}`}>
                    {currentIsOpen ? "OPEN (Live)" : "CLOSED"}
                    {votingConfig.mode === "scheduled" && <Clock className="w-3.5 h-3.5 ml-1" />}
                  </span>
                </div>
                <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm text-slate-500 font-semibold mb-1">Total Ballots Cast</div>
                  <div className="text-3xl font-black text-slate-800 tracking-tight">{votesData.length}</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                  <Trophy className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm text-slate-500 font-semibold mb-1">Active Categories</div>
                  <div className="text-3xl font-black text-slate-800 tracking-tight">{categories.length}</div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5">
                <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                  <Users className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-sm text-slate-500 font-semibold mb-1">Total Staff</div>
                  <div className="text-3xl font-black text-slate-800 tracking-tight">{candidates.length}</div>
                </div>
              </div>
            </div>

            <h3 className="text-xl font-bold text-slate-800 mb-6">Category Leaderboards</h3>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              {categories.map((cat) => {
                const leaderboard = leaderboardByCategory[cat.id] || [];
                const top1 = leaderboard.filter(e => e.rank === 1);
                const rest = leaderboard.filter(e => (e.rank ?? 0) > 1);
                
                return (
                  <div key={cat.id} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
                    <div className={`p-6 bg-gradient-to-r ${cat.color} text-white`}>
                      <h3 className="font-bold text-xl">{cat.title}</h3>
                    </div>
                    
                    <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex-1">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Winners</h4>
                      {top1.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {top1.map(entry => (
                            <div key={entry.id} className="relative bg-white p-5 rounded-2xl border border-slate-200 flex flex-col shadow-sm">
                              {top1.length > 1 && (
                                <div className="absolute top-3 left-3 bg-rose-100 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded-md border border-rose-200">
                                  TIE
                                </div>
                              )}
                              <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center font-bold text-white shadow-md">1</div>
                              
                              <h4 className="font-bold text-slate-800 text-lg mt-1">{entry.nickname}</h4>
                              <p className="text-xs text-slate-500 mb-3">{entry.department}</p>
                              
                              <div className="mt-auto flex items-center justify-between">
                                <div className="text-2xl font-black text-indigo-600">{entry.votes} <span className="text-xs font-medium text-slate-400">votes</span></div>
                                <button 
                                  onClick={() => setSelectedStaff(entry)}
                                  className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                                  title="View Impressions"
                                >
                                  <MessageSquareText className="w-5 h-5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-slate-400 py-6 text-sm">No votes yet.</div>
                      )}
                    </div>

                    <div className="p-0">
                      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Runner-ups</h4>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {rest.map((entry) => (
                          <div key={entry.id} className="flex items-center justify-between p-4 px-6 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-4">
                              <div className="text-slate-400 font-bold w-4 text-right text-sm">{entry.rank}</div>
                              <div>
                                <div className="font-semibold text-slate-800 text-sm">{entry.nickname}</div>
                                <div className="text-xs text-slate-500">{entry.department}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="font-bold text-slate-700 text-sm">{entry.votes}</div>
                              <button 
                                onClick={() => setSelectedStaff(entry)}
                                className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                              >
                                <MessageSquareText className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {rest.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">No other candidates</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "staff" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Manage Staff</h2>
                <p className="text-slate-500 mt-1">Import and edit candidate details</p>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <input 
                  type="file" 
                  accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <button 
                  onClick={() => setShowUploadGuide(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
                >
                  <UploadCloud className="w-5 h-5" />
                  Import CSV/Excel
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50">
                <div className="relative max-w-md">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search staff by name or department..."
                    className="w-full pl-12 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-800 text-sm"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-6 font-semibold">Nickname</th>
                      <th className="py-4 px-6 font-semibold hidden sm:table-cell">Full Name</th>
                      <th className="py-4 px-6 font-semibold hidden md:table-cell">Department</th>
                      <th className="py-4 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredCandidates.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3 px-6">
                          <div className="font-bold text-slate-800">{c.nickname}</div>
                          {/* Mobile fallback for full name and dept */}
                          <div className="sm:hidden text-xs text-slate-500 mt-1">{c.fullName}</div>
                          <div className="md:hidden text-xs text-indigo-500 font-medium mt-0.5">{c.department}</div>
                        </td>
                        <td className="py-3 px-6 text-sm text-slate-600 hidden sm:table-cell">{c.fullName}</td>
                        <td className="py-3 px-6 text-sm text-slate-600 hidden md:table-cell">
                          <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg font-medium">{c.department}</span>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <button 
                            onClick={() => setEditingCandidate(c)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors inline-flex"
                            title="Edit Staff"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCandidates.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400">
                          No staff found matching "{searchQuery}"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === "categories" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Voting Categories</h2>
                <p className="text-slate-500 mt-1">Manage categories and their display order</p>
              </div>
              <button
                onClick={() => {
                  setEditingCategory({ id: "", order: categories.length + 1, title: "", description: "", color: tailwindGradients[0] });
                  setIsNewCategory(true);
                }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-sm hover:bg-indigo-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">Add Category</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {categories.map(cat => (
                <div key={cat.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 relative group flex flex-col">
                  <div className="flex items-start justify-between mb-4 pr-16">
                    <h3 className={`font-bold text-xl bg-gradient-to-r ${cat.color} bg-clip-text text-transparent`}>
                      <span className="text-slate-300 font-medium mr-2">#{cat.order}</span>
                      {cat.title}
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600 font-medium leading-relaxed mb-4 flex-1">{cat.description}</p>
                  
                  <div className="absolute top-6 right-6 flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => { setEditingCategory(cat); setIsNewCategory(false); }}
                      className="p-2.5 bg-white text-slate-500 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 shadow-sm rounded-xl transition-all"
                      title="Edit Category"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2.5 bg-white text-slate-500 border border-slate-200 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 shadow-sm rounded-xl transition-all"
                      title="Delete Category"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {categories.length === 0 && (
                <div className="col-span-full p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-300">
                  No categories found. Click "Add Category" to create one.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "voters" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Voter Records</h2>
              <p className="text-slate-500 mt-1">Detailed history of all submitted ballots</p>
            </div>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                      <th className="py-4 px-6 font-semibold">Voter Name</th>
                      <th className="py-4 px-6 font-semibold">Time Submitted</th>
                      <th className="py-4 px-6 font-semibold">Categories Voted</th>
                      <th className="py-4 px-6 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {votesData.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors group">
                        <td className="py-3 px-6">
                          <div className="font-bold text-slate-800">{v.voterName || "Unknown"}</div>
                        </td>
                        <td className="py-3 px-6 text-sm text-slate-600">
                          {v.votedAt ? v.votedAt.toDate().toLocaleString('en-GB') : "N/A"}
                        </td>
                        <td className="py-3 px-6 text-sm text-slate-600">
                          <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg font-bold">{v.selections.length}</span>
                        </td>
                        <td className="py-3 px-6 text-right">
                          <button 
                            onClick={() => setInspectingVote(v)}
                            className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          >
                            View Ballot
                          </button>
                        </td>
                      </tr>
                    ))}
                    {votesData.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400">
                          No votes have been recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Modals --- */}
      <AnimatePresence>
        {/* Voting System Settings Modal */}
        {isVotingSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsVotingSettingsOpen(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">Voting Settings</h3>
                    <p className="text-xs font-semibold text-slate-500">Configure when users can vote</p>
                  </div>
                </div>
                <button onClick={() => setIsVotingSettingsOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveVotingConfig} className="p-6 flex flex-col gap-6">
                
                {/* Mode Selector */}
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-3">Operating Mode</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      type="button"
                      onClick={() => setEditingConfig({ ...editingConfig, mode: "manual" })}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${editingConfig.mode === "manual" ? "border-indigo-600 bg-indigo-50/50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                    >
                      <Power className="w-6 h-6" />
                      <span className="font-bold text-sm">Manual Switch</span>
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditingConfig({ ...editingConfig, mode: "scheduled", closeAt: editingConfig.closeAt || new Date().toISOString().slice(0, 16) })}
                      className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${editingConfig.mode === "scheduled" ? "border-indigo-600 bg-indigo-50/50 text-indigo-700" : "border-slate-200 text-slate-500 hover:border-slate-300"}`}
                    >
                      <Clock className="w-6 h-6" />
                      <span className="font-bold text-sm">Scheduled</span>
                    </button>
                  </div>
                </div>

                {/* Manual Controls */}
                {editingConfig.mode === "manual" && (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm">System Access</h4>
                      <p className="text-xs text-slate-500 mt-1">Force the system open or closed</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setEditingConfig({ ...editingConfig, isManualOpen: !editingConfig.isManualOpen })}
                      className={`w-14 h-7 rounded-full relative transition-colors ${editingConfig.isManualOpen ? 'bg-emerald-500' : 'bg-slate-300'}`}
                    >
                      <div className={`w-6 h-6 bg-white rounded-full absolute top-0.5 shadow-md transition-transform ${editingConfig.isManualOpen ? 'translate-x-7.5' : 'translate-x-0.5'}`} style={{ transform: editingConfig.isManualOpen ? 'translateX(28px)' : 'translateX(2px)' }} />
                    </button>
                  </div>
                )}

                {/* Scheduled Controls */}
                {editingConfig.mode === "scheduled" && (
                  <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                    <label className="block text-sm font-bold text-slate-700 mb-2">Auto-Close Date & Time</label>
                    <p className="text-xs text-slate-500 mb-4">The system will automatically lock voters out at this exact time.</p>
                    <input 
                      type="datetime-local" 
                      required
                      value={editingConfig.closeAt ? new Date(editingConfig.closeAt).toISOString().slice(0, 16) : ""}
                      onChange={(e) => setEditingConfig({ ...editingConfig, closeAt: new Date(e.target.value).toISOString() })}
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700" 
                    />
                  </div>
                )}

                <div className="pt-2">
                  <button type="submit" disabled={savingConfig} className="w-full py-3.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex justify-center items-center gap-2">
                    {savingConfig ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Check className="w-5 h-5" /> Save Configuration</>}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
        {/* Edit Staff Modal */}
        {editingCandidate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingCandidate(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">Edit Staff Details</h3>
                <button onClick={() => setEditingCandidate(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveCandidate} className="p-6 flex flex-col gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nickname</label>
                  <input type="text" required value={editingCandidate.nickname} onChange={e => setEditingCandidate({...editingCandidate, nickname: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
                  <input type="text" required value={editingCandidate.fullName} onChange={e => setEditingCandidate({...editingCandidate, fullName: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Department</label>
                  <input type="text" required value={editingCandidate.department} onChange={e => setEditingCandidate({...editingCandidate, department: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={savingCandidate} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex justify-center items-center">
                    {savingCandidate ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Edit Category Modal */}
        {editingCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setEditingCategory(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-lg font-bold text-slate-800">{isNewCategory ? "Create Category" : "Edit Category"}</h3>
                <button onClick={() => setEditingCategory(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSaveCategory} className="p-6 flex flex-col gap-5">
                <div className="flex gap-4">
                  <div className="w-24 shrink-0">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Order</label>
                    <input type="number" required value={editingCategory.order ?? ''} onChange={e => setEditingCategory({...editingCategory, order: parseInt(e.target.value) || 0})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title</label>
                    <input type="text" required value={editingCategory.title} onChange={e => setEditingCategory({...editingCategory, title: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                  <textarea rows={3} required value={editingCategory.description} onChange={e => setEditingCategory({...editingCategory, description: e.target.value})} className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Color Theme</label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {tailwindGradients.map((grad, i) => (
                      <div 
                        key={i} 
                        onClick={() => setEditingCategory({...editingCategory, color: grad})}
                        className={`h-8 rounded-lg cursor-pointer bg-gradient-to-r ${grad} transition-all ${editingCategory.color === grad ? 'ring-2 ring-slate-800 ring-offset-2 scale-110' : 'hover:scale-105'}`}
                      />
                    ))}
                  </div>
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={savingCategory} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex justify-center items-center">
                    {savingCategory ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Category"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* Feedback Explorer Modal */}
        {selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedStaff(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{selectedStaff.nickname}'s Feedback</h3>
                  <p className="text-sm text-slate-500 mt-1">{selectedStaff.reasons.length} impressions recorded</p>
                </div>
                <button onClick={() => setSelectedStaff(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 bg-slate-50/30">
                {selectedStaff.reasons.map((r, i) => (
                  <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                    <p className="text-slate-700 leading-relaxed italic mb-3">"{r.reason}"</p>
                    <div className="text-xs font-semibold text-indigo-500 bg-indigo-50 inline-flex px-2.5 py-1 rounded-lg">
                      จาก: {r.voterName}
                    </div>
                  </div>
                ))}
                {selectedStaff.reasons.length === 0 && (
                  <div className="text-center text-slate-400 py-12 flex flex-col items-center">
                    <MessageSquareText className="w-12 h-12 mb-3 text-slate-200" />
                    No written impressions for this candidate.
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Upload Confirm Modal */}
        {uploadPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => !uploadingStaff && setUploadPreview(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-8 text-center">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-5">
                <FileSpreadsheet className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Confirm Staff Import</h3>
              <p className="text-slate-500 mb-6 leading-relaxed">
                You are about to upload <strong className="text-slate-800">{uploadPreview.length}</strong> staff members. 
                <br/><br/>
                <span className="text-rose-600 font-semibold text-sm bg-rose-50 px-3 py-2 rounded-lg inline-block border border-rose-100">
                  ⚠️ Warning: This will overwrite all existing candidates.
                </span>
              </p>
              <div className="flex gap-3">
                <button disabled={uploadingStaff} onClick={() => setUploadPreview(null)} className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                <button disabled={uploadingStaff} onClick={handleConfirmUpload} className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center">
                  {uploadingStaff ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Replace"}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Inspect Vote Modal */}
        {inspectingVote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setInspectingVote(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50 shrink-0">
                <div>
                  <h3 className="text-xl font-bold text-slate-800">{inspectingVote.voterName || "Unknown"}'s Ballot</h3>
                  <p className="text-sm text-slate-500 mt-1">Submitted at: {inspectingVote.votedAt ? inspectingVote.votedAt.toDate().toLocaleString('en-GB') : "N/A"}</p>
                </div>
                <button onClick={() => setInspectingVote(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 bg-slate-50/30">
                {inspectingVote.selections.map((sel, i) => {
                  const cat = categories.find(c => c.id === sel.categoryId);
                  return (
                    <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{cat?.title || sel.categoryId}</h4>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 font-bold rounded-full flex items-center justify-center shrink-0">
                          {sel.candidateNickname.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{sel.candidateNickname}</div>
                          <div className="text-xs text-slate-500">{sel.department}</div>
                        </div>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm text-slate-700 italic">
                        "{sel.reason}"
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}

        {/* Upload Guide Modal */}
        {showUploadGuide && !uploadPreview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowUploadGuide(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-8">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">Import Staff Data</h3>
                <button onClick={() => setShowUploadGuide(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"><X className="w-5 h-5" /></button>
              </div>
              <p className="text-slate-600 mb-5 text-sm leading-relaxed">
                Please prepare your Excel (<code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-medium border border-slate-200">.xlsx</code>) or CSV file with the following column headers exactly as shown below:
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden mb-6 text-sm shadow-inner">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-white border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4 font-bold text-slate-700">Nickname</th>
                      <th className="py-3 px-4 font-bold text-slate-700">FullName</th>
                      <th className="py-3 px-4 font-bold text-slate-700">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-500">
                    <tr><td className="py-2.5 px-4">สมชาย</td><td className="py-2.5 px-4">นพ.สมชาย ใจดี</td><td className="py-2.5 px-4">CVT</td></tr>
                    <tr><td className="py-2.5 px-4">สมหญิง</td><td className="py-2.5 px-4">พญ.สมหญิง ใจงาม</td><td className="py-2.5 px-4">Neuro</td></tr>
                  </tbody>
                </table>
              </div>
              <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2 shadow-sm">
                <UploadCloud className="w-5 h-5" />
                Select File
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
