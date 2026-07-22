import { db } from '@/api/db';

import React, { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, ChevronDown, Paperclip, X, Check, Plus, Tag, ScanLine, Sparkles, Bell, Users, FileText, Repeat, Ticket } from "lucide-react";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { TEMPLATES, REMINDER_PRESETS, DEFAULT_REMINDER_DAYS, PROFILE_COLORS } from "@/lib/templates";
import { getCurrency } from "@/lib/currencyUtils";
import { getIconComponent, getColorClass, ICON_NAMES, COLOR_NAMES, COLOR_MAP } from "@/lib/categoryUtils";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import CategorySheet from "@/components/CategorySheet";
import IconPicker from "@/components/IconPicker";

const RECURRENCE_OPTIONS = ["One-time", "Monthly", "Quarterly", "Semi-annual", "Annual", "Biennial", "Custom"];

const ITEM_TYPES = [
  { key: "document", label: "Document", icon: FileText },
  { key: "subscription", label: "Subscription", icon: Repeat },
  { key: "voucher", label: "Voucher", icon: Ticket },
];

const ENTITY_MAP = {
  document: { entity: "Document", cacheKey: ["documents", "all"], singleKey: (id) => ["document", id] },
  subscription: { entity: "Subscription", cacheKey: ["subscriptions", "all"], singleKey: (id) => ["subscription", id] },
  voucher: { entity: "Voucher", cacheKey: ["vouchers", "all"], singleKey: (id) => ["voucher", id] },
};

