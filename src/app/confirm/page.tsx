"use client";

import React, { useState, useEffect } from "react";
import { useVoting } from "@/context/VotingContext";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, ShieldCheck, Trophy } from "lucide-react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { motion } from "framer-motion";

function generateHash() {
  return "VOTE-" + Math.random().toString(16).substring(2, 8).toUpperCase();
}

export default function ConfirmPage() {
  const { state, submitVote } = useVoting();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isAllCategoriesFilled = state.categories.length > 0 && state.categories.every(c => state.votes[c.id]);

  useEffect(() => {
    if (state.hasVoted) {
      router.replace("/success");
    } else if (!isAllCategoriesFilled) {
      router.replace("/vote");
    }
  }, [isAllCategoriesFilled, state.hasVoted, router]);

  if (!isAllCategoriesFilled) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    
    try {
      const voteReference = generateHash();
      // Generate a simple UUID for voter token
      const voterClientToken = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2);
      
      const selections = state.categories.map(cat => {
        const vote = state.votes[cat.id];
        return {
          categoryId: cat.id,
          categoryName: cat.title,
          candidateId: vote.candidate.id,
          candidateNickname: vote.candidate.nickname,
          department: vote.candidate.department,
          reason: vote.reason
        };
      });

      await addDoc(collection(db, "votes"), {
        votedAt: serverTimestamp(),
        voteReference,
        voterClientToken,
        voterName: state.voterName,
        selections
      });

      // Save ref to session to show in success page
      sessionStorage.setItem("voteReference", voteReference);
      
      // Update global context (sets localstorage and clears draft)
      submitVote();
      
      // router pushes via useEffect but we can push explicitly
      router.push("/success");
      
    } catch (err: any) {
      console.error(err);
      setError("การส่งโหวตล้มเหลว กรุณาลองใหม่อีกครั้ง");
      setSubmitting(false);
    }
  };

  return (
    <div className="pb-36 pt-8 px-4 flex flex-col h-full relative">
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={() => router.back()} 
          disabled={submitting}
          className="p-2 -ml-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600 disabled:opacity-50"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">ตรวจสอบการโหวต</h1>
          <p className="text-sm text-slate-500 mt-1">กรุณายืนยันการเลือกของคุณ</p>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {state.categories.map((cat, i) => {
          const vote = state.votes[cat.id];
          if (!vote) return null;

          return (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              key={cat.id} 
              className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-sm text-indigo-600">{cat.title}</h3>
              </div>
              
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-inner bg-gradient-to-br ${vote.candidate.avatarGradient}`}>
                  {vote.candidate.nickname.match(/[ก-ฮ]/)?.[0] || vote.candidate.nickname.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 text-lg">{vote.candidate.nickname}</h3>
                  <p className="text-xs text-slate-500">{vote.candidate.fullName} • {vote.candidate.department}</p>
                </div>
              </div>
              
              <div className="bg-slate-50 rounded-xl p-3 mt-1 text-sm text-slate-600 italic border border-slate-100">
                "{vote.reason}"
              </div>
            </motion.div>
          );
        })}
      </div>

      {error && (
        <div className="mt-6 p-4 bg-rose-50 text-rose-600 rounded-xl text-sm border border-rose-100 text-center">
          {error}
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 pb-8 glass rounded-t-3xl z-50 flex flex-col gap-3">
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          ระบบจะบันทึกข้อมูลโหวตของ: <span className="font-bold text-slate-700">{state.voterName}</span>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3.5 rounded-full font-bold text-white bg-indigo-600 shadow-lg shadow-indigo-300 hover:bg-indigo-700 active:scale-[0.98] transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:active:scale-100"
        >
          {submitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              กำลังส่ง...
            </>
          ) : (
            "ยืนยันการส่งโหวต"
          )}
        </button>
      </div>
    </div>
  );
}
