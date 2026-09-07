"use client";

import React, { useEffect } from "react";
import { useVoting } from "@/context/VotingContext";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function ImpressionsPage() {
  const { state, updateImpression } = useVoting();
  const router = useRouter();

  useEffect(() => {
    if (state.hasVoted) {
      router.replace("/success");
    } else if (state.selectedCandidates.length !== 3) {
      router.replace("/vote");
    }
  }, [state.selectedCandidates.length, state.hasVoted, router]);

  if (state.selectedCandidates.length !== 3) return null;

  const allFilled = state.selectedCandidates.every(
    (c) => state.impressions[c.id] && state.impressions[c.id].trim().length > 0
  );

  return (
    <div className="pb-36 pt-8 px-4 flex flex-col h-full relative">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-slate-200 rounded-full transition-colors text-slate-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Your Impressions</h1>
          <p className="text-sm text-slate-500 mt-1">Why did you vote for them?</p>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        {state.selectedCandidates.map((c, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={c.id} 
            className="glass-card p-5"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-inner bg-gradient-to-br ${c.avatarGradient}`}>
                {c.nickname.match(/[ก-ฮ]/)?.[0] || c.nickname.charAt(0)}
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 leading-tight">{c.nickname}</h3>
                <p className="text-xs text-slate-500">{c.department}</p>
              </div>
            </div>
            <textarea
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all resize-none"
              rows={3}
              placeholder={`ความประทับใจที่มีต่อ ${c.nickname}...`}
              value={state.impressions[c.id] || ""}
              onChange={(e) => updateImpression(c.id, e.target.value)}
            ></textarea>
          </motion.div>
        ))}
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md p-4 pb-8 glass rounded-t-3xl z-50 flex justify-between items-center">
        <div className="text-sm text-slate-500">
          {allFilled ? (
            <span className="text-emerald-600 font-medium flex items-center gap-1">Ready to review</span>
          ) : (
            <span>Please fill all reasons</span>
          )}
        </div>
        <button
          onClick={() => router.push("/confirm")}
          disabled={!allFilled}
          className={`px-8 py-3 rounded-full font-semibold transition-all ${
            allFilled 
              ? "bg-indigo-600 text-white shadow-lg shadow-indigo-300 hover:bg-indigo-700 hover:scale-105 active:scale-95" 
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
        >
          Review Vote
        </button>
      </div>
    </div>
  );
}