export default function AddDocument() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get("type") || "document";
  const itemType = ITEM_TYPES.some((t) => t.key === initialType) ? initialType : "document";
  const isEdit = !!id;
  const queryClient = useQueryClient();

  const [type, setType] = useState(itemType);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Other");
  const [expiryDate, setExpiryDate] = useState("");
  const [preparationDate, setPreparationDate] = useState("");
  const [recurrence, setRecurrence] = useState("One-time");
  const [notes, setNotes] = useState("");
  const [renewalFee, setRenewalFee] = useState("");
  const [checklist, setChecklist] = useState("");
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState("");
  const [attachmentName, setAttachmentName] = useState("");
  const [reminderDays, setReminderDays] = useState(DEFAULT_REMINDER_DAYS);
  const [reminderPreset, setReminderPreset] = useState("Default (30/7/0)");
  const [customReminders, setCustomReminders] = useState("");
  const [profileId, setProfileId] = useState("");
  const [profileName, setProfileName] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [recurrenceOpen, setRecurrenceOpen] = useState(false);
  const [store, setStore] = useState("");
  const [voucherValue, setVoucherValue] = useState("");
  const [renewalUrl, setRenewalUrl] = useState("");
  const [autoPay, setAutoPay] = useState(false);
  const [customIcon, setCustomIcon] = useState("");
  const [customImageUrl, setCustomImageUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", "all"],
    queryFn: () => db.entities.FamilyProfile.list(),
  });
  const { data: categories = [], invalidate: invalidateCategories } = useCategories();

  React.useEffect(() => {
    if (isEdit) return;
    if (type === "voucher") {
      setCategory("Gift Voucher");
    } else {
      setCategory("Other");
    }
  }, [type, isEdit]);

  React.useEffect(() => {
    if (!id) return;
    const meta = ENTITY_MAP[itemType];
    db.entities[meta.entity].get(id).then((doc) => {
      setName(doc.name || "");
      setCategory(doc.category || "Other");
      setExpiryDate(doc.expiry_date || "");
      setPreparationDate(doc.preparation_date || "");
      setRecurrence(doc.recurrence_type || "One-time");
      setNotes(doc.notes || "");
      setRenewalFee(doc.renewal_fee?.toString() || "");
      setChecklist(doc.checklist || "");
      setTags(doc.tags || []);
      setAttachmentUrl(doc.attachment_url || "");
      setAttachmentName(doc.attachment_name || "");
      setReminderDays(doc.reminder_days && doc.reminder_days.length > 0 ? doc.reminder_days : DEFAULT_REMINDER_DAYS);
      setProfileId(doc.profile_id || "");
      setProfileName(doc.profile_name || "");
      setStore(doc.store || "");
      setVoucherValue(doc.value?.toString() || "");
      setRenewalUrl(doc.renewal_url || "");
      setAutoPay(doc.auto_pay || false);
      setCustomIcon(doc.custom_icon || "");
      setCustomImageUrl(doc.custom_image_url || "");
      if (itemType === "voucher") setCategory(doc.category || "Gift Voucher");
      setLoading(false);
    });
  }, [id, itemType]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setAttachmentUrl(file_url);
      setAttachmentName(file.name);
    } finally {
      setUploading(false);
    }
  };

  const handleScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const { file_url } = await db.integrations.Core.UploadFile({ file });
      setAttachmentUrl(file_url);
      setAttachmentName(file.name);
      const result = await db.integrations.Core.InvokeLLM({
        prompt: "Extract the document/subscription/bill/voucher name, expiry or renewal date (in YYYY-MM-DD format), category, store/brand (for vouchers), and monetary value (for vouchers) from this image. Valid categories: Govt ID, Subscription, Bill, Loan, Warranty, Insurance, Membership, Education, Health, Other. If a field is not visible, leave it empty.",
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            expiry_date: { type: "string" },
            category: { type: "string" },
            renewal_fee: { type: "number" },
            store: { type: "string" },
            value: { type: "number" },
          },
        },
      });
      if (result.name) setName(result.name);
      if (result.expiry_date) setExpiryDate(result.expiry_date);
      if (result.category && categories.some((c) => c.name === result.category)) setCategory(result.category);
      if (result.renewal_fee) setRenewalFee(result.renewal_fee.toString());
      if (result.store) setStore(result.store);
      if (result.value) setVoucherValue(result.value.toString());
    } catch (err) {
      // OCR failed â€” keep manual entry
    } finally {
      setScanning(false);
    }
  };

  const applyTemplate = (tpl) => {
    setName(tpl.name);
    setCategory(tpl.category);
    setRecurrence(tpl.recurrence);
    if (tpl.fee) setRenewalFee(tpl.fee.toString());
    if (tpl.checklist) setChecklist(tpl.checklist);
  };

  const applyReminderPreset = (preset) => {
    setReminderPreset(preset.label);
    setReminderDays(preset.days);
    setCustomReminders("");
  };

  const applyCustomReminders = () => {
    const days = customReminders
      .split(",")
      .map((d) => parseInt(d.trim(), 10))
      .filter((d) => !isNaN(d) && d >= 0)
      .sort((a, b) => b - a);
    if (days.length > 0) {
      setReminderDays(days);
      setReminderPreset("Custom");
    }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput("");
  };

  const handleSave = async () => {
    if (!name.trim() || !expiryDate) return;
    setSaving(true);
    const meta = ENTITY_MAP[type];
    const selectedProfile = profiles.find((p) => p.id === profileId);
    const common = {
      name: name.trim(),
      expiry_date: expiryDate,
      custom_icon: customIcon || undefined,
      custom_image_url: customImageUrl || undefined,
      preparation_date: preparationDate || undefined,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      reminder_days: reminderDays,
      profile_id: profileId || undefined,
      profile_name: selectedProfile?.name || undefined,
      attachment_url: attachmentUrl || undefined,
      attachment_name: attachmentName || undefined,
    };

    let payload;
    if (type === "voucher") {
      payload = {
        ...common,
        category,
        store: store.trim() || undefined,
        value: voucherValue ? parseFloat(voucherValue) : undefined,
        renewal_url: renewalUrl.trim() || undefined,
      };
    } else {
      payload = {
        ...common,
        category,
        recurrence_type: recurrence,
        renewal_fee: renewalFee ? parseFloat(renewalFee) : undefined,
        checklist: checklist.trim() || undefined,
        renewal_url: renewalUrl.trim() || undefined,
        ...(type === "subscription" ? { auto_pay: autoPay } : {}),
      };
    }

    const prev = queryClient.getQueryData(meta.cacheKey);
    if (isEdit) {
      queryClient.setQueryData(meta.cacheKey, (old) =>
        (old || []).map((d) => (d.id === id ? { ...d, ...payload } : d))
      );
    } else {
      const tempId = `temp-${Date.now()}`;
      queryClient.setQueryData(meta.cacheKey, (old) => [
        ...(old || []),
        { ...payload, id: tempId, created_date: new Date().toISOString(), archived: false },
      ]);
    }

    try {
      if (isEdit) {
        await db.entities[meta.entity].update(id, payload);
        toast({ title: "Changes saved", variant: "success" });
      } else {
        await db.entities[meta.entity].create(payload);
        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} added`, variant: "success" });
      }
      queryClient.invalidateQueries({ queryKey: [type === "document" ? "documents" : type === "subscription" ? "subscriptions" : "vouchers"] });
      if (isEdit) queryClient.invalidateQueries({ queryKey: meta.singleKey(id) });
      navigate(-1);
    } catch (e) {
      queryClient.setQueryData(meta.cacheKey, prev);
      setSaving(false);
      toast({ title: "Failed to save", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-border border-t-[#FF8C42] rounded-full animate-spin" />
      </div>
    );
  }

  const isVoucher = type === "voucher";

  return (
    <div className="min-h-screen pb-12 safe-top animate-route-in">
      <div className="max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="px-5 lg:px-8 pt-12 pb-6">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full glass-panel flex items-center justify-center active:scale-95 transition-transform shrink-0">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-foreground text-2xl lg:text-3xl font-display">{isEdit ? "Edit Item" : "Add Item"}</h1>
            <button
              onClick={handleSave}
              disabled={!name.trim() || !expiryDate || saving}
              className="ml-auto w-10 h-10 rounded-full accent-gradient flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform shrink-0 shadow-md shadow-orange-500/20"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-5 h-5 text-white" strokeWidth={2.5} />
              )}
            </button>
          </div>
          <p className="text-muted-foreground text-sm">{isEdit ? "Update the details below" : "Capture a renewal, subscription, or voucher"}</p>
        </div>

        {/* Form */}
        <div className="px-5 lg:px-8 space-y-3">
          {/* Type selector */}
          {!isEdit && (
            <div>
              <p className="text-muted-foreground text-xs font-medium mb-1.5 px-1">Type</p>
              <div className="grid grid-cols-3 gap-2">
                {ITEM_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => setType(t.key)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all active:scale-95",
                        type === t.key ? "accent-gradient text-white" : "glass-frost text-muted-foreground"
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-xs font-medium">{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* OCR Scan */}
          {!isEdit && (
            <div className="glass-frost rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl accent-gradient flex items-center justify-center shrink-0">
                <ScanLine className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-foreground font-semibold text-sm">Scan with OCR</p>
                <p className="text-muted-foreground text-xs">Upload a photo â€” we'll auto-fill the details</p>
              </div>
              <label className="shrink-0">
                <input type="file" accept="image/*" className="hidden" onChange={handleScan} />
                <span className={cn("px-4 py-2 rounded-full text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95", scanning ? "accent-gradient opacity-50" : "accent-gradient")}>
                  {scanning ? (
                    <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Scanning...</>
                  ) : (
                    <><Sparkles className="w-3.5 h-3.5" /> Scan</>
                  )}
                </span>
              </label>
            </div>
          )}

          {/* Templates */}
          {!isEdit && !isVoucher && (
            <div>
              <p className="text-muted-foreground text-xs font-medium mb-1.5 px-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Quick Templates
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 lg:-mx-8 px-5 lg:px-8 pb-1">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.name}
                    onClick={() => applyTemplate(tpl)}
                    className={cn(
                      "shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-colors border",
                      name === tpl.name ? "accent-gradient text-white border-transparent" : "glass-frost text-foreground border-transparent"
                    )}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <FormField label={isVoucher ? "Voucher Name" : "Document Name"} required>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isVoucher ? "e.g. Amazon Gift Card" : "e.g. Passport, Netflix, Car Insurance"}
              className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category">
              <button onClick={() => setCategoryOpen(true)} className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground flex items-center justify-between border border-transparent">
                <span>{category}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </FormField>
            {isVoucher ? (
              <FormField label="Store / Brand">
                <input
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  placeholder="e.g. Amazon, Apple"
                  className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
                />
              </FormField>
            ) : (
              <FormField label="Family Profile">
                <button onClick={() => setProfileOpen(true)} className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground flex items-center justify-between border border-transparent">
                  <span className="truncate">{profileName || "None"}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </FormField>
            )}
          </div>

          {isVoucher && (
            <FormField label="Family Profile">
              <button onClick={() => setProfileOpen(true)} className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground flex items-center justify-between border border-transparent">
                <span className="truncate">{profileName || "None"}</span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
            </FormField>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FormField label={isVoucher ? "Expiry Date" : "Expiry Date"} required>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors box-border"
              />
            </FormField>
            {isVoucher ? (
              <FormField label={`Value (${getCurrency().symbol})`}>
                <input
                  type="number"
                  value={voucherValue}
                  onChange={(e) => setVoucherValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
                />
              </FormField>
            ) : (
              <FormField label="Recurrence">
                <button
                  onClick={() => setRecurrenceOpen(true)}
                  className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground flex items-center justify-between border border-transparent"
                >
                  <span>{recurrence}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </FormField>
            )}
          </div>

          {/* Tags */}
          <FormField label="Tags">
            <div className="glass-frost rounded-2xl px-4 py-2.5 flex flex-wrap items-center gap-2 border border-transparent">
              {tags.map((t) => (
                <span key={t} className="flex items-center gap-1 bg-white/60 dark:bg-white/5 border border-white/40 dark:border-white/10 text-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                  {t}
                  <button onClick={() => setTags(tags.filter((x) => x !== t))}>
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </span>
              ))}
              <div className="flex items-center gap-1 flex-1 min-w-[100px]">
                <Tag className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                  onBlur={addTag}
                  placeholder={tags.length === 0 ? "Add tags..." : ""}
                  className="flex-1 bg-transparent outline-none text-sm text-foreground"
                />
                {tagInput.trim() && (
                  <button onClick={addTag}><Plus className="w-4 h-4 text-[#FF8C42]" /></button>
                )}
              </div>
            </div>
          </FormField>

          {/* Attachment */}
          <FormField label="Attachment">
            {attachmentUrl ? (
              <div className="glass-frost rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
                  <Paperclip className="w-4 h-4 text-[#FF8C42]" />
                </div>
                <span className="flex-1 text-sm text-foreground truncate">{attachmentName}</span>
                <button onClick={() => { setAttachmentUrl(""); setAttachmentName(""); }}>
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <label className="w-full glass-frost rounded-2xl px-4 py-3 flex items-center gap-3 border border-dashed border-border cursor-pointer">
                {uploading ? (
                  <div className="w-4 h-4 border-2 border-border border-t-[#FF8C42] rounded-full animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm text-muted-foreground">{uploading ? "Uploading..." : "Add image or PDF"}</span>
                <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileUpload} />
              </label>
            )}
          </FormField>

          {/* Advanced */}
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="flex items-center gap-1.5 text-[#FF8C42] dark:text-orange-400 text-sm font-medium py-1">
            <ChevronDown className={cn("w-4 h-4 transition-transform", showAdvanced && "rotate-180")} />
            More details
          </button>

          {showAdvanced && (
            <div className="space-y-3 animate-fade-in">
              {/* Custom Icon */}
              <IconPicker
                customIcon={customIcon}
                customImageUrl={customImageUrl}
                onChange={({ custom_icon, custom_image_url }) => {
                  setCustomIcon(custom_icon);
                  setCustomImageUrl(custom_image_url);
                }}
              />

              {/* Custom Reminders */}
              <FormField label="Reminder Schedule">
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 lg:-mx-8 px-5 lg:px-8 pb-1">
                  {REMINDER_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      onClick={() => applyReminderPreset(p)}
                      className={cn(
                        "shrink-0 px-3.5 py-2 rounded-full text-xs font-medium transition-colors",
                        reminderPreset === p.label ? "accent-gradient text-white" : "glass-frost text-foreground"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    value={customReminders}
                    onChange={(e) => setCustomReminders(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applyCustomReminders(); } }}
                    placeholder="Custom: 60, 30, 14, 7, 1"
                    className="flex-1 glass-frost rounded-2xl px-4 py-2.5 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
                  />
                  <button onClick={applyCustomReminders} className="px-4 py-2.5 rounded-2xl glass-frost text-[#FF8C42] dark:text-orange-400 text-xs font-semibold">
                    Set
                  </button>
                </div>
                <p className="text-muted-foreground text-[11px] mt-1 px-1">
                  Active: {reminderDays.join(", ")} days before expiry
                </p>
              </FormField>

              <FormField label="Preparation Start Date">
                <input
                  type="date"
                  value={preparationDate}
                  onChange={(e) => setPreparationDate(e.target.value)}
                  className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
                />
              </FormField>

              <FormField label="Notes">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any extra context..."
                  rows={3}
                  className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors resize-none"
                />
              </FormField>

              {!isVoucher && (
                <FormField label={`Renewal Fee (${getCurrency().symbol})`}>
                  <input
                    type="number"
                    value={renewalFee}
                    onChange={(e) => setRenewalFee(e.target.value)}
                    placeholder="0.00"
                    className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
                  />
                </FormField>
              )}

              {!isVoucher && (
                <FormField label="Renewal Checklist">
                  <textarea
                    value={checklist}
                    onChange={(e) => setChecklist(e.target.value)}
                    placeholder="Steps to complete the renewal..."
                    rows={2}
                    className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors resize-none"
                  />
                </FormField>
              )}

              <FormField label="Renewal Site URL">
                <input
                  type="url"
                  value={renewalUrl}
                  onChange={(e) => setRenewalUrl(e.target.value)}
                  placeholder="https://example.com/renew"
                  className="w-full glass-frost rounded-2xl px-4 py-3 text-sm text-foreground outline-none border border-transparent focus:border-[#FF8C42] transition-colors"
                />
              </FormField>

              {type === "subscription" && (
                <div className="glass-frost rounded-2xl px-4 py-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Auto-Pay / Auto-Renewal</p>
                    <p className="text-xs text-muted-foreground">Mark as automatically charged â€” de-emphasizes alerts</p>
                  </div>
                  <button
                    onClick={() => setAutoPay(!autoPay)}
                    className={cn("w-11 h-6 rounded-full transition-colors relative shrink-0 ml-3", autoPay ? "accent-gradient" : "bg-foreground/10")}
                  >
                    <div className={cn("absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform", autoPay ? "translate-x-5" : "translate-x-0.5")} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Save button is now in the header (top-right checkmark) */}
      <div className="h-8" />

      {categoryOpen && (
        <CategorySheet
          categories={categories}
          selected={category}
          onSelect={(name) => { setCategory(name); setCategoryOpen(false); }}
          onCreate={async (name) => {
            try {
              await db.entities.Category.create({ name, icon: "FileText", color: "slate" });
              invalidateCategories();
              setCategory(name);
              setCategoryOpen(false);
              toast({ title: "Category created", variant: "success" });
            } catch {
              toast({ title: "Failed to create category", variant: "destructive" });
            }
          }}
          onClose={() => setCategoryOpen(false)}
        />
      )}

      {profileOpen && (
        <Sheet onClose={() => setProfileOpen(false)}>
          <h3 className="text-foreground font-semibold text-base mb-3">Family Profile</h3>
          <div className="space-y-1">
            <button
              onClick={() => { setProfileId(""); setProfileName(""); setProfileOpen(false); }}
              className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", !profileId ? "accent-gradient text-white" : "text-foreground hover:bg-foreground/5")}
            >
              <Users className="w-5 h-5" />
              None
            </button>
            {profiles.map((p) => {
              const color = PROFILE_COLORS[p.color] || PROFILE_COLORS.slate;
              return (
                <button
                  key={p.id}
                  onClick={() => { setProfileId(p.id); setProfileName(p.name); setProfileOpen(false); }}
                  className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors", profileId === p.id ? "accent-gradient text-white" : "text-foreground hover:bg-foreground/5")}
                >
                  <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", color.bg)}>
                    <span className="text-white font-semibold text-xs">{p.name.charAt(0).toUpperCase()}</span>
                  </div>
                  {p.name}
                  <span className="text-xs opacity-60 ml-auto">{p.relationship}</span>
                </button>
              );
            })}
            {profiles.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-4">
                No profiles yet. Create some in Family Profiles.
              </p>
            )}
          </div>
        </Sheet>
      )}

      {recurrenceOpen && (
        <Sheet onClose={() => setRecurrenceOpen(false)}>
          <h3 className="text-foreground font-semibold text-base mb-3">Recurrence</h3>
          <div className="space-y-1">
            {RECURRENCE_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => { setRecurrence(opt); setRecurrenceOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors",
                  recurrence === opt ? "accent-gradient text-white" : "text-foreground hover:bg-foreground/5"
                )}
              >
                {opt}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

function FormField({ label, required, children }) {
  return (
    <div className="overflow-hidden">
      <label className="block text-muted-foreground text-xs font-medium mb-1.5 px-1">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

function Sheet({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-end animate-fade-in" onClick={onClose}>
      <div className="w-full glass-frost rounded-t-3xl p-5 animate-slide-up max-w-2xl mx-auto" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-foreground/15 rounded-full mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}