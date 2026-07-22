import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";

export default function OnboardingGate() {
  const { user } = useAuth();
  // Check both localStorage AND user profile — more robust for new users
  // display_name is only set during onboarding completion
  const localOnboarded = localStorage.getItem("aheadtime-onboarded") === "true";
  const profileOnboarded = !!(user?.display_name);
  if (!localOnboarded && !profileOnboarded) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}