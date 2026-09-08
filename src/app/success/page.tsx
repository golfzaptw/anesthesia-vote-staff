"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Download, Calendar } from "lucide-react";
import * as htmlToImage from "html-to-image";
import { motion } from "framer-motion";
import { useVoting } from "@/context/VotingContext";

export default function SuccessPage() {
  const [refHash, setRefHash] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState<string>("");
  const [showReceipt, setShowReceipt] = useState<boolean>(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { state } = useVoting();

  useEffect(() => {
    // Only allow if they have voted
    if (!state.hasVoted) {
      router.replace("/vote");
      return;
    }

    const hash = sessionStorage.getItem("voteReference");
    if (hash) {
      setRefHash(hash);
      setShowReceipt(true);
      const now = new Date();
      setDateStr(now.toLocaleDateString("en-GB", {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      }));
    } else {
      setShowReceipt(false);
    }
  }, [state.hasVoted, router]);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await htmlToImage.toPng(cardRef.current, { quality: 1, pixelRatio: 3 });
      const fileName = `Vote-Proof-${refHash}.png`;

      // แปลง Data URL เป็น Blob
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      // เช็คว่า Browser รองรับ Web Share API สำหรับไฟล์รูปหรือไม่ (ส่วนใหญ่บนมือถือจะรองรับ)
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'หลักฐานการโหวต',
          });
          return; // หากแชร์สำเร็จหรือกดบันทึกลงเครื่องสำเร็จจบการทำงานเลย
        } catch (shareError) {
          console.error("Share failed", shareError);
          // ถ้ายกเลิกการแชร์ (AbortError) ไม่ต้อง fallback ไปโหลดไฟล์
          if ((shareError as Error).name === "AbortError") {
            return;
          }
        }
      }

      // สำหรับ Desktop หรือ Browser ที่ไม่รองรับ Share API
      const link = document.createElement('a');
      link.download = fileName;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to generate image", err);
      alert("บันทึกรูปภาพล้มเหลว กรุณาแคปหน้าจอแทน");
    }
  };

  if (!state.hasVoted) return null;

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
        <p className="text-slate-500 text-center mb-10 leading-relaxed">
          ขอบคุณที่ร่วมโหวต การโหวตของคุณถูกบันทึกเป็นความลับแล้ว
        </p>

        {showReceipt ? (
          <>
            {/* Digital Proof Card */}
            <div className="w-full relative group">
              <div 
                ref={cardRef} 
                className="w-full bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center relative overflow-hidden"
                style={{ background: "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)" }}
              >
                {/* Decorative pattern */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full opacity-50"></div>
                
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-6">
                  หลักฐานการโหวต
                </div>

                <div className="text-sm text-slate-500 mb-1">รหัสอ้างอิง</div>
                <div className="text-2xl font-mono font-bold text-slate-800 tracking-wider mb-6 bg-slate-100 px-4 py-2 rounded-xl">
                  {refHash ? refHash.replace(/(VOTE-..).*(.)/, "$1***$2") : "VOTE-XXXXXX"}
                </div>

                <div className="w-full border-t border-dashed border-slate-200 my-2"></div>

                <div className="flex items-center gap-2 text-sm text-slate-500 mt-4 w-full justify-center">
                  <Calendar className="w-4 h-4" />
                  {dateStr}
                </div>
              </div>
            </div>

            <button
              onClick={handleDownload}
              className="mt-8 flex items-center justify-center gap-2 w-full py-4 rounded-full font-bold text-white bg-slate-800 shadow-xl shadow-slate-200 hover:bg-slate-900 active:scale-95 transition-all"
            >
              <Download className="w-5 h-5" />
              บันทึกภาพหลักฐาน
            </button>
          </>
        ) : (
          <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full opacity-50"></div>
            <p className="text-slate-600 font-medium relative z-10">
              คุณได้ทำการโหวตไปแล้ว สามารถปิดหน้านี้ได้เลย
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
