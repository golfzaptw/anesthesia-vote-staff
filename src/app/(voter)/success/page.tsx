"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useVoting } from "@/context/VotingContext";

export default function SuccessPage() {
  const router = useRouter();
  const { state } = useVoting();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only allow if they have voted
    if (!state.hasVoted) {
      router.replace("/");
    }
  }, [state.hasVoted, router]);

  if (!mounted || !state.hasVoted) return null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden">
      {/* Confetti background effect (simplified CSS circles) */}
      <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] pointer-events-none opacity-30 z-0 flex flex-wrap gap-10 blur-3xl justify-center items-center">
        <div className="w-64 h-64 bg-emerald-400 rounded-full mix-blend-multiply"></div>
        <div className="w-64 h-64 bg-indigo-400 rounded-full mix-blend-multiply"></div>
      </div>

      <motion.div 
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="z-10 flex flex-col items-center w-full max-w-sm"
      >
        <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
          <CheckCircle className="w-10 h-10" />
        </div>
        
        <h1 className="text-3xl font-bold text-slate-800 text-center tracking-tight mb-2">ส่งโหวตเรียบร้อย!</h1>
        <p className="text-slate-600 text-center mb-10 leading-relaxed font-medium">
          ขอขอบคุณ <span className="font-bold text-indigo-600">{state.voterName}</span> ที่ร่วมประเมินสตาฟในดวงใจ
        </p>

        <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full opacity-50"></div>
          <p className="text-slate-500 font-medium relative z-10 text-sm">
            ระบบได้บันทึกข้อมูลการประเมินของคุณเรียบร้อยแล้ว สามารถปิดหน้านี้ได้เลยครับ
          </p>
        </div>
      </motion.div>
    </div>
  );
}
