"use client";

import React, { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Lock, Loader2 } from "lucide-react";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/admin/dashboard");
    } catch (err: any) {
      console.error(err);
      setError("Invalid credentials. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 w-full">
      <div className="w-full max-w-sm glass-card p-8 flex flex-col items-center">
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mb-6 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-2">Admin Portal</h1>
        <p className="text-sm text-slate-500 mb-8 text-center">Sign in to manage votes and feedback.</p>

        <form onSubmit={handleLogin} className="w-full flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          
          {error && <p className="text-rose-500 text-sm mt-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full py-3.5 rounded-full font-bold text-white bg-slate-800 shadow-xl hover:bg-slate-900 active:scale-95 transition-all flex justify-center items-center gap-2 disabled:opacity-70 disabled:active:scale-100"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
