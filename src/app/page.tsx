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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setVoterName(name.trim());
      router.push("/vote");
    }
  };

  if (!mounted) return null;

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
          <p className="text-slate-500 text-center mb-8 text-sm">กรุณากรอกชื่อจริงก่อนเข้าสู่ระบบโหวต</p>

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
