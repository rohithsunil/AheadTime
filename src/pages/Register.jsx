import { db } from '@/api/db';

import React, { useState } from "react";
import { Link } from "react-router-dom";

import { UserPlus, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await db.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await db.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        db.auth.setToken(result.access_token);
      }
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await db.auth.resendOtp(email);
      toast({
        title: "Code sent",
        description: "Check your email for the new code.",
      });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    db.auth.loginWithProvider("google", "/");
  };

  if (showOtp) {
    return (
      <AuthLayout
        icon={Mail}
        title="Check your email"
        subtitle={`We sent a verification link to ${email}`}
      >
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 text-sm">
            {error}
          </div>
        )}

        <div className="p-4 rounded-2xl glass-frost mb-5 text-center space-y-2">
          <p className="text-sm font-medium text-foreground">
            👉 Click the link in your email to verify your account.
          </p>
          <p className="text-xs text-muted-foreground">
            Once clicked, you'll be signed in automatically.
          </p>
        </div>

        <div className="space-y-3">
          <div className="text-center text-xs text-muted-foreground font-medium uppercase tracking-wider my-2">
            Or enter 6-digit code if provided
          </div>

          <div className="flex justify-center mb-4">
            <InputOTP
              maxLength={6}
              value={otpCode}
              onChange={setOtpCode}
              autoComplete="one-time-code"
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>

          {otpCode.length === 6 && (
            <button
              className="w-full h-12 accent-gradient text-white rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] transition-transform"
              onClick={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Verifying code...
                </>
              ) : (
                "Verify Code"
              )}
            </button>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs">
          <button
            onClick={() => setShowOtp(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Sign Up
          </button>

          <button
            onClick={handleResend}
            className="text-[#FF8C42] dark:text-orange-400 font-medium hover:underline"
          >
            Resend email
          </button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="text-[#FF8C42] dark:text-orange-400 font-medium hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <button
        type="button"
        disabled
        title="Google registration is currently disabled"
        className="w-full h-12 glass-frost rounded-2xl text-sm font-medium flex items-center justify-center gap-2 opacity-50 cursor-not-allowed mb-4"
      >
        <GoogleIcon className="w-5 h-5 opacity-60" />
        <span className="text-muted-foreground">Continue with Google (Soon)</span>
      </button>

      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-transparent px-3 text-muted-foreground">or email</span>
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
          <label className="block text-muted-foreground text-xs font-medium mb-1.5 px-1">Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 glass-frost rounded-2xl pl-11 pr-11 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-muted-foreground text-xs font-medium mb-1.5 px-1">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-12 glass-frost rounded-2xl pl-11 pr-11 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
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
              Creating account...
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  );
}