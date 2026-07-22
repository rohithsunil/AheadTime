import { db } from '@/api/db';

import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Users, X, Trash2, Pencil, Check } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDaysLeft, getStatus, STATUS_CONFIG } from "@/lib/renewalUtils";
import { PROFILE_COLORS } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import Layout from "@/components/Layout";
import EmptyState from "@/components/EmptyState";

const RELATIONSHIPS = ["Self", "Spouse", "Child", "Parent", "Sibling", "Other"];
const COLOR_KEYS = ["rose", "amber", "teal", "violet", "blue", "orange", "pink", "slate"];

export default function FamilyProfiles() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editProfile, setEditProfile] = useState(null);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["profiles", "all"],
    queryFn: () => db.entities.FamilyProfile.list(),
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["documents", "all"],
    queryFn: () => db.entities.Document.list(),
  });

  const profileStats = useMemo(() => {
    const stats = {};
    for (const p of profiles) {
      const docs = documents.filter((d) => d.profile_id === p.id && !d.archived);
      stats[p.id] = {
        total: docs.length,
        urgent: docs.filter((d) => { const dl = getDaysLeft(d.expiry_date); return dl !== null && dl <= 30; }).length,
        overdue: docs.filter((d) => getDaysLeft(d.expiry_date) < 0).length,
      };
    }
    return stats;
  }, [profiles, documents]);

  const handleDelete = async (id) => {
    const prevProfiles = queryClient.getQueryData(["profiles", "all"]);
    queryClient.setQueryData(["profiles", "all"], (old) => (old || []).filter((p) => p.id !== id));
    try {
      // Unassign documents from this profile
      const docs = documents.filter((d) => d.profile_id === id);
      for (const d of docs) {
        await db.entities.Document.update(d.id, { profile_id: null, profile_name: null });
      }
      await db.entities.FamilyProfile.delete(id);
      toast({ title: "Profile deleted", variant: "destructive" });
    } catch (e) {
      queryClient.setQueryData(["profiles", "all"], prevProfiles);
      toast({ title: "Failed to delete profile", variant: "destructive" });
    }
    queryClient.invalidateQueries({ queryKey: ["profiles"] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  return (
    <Layout>
      <div className="min-h-screen pb-28 safe-top animate-route-in">
        <div className="px-5 lg:px-10 pt-12 pb-2">
          <div className="max-w-3xl mx-auto w-full flex items-center justify-between">
            <div>
              <h1 className="text-foreground text-3xl lg:text-4xl font-display">Family Profiles</h1>
              <p className="text-muted-foreground text-sm mt-1">Organize documents by person</p>
            </div>
            <button
              onClick={() => setAddOpen(true)}
              className="w-10 h-10 rounded-full glass-panel flex items-center justify-center active:scale-95 transition-transform"
            >
              <Plus className="w-5 h-5 text-foreground" />
            </button>
          </div>
        </div>

        <div className="px-5 lg:px-10 max-w-3xl mx-auto w-full mt-4">
          {isLoading ? (
            <div className="space-y-2.5">
              {[1, 2].map((i) => <div key={i} className="glass-frost rounded-2xl h-20 animate-pulse" />)}
            </div>
          ) : profiles.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No profiles yet"
              subtitle="Create profiles for family members to organize their documents separately."
              action={() => setAddOpen(true)}
              actionLabel="Add Profile"
            />
          ) : (
            <div className="space-y-2.5">
              {profiles.map((p) => {
                const color = PROFILE_COLORS[p.color] || PROFILE_COLORS.slate;
                const stats = profileStats[p.id] || { total: 0, urgent: 0, overdue: 0 };
                return (
                  <div key={p.id} className="glass-frost rounded-2xl p-4 flex items-center gap-3">
                    <div className={cn("w-11 h-11 rounded-full flex items-center justify-center shrink-0", color.bg)}>
                      <span className="text-white font-semibold text-sm">
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/documents?profile=${p.id}`)}
                      className="flex-1 text-left min-w-0"
                    >
                      <p className="text-foreground font-semibold text-sm">{p.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-muted-foreground">{p.relationship}</span>
                        <span className="text-xs text-muted-foreground">â€¢ {stats.total} doc{stats.total !== 1 ? "s" : ""}</span>
                        {stats.urgent > 0 && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400">
                            {stats.urgent} urgent
                          </span>
                        )}
                        {stats.overdue > 0 && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                            {stats.overdue} overdue
                          </span>
                        )}
                      </div>
                    </button>
                    <button onClick={() => setEditProfile(p)} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center shrink-0 transition-colors">
                      <Pencil className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="w-8 h-8 rounded-full hover:bg-foreground/5 flex items-center justify-center shrink-0 transition-colors">
                      <Trash2 className="w-4 h-4 text-rose-400" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {(addOpen || editProfile) && (
        <ProfileSheet
          profile={editProfile}
          onClose={() => { setAddOpen(false); setEditProfile(null); }}
          onSave={async (data) => {
            try {
              if (editProfile) {
                await db.entities.FamilyProfile.update(editProfile.id, data);
                toast({ title: "Profile updated", variant: "success" });
              } else {
                await db.entities.FamilyProfile.create(data);
                toast({ title: "Profile created", variant: "success" });
              }
              queryClient.invalidateQueries({ queryKey: ["profiles"] });
              setAddOpen(false);
              setEditProfile(null);
            } catch (e) {
              toast({ title: "Failed to save profile", variant: "destructive" });
            }
          }}
        />
      )}
    </Layout>
  );
}

function ProfileSheet({ profile, onClose, onSave }) {
  const [name, setName] = useState(profile?.name || "");
  const [relationship, setRelationship] = useState(profile?.relationship || "Self");
  const [color, setColor] = useState(profile?.color || "slate");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({ name: name.trim(), relationship, color });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end animate-fade-in" onClick={onClose}>
      <div className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-3xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-foreground font-display text-2xl">{profile ? "Edit Profile" : "New Profile"}</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full glass-frost flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <label className="block text-muted-foreground text-xs font-medium mb-1.5 px-1">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Mom, Dad, Emma"
          className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors mb-4"
        />

        <label className="block text-muted-foreground text-xs font-medium mb-1.5 px-1">Relationship</label>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4 pb-1">
          {RELATIONSHIPS.map((r) => (
            <button
              key={r}
              onClick={() => setRelationship(r)}
              className={cn(
                "shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-colors",
                relationship === r ? "accent-gradient text-white" : "glass-frost text-muted-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>

        <label className="block text-muted-foreground text-xs font-medium mb-1.5 px-1">Color</label>
        <div className="flex gap-2 mb-6">
          {COLOR_KEYS.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center transition-transform",
                PROFILE_COLORS[c].bg,
                color === c && "ring-2 ring-offset-2 ring-offset-transparent ring-foreground/30 scale-110"
              )}
            >
              {color === c && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </button>
          ))}
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full bg-[#1A1A1A] text-white rounded-full py-3.5 font-semibold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              {profile ? "Save Changes" : "Create Profile"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}