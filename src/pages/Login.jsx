import { db } from '@/api/db';

import React, { useState } from "react";
import { Link } from "react-router-dom";

import { Mail, Lock, Loader2, ArrowRight } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { cn } from "@/lib/utils";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await db.auth.loginViaEmailPassword(email, password);
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    db.auth.loginWithProvider("google", "/");
  };

  return (
    <AuthLayout
      icon={Mail}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="text-[#FF8C42] dark:text-orange-400 font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      {/* Google */}
      <button
        onClick={handleGoogle}
        className="w-full h-12 glass-frost rounded-2xl text-sm font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform mb-4"
      >
        <GoogleIcon className="w-5 h-5" />
        Continue with Google
      </button>

      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-muted-foreground text-xs font-medium mb-1.5 px-1">Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 glass-frost rounded-2xl pl-11 pr-4 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
              required
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5 px-1">
            <label className="text-muted-foreground text-xs font-medium">Password</label>
            <Link to="/forgot-password" className="text-xs text-[#FF8C42] dark:text-orange-400 hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type="password"
              autoComplete="current-password"
              placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 glass-frost rounded-2xl pl-11 pr-4 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
              required
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 accent-gradient text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform mt-1"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Logging in...
            </>
          ) : (
            <>
              Log in
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}