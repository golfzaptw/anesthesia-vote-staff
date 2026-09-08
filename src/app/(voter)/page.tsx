"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVoting } from "@/context/VotingContext";
import { motion } from "framer-motion";
import { UserCircle, ArrowRight } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const { state, setVoterName } = useVoting();
  const [name, setName] = useState("");
  const [mounted, setMounted] = useState(false);
  const [timeLeftStr, setTimeLeftStr] = useState<string | null>(null);
  const [isTimeExpired, setIsTimeExpired] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (state.voterName) {
      setName(state.voterName);
    }
  }, [state.voterName]);

  useEffect(() => {
    if (state.hasVoted) {
      router.replace("/success");
    }
  }, [state.hasVoted, router]);

  useEffect(() => {
    if (state.votingConfig.mode === "scheduled" && state.votingConfig.closeAt) {
      const targetTime = new Date(state.votingConfig.closeAt).getTime();
      
      const updateTimer = () => {
        // Force evaluation in current time, but the targetTime already has +07:00 offset
        const now = new Date().getTime();
        const diff = targetTime - now;
        
        if (diff <= 0) {
          setIsTimeExpired(true);
          setTimeLeftStr(null);
        } else {
          setIsTimeExpired(false);
          const d = Math.floor(diff / (1000 * 60 * 60 * 24));
          const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const s = Math.floor((diff % (1000 * 60)) / 1000);
          
          setTimeLeftStr(`${d.toString().padStart(2, '0')}d ${h.toString().padStart(2, '0')}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`);
        }
      };
      
      updateTimer();
      const interval = setInterval(updateTimer, 1000);
      return () => clearInterval(interval);
    } else {
      setTimeLeftStr(null);
      setIsTimeExpired(false);
    }
  }, [state.votingConfig]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setVoterName(name.trim());
      router.push("/vote");
    }
  };

  if (!mounted || state.loadingStatus) return null;

  // We check global state OR our local timer expiration
  if (!state.isVotingOpen || isTimeExpired) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm z-10 text-center"
        >
          <div className="bg-white rounded-3xl p-8 shadow-xl shadow-rose-100/50 border border-slate-100 flex flex-col items-center">
            <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6">
              <UserCircle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">ระบบปิดรับโหวตแล้ว</h1>
            <p className="text-slate-500 text-sm">ขออภัย ขณะนี้หมดเวลาสำหรับการโหวตสตาฟในดวงใจแล้ว</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0 animate-pulse"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-64 h-64 bg-rose-200 rounded-full mix-blend-multiply filter blur-3xl opacity-50 z-0 animate-pulse" style={{ animationDelay: '2s' }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm z-10"
      >
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-indigo-100/50 border border-slate-100 flex flex-col items-center">
          <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center mb-6">
            <UserCircle className="w-8 h-8" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 text-center tracking-tight mb-2">ยินดีต้อนรับ</h1>
          <p className="text-slate-500 text-center mb-6 text-sm">กรุณากรอกชื่อจริงก่อนเข้าสู่ระบบโหวต</p>

          {timeLeftStr && (
            <div className="w-full bg-slate-50/80 border border-slate-200 rounded-xl p-4 mb-6 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">เวลาที่เหลือ</span>
              <span className="text-2xl font-bold text-slate-700 tracking-tight">{timeLeftStr}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">ชื่อ-นามสกุลนักเรียน</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น นร.ไข่ตุ๋น มาแล้ว"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800"
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim()}
              className="mt-4 w-full py-3.5 rounded-xl font-bold text-white bg-indigo-600 shadow-lg shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-50 disabled:active:scale-100"
            >
              เริ่มการโหวต
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
