import React, { useState, useMemo, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ProposalNotesForm } from "@/components/proposals/ProposalNotesForm";
import { PendingProposals } from "@/components/proposals/PendingProposals";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import {
  Sparkles,
  Calculator,
  FileText,
  MessageSquare,
  Phone,
  Video,
  Plus,
  Trash2,
  Copy,
  Download,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  DollarSign,
  Percent,
  Globe,
  Lock,
  Unlock,
  StickyNote,
  Clock,
  Save,
  FolderOpen,
  User,
  Building2
} from "lucide-react";

// ==================== RATE CARD DATA ====================

const TEXT_PLANS = [
  { name: "Starter", responses: 5000, unitPrice: 0.05, annual: 3000 },
  { name: "Growth", responses: 10000, unitPrice: 0.045, annual: 5400 },
  { name: "Pro", responses: 25000, unitPrice: 0.035, annual: 10500 },
  { name: "Scale", responses: 50000, unitPrice: 0.03, annual: 18000 },
  { name: "Enterprise", responses: 100000, unitPrice: 0.025, annual: 30000 },
  { name: "Large Enterprise", responses: 250000, unitPrice: 0.02, annual: 60000 },
];

const VOICE_TIERS = [
  { name: "Tier 1", minHours: 100, maxHours: 399, unitPrice: 6, minCommitment: 150, annualMin: 10800 },
  { name: "Tier 2", minHours: 400, maxHours: 999, unitPrice: 5.5, minCommitment: 400, annualMin: 26400 },
  { name: "Tier 3", minHours: 1000, maxHours: 2999, unitPrice: 5, minCommitment: 1000, annualMin: 60000 },
  { name: "Tier 4", minHours: 3000, maxHours: Infinity, unitPrice: 4.5, minCommitment: 3000, annualMin: 162000 },
];

const AVATAR_TIERS = [
  { name: "Tier 1", minHours: 100, maxHours: 249, unitPrice: 12, minCommitment: 100, annualMin: 14400 },
  { name: "Tier 2", minHours: 250, maxHours: 399, unitPrice: 11.5, minCommitment: 200, annualMin: 27600 },
  { name: "Tier 3", minHours: 400, maxHours: 799, unitPrice: 11, minCommitment: 400, annualMin: 52800 },
  { name: "Tier 4", minHours: 800, maxHours: Infinity, unitPrice: 10.5, minCommitment: 800, annualMin: 100800 },
];

const CURRENCIES = [
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "BHD", name: "Bahraini Dinar", symbol: "BD" },
  { code: "SAR", name: "Saudi Riyal", symbol: "SAR" },
  { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD" },
  { code: "AED", name: "UAE Dirham", symbol: "AED" },
  { code: "QAR", name: "Qatari Riyal", symbol: "QAR" },
];

// ==================== TYPES ====================

interface SetupLine {
  id: string;
  name: string;
  amount: number;
}

interface TextConfig {
  enabled: boolean;
  monthlyResponses: number;
  customPricing: boolean;
  customAnnual: number;
}

interface VoiceConfig {
  enabled: boolean;
  monthlyHours: number;
  peakMonthHours: number;
}

interface AvatarConfig {
  enabled: boolean;
  monthlyHours: number;
}

interface LineItem {
  category: string;
  model: string;
  tier: string;
  volumeMonthly: number;
  unitPrice: number;
  minCommitment: number;
  billableVolume: number;
  annualUSD: number;
  annualConverted: number;
  notes: string;
}

// ==================== HELPER FUNCTIONS ====================

const getTextPlan = (monthlyResponses: number) => {
  if (monthlyResponses > 250000) {
    return { plan: null, isCustom: true };
  }
  for (const plan of TEXT_PLANS) {
    if (monthlyResponses <= plan.responses) {
      return { plan, isCustom: false };
    }
  }
  return { plan: TEXT_PLANS[TEXT_PLANS.length - 1], isCustom: false };
};

const getVoiceTier = (monthlyHours: number) => {
  // If below minimum tier, still use Tier 1
  if (monthlyHours < 100) {
    return VOICE_TIERS[0];
  }
  for (const tier of VOICE_TIERS) {
    if (monthlyHours >= tier.minHours && monthlyHours <= tier.maxHours) {
      return tier;
    }
  }
  return VOICE_TIERS[VOICE_TIERS.length - 1];
};

const getAvatarTier = (monthlyHours: number) => {
  // If below minimum tier, still use Tier 1
  if (monthlyHours < 100) {
    return AVATAR_TIERS[0];
  }
  for (const tier of AVATAR_TIERS) {
    if (monthlyHours >= tier.minHours && monthlyHours <= tier.maxHours) {
      return tier;
    }
  }
  return AVATAR_TIERS[AVATAR_TIERS.length - 1];
};

const formatCurrency = (amount: number, symbol: string) => {
  return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const generateId = () => Math.random().toString(36).substring(2, 9);

// ==================== MAIN COMPONENT ====================

interface CalculatorDraft {
  id: string;
  customer_name: string;
  draft_name: string | null;
  currency: string;
  fx_rate: number;
  setup_base: number;
  setup_lines: SetupLine[];
  text_config: TextConfig;
  voice_config: VoiceConfig;
  avatar_config: AvatarConfig;
  discount_permission: "allowed" | "restricted";
  discount_percent: number;
  discount_reason: string;
  discount_applies_to: "all" | "recurring";
  vat_enabled: boolean;
  vat_rate: number;
  vat_applies_to: "all" | "recurring";
  force_minimums: boolean;
  grand_total_usd: number;
  grand_total_converted: number;
  monthly_equivalent: number;
  created_at: string;
  updated_at: string;
}

const ProposalGenie = () => {
  const { toast } = useToast();

  // Customer name for draft
  const [customerName, setCustomerName] = useState("");
  const [draftName, setDraftName] = useState("");
  
  // Saved drafts
  const [savedDrafts, setSavedDrafts] = useState<CalculatorDraft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showSavedDrafts, setShowSavedDrafts] = useState(false);

  // Currency
  const [currency, setCurrency] = useState("USD");
  const [fxRate, setFxRate] = useState(1);

  // Setup Fees
  const [setupBase, setSetupBase] = useState(0);
  const [setupLines, setSetupLines] = useState<SetupLine[]>([]);

  // Discount
  const [discountPermission, setDiscountPermission] = useState<"allowed" | "restricted">("allowed");
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountReason, setDiscountReason] = useState("");
  const [discountAppliesTo, setDiscountAppliesTo] = useState<"all" | "recurring">("all");

  // VAT
  const [vatEnabled, setVatEnabled] = useState(false);
  const [vatRate, setVatRate] = useState(0);
  const [vatAppliesTo, setVatAppliesTo] = useState<"all" | "recurring">("all");

  // AI Models
  const [textConfig, setTextConfig] = useState<TextConfig>({
    enabled: false,
    monthlyResponses: 0,
    customPricing: false,
    customAnnual: 0
  });

  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>({
    enabled: false,
    monthlyHours: 0,
    peakMonthHours: 0
  });

  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>({
    enabled: false,
    monthlyHours: 0
  });

  // Force minimums toggle
  const [forceMinimums, setForceMinimums] = useState(true);

  // Integration Scope
  const [scopeInput, setScopeInput] = useState("");
  const [generatedScope, setGeneratedScope] = useState("");

  // Use Cases
  const [useCaseInput, setUseCaseInput] = useState("");
  const [generatedUseCases, setGeneratedUseCases] = useState("");

  // Get currency symbol
  const currencySymbol = CURRENCIES.find(c => c.code === currency)?.symbol || "$";

  // ==================== DRAFT FUNCTIONS ====================

  const fetchSavedDrafts = async () => {
    setLoadingDrafts(true);
    try {
      const { data, error } = await (supabase as any)
        .from('calculator_drafts')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const drafts: CalculatorDraft[] = (data || []).map((d: any) => ({
        id: d.id,
        customer_name: d.customer_name,
        draft_name: d.draft_name,
        currency: d.currency || 'USD',
        fx_rate: d.fx_rate || 1,
        setup_base: d.setup_base || 0,
        setup_lines: d.setup_lines || [],
        text_config: d.text_config || { enabled: false, monthlyResponses: 0, customPricing: false, customAnnual: 0 },
        voice_config: d.voice_config || { enabled: false, monthlyHours: 0, peakMonthHours: 0 },
        avatar_config: d.avatar_config || { enabled: false, monthlyHours: 0 },
        discount_permission: d.discount_permission || 'allowed',
        discount_percent: d.discount_percent || 0,
        discount_reason: d.discount_reason || '',
        discount_applies_to: d.discount_applies_to || 'all',
        vat_enabled: d.vat_enabled || false,
        vat_rate: d.vat_rate || 0,
        vat_applies_to: d.vat_applies_to || 'all',
        force_minimums: d.force_minimums !== false,
        grand_total_usd: d.grand_total_usd || 0,
        grand_total_converted: d.grand_total_converted || 0,
        monthly_equivalent: d.monthly_equivalent || 0,
        created_at: d.created_at,
        updated_at: d.updated_at
      }));
      
      setSavedDrafts(drafts);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast({ title: "Failed to load drafts", variant: "destructive" });
    } finally {
      setLoadingDrafts(false);
    }
  };

  const saveDraft = async () => {
    if (!customerName.trim()) {
      toast({ title: "Please enter a customer name", variant: "destructive" });
      return;
    }

    setSavingDraft(true);
    try {
      const draftData = {
        customer_name: customerName.trim(),
        draft_name: draftName.trim() || null,
        currency,
        fx_rate: fxRate,
        setup_base: setupBase,
        setup_lines: setupLines,
        text_config: textConfig,
        voice_config: voiceConfig,
        avatar_config: avatarConfig,
        discount_permission: discountPermission,
        discount_percent: discountPercent,
        discount_reason: discountReason,
        discount_applies_to: discountAppliesTo,
        vat_enabled: vatEnabled,
        vat_rate: vatRate,
        vat_applies_to: vatAppliesTo,
        force_minimums: forceMinimums,
        grand_total_usd: calculations.grandTotalUSD,
        grand_total_converted: calculations.grandTotalConverted,
        monthly_equivalent: calculations.monthlyEquivalent
      };

      const { error } = await (supabase as any)
        .from('calculator_drafts')
        .insert(draftData);

      if (error) throw error;

      toast({ title: "Draft saved!", description: `Calculator draft for ${customerName} saved successfully` });
      fetchSavedDrafts();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({ title: "Failed to save draft", variant: "destructive" });
    } finally {
      setSavingDraft(false);
    }
  };

  const loadDraft = (draft: CalculatorDraft) => {
    setCustomerName(draft.customer_name);
    setDraftName(draft.draft_name || '');
    setCurrency(draft.currency);
    setFxRate(draft.fx_rate);
    setSetupBase(draft.setup_base);
    setSetupLines(draft.setup_lines);
    setTextConfig(draft.text_config);
    setVoiceConfig(draft.voice_config);
    setAvatarConfig(draft.avatar_config);
    setDiscountPermission(draft.discount_permission);
    setDiscountPercent(draft.discount_percent);
    setDiscountReason(draft.discount_reason);
    setDiscountAppliesTo(draft.discount_applies_to);
    setVatEnabled(draft.vat_enabled);
    setVatRate(draft.vat_rate);
    setVatAppliesTo(draft.vat_applies_to);
    setForceMinimums(draft.force_minimums);
    setShowSavedDrafts(false);
    
    toast({ title: "Draft loaded", description: `Loaded calculator for ${draft.customer_name}` });
  };

  const deleteDraft = async (id: string) => {
    try {
      const { error } = await (supabase as any)
        .from('calculator_drafts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Draft deleted" });
      fetchSavedDrafts();
    } catch (error) {
      console.error('Error deleting draft:', error);
      toast({ title: "Failed to delete draft", variant: "destructive" });
    }
  };

  // Fetch drafts on mount
  useEffect(() => {
    fetchSavedDrafts();
  }, []);

  // ==================== CALCULATIONS ====================

  const calculations = useMemo(() => {
    const lineItems: LineItem[] = [];
    let subtotalSetup = 0;
    let subtotalRecurring = 0;

    // Setup fees - add each line item separately
    if (setupBase > 0) {
      lineItems.push({
        category: "setup",
        model: "Setup",
        tier: "Base Fee",
        volumeMonthly: 0,
        unitPrice: 0,
        minCommitment: 0,
        billableVolume: 0,
        annualUSD: setupBase,
        annualConverted: setupBase * fxRate,
        notes: "One-time"
      });
      subtotalSetup += setupBase;
    }
    
    // Add each setup line item
    for (const line of setupLines) {
      if (line.amount > 0) {
        lineItems.push({
          category: "setup",
          model: "Setup",
          tier: line.name || "Additional",
          volumeMonthly: 0,
          unitPrice: 0,
          minCommitment: 0,
          billableVolume: 0,
          annualUSD: line.amount,
          annualConverted: line.amount * fxRate,
          notes: "One-time"
        });
        subtotalSetup += line.amount;
      }
    }

    // AI Text
    if (textConfig.enabled && textConfig.monthlyResponses > 0) {
      const { plan, isCustom } = getTextPlan(textConfig.monthlyResponses);
      
      if (isCustom || textConfig.customPricing) {
        lineItems.push({
          category: "text",
          model: "AI Text",
          tier: "Custom / Enterprise+",
          volumeMonthly: textConfig.monthlyResponses,
          unitPrice: textConfig.customAnnual > 0 ? textConfig.customAnnual / (textConfig.monthlyResponses * 12) : 0,
          minCommitment: 0,
          billableVolume: textConfig.monthlyResponses,
          annualUSD: textConfig.customAnnual,
          annualConverted: textConfig.customAnnual * fxRate,
          notes: "Custom pricing - manual entry required"
        });
        subtotalRecurring += textConfig.customAnnual;
      } else if (plan) {
        lineItems.push({
          category: "text",
          model: "AI Text",
          tier: plan.name,
          volumeMonthly: textConfig.monthlyResponses,
          unitPrice: plan.unitPrice,
          minCommitment: 0,
          billableVolume: plan.responses,
          annualUSD: plan.annual,
          annualConverted: plan.annual * fxRate,
          notes: `Up to ${plan.responses.toLocaleString()} responses/month`
        });
        subtotalRecurring += plan.annual;
      }
    }

    // AI Voice
    if (voiceConfig.enabled && (voiceConfig.monthlyHours > 0 || forceMinimums)) {
      const tier = getVoiceTier(voiceConfig.monthlyHours);
      const billableHours = Math.max(voiceConfig.monthlyHours, tier.minCommitment);
      const annualCost = billableHours * tier.unitPrice * 12;

      lineItems.push({
        category: "voice",
        model: "AI Voice",
        tier: tier.name,
        volumeMonthly: voiceConfig.monthlyHours,
        unitPrice: tier.unitPrice,
        minCommitment: tier.minCommitment,
        billableVolume: billableHours,
        annualUSD: annualCost,
        annualConverted: annualCost * fxRate,
        notes: voiceConfig.monthlyHours < tier.minCommitment 
          ? `Min commitment: ${tier.minCommitment} hrs/month` 
          : ""
      });
      subtotalRecurring += annualCost;
    }

    // AI Avatar
    if (avatarConfig.enabled && (avatarConfig.monthlyHours > 0 || forceMinimums)) {
      const tier = getAvatarTier(avatarConfig.monthlyHours);
      const billableHours = Math.max(avatarConfig.monthlyHours, tier.minCommitment);
      const annualCost = billableHours * tier.unitPrice * 12;

      lineItems.push({
        category: "avatar",
        model: "AI Avatar",
        tier: tier.name,
        volumeMonthly: avatarConfig.monthlyHours,
        unitPrice: tier.unitPrice,
        minCommitment: tier.minCommitment,
        billableVolume: billableHours,
        annualUSD: annualCost,
        annualConverted: annualCost * fxRate,
        notes: avatarConfig.monthlyHours < tier.minCommitment 
          ? `Min commitment: ${tier.minCommitment} hrs/month` 
          : ""
      });
      subtotalRecurring += annualCost;
    }

    // Calculate subtotal before discount
    const subtotalBeforeDiscount = discountAppliesTo === "all" 
      ? subtotalSetup + subtotalRecurring 
      : subtotalRecurring;

    // Discount
    const effectiveDiscountPercent = discountPermission === "restricted" ? 0 : discountPercent;
    const discountAmount = subtotalBeforeDiscount * (effectiveDiscountPercent / 100);
    
    if (discountAmount > 0) {
      lineItems.push({
        category: "discount",
        model: "Discount",
        tier: `${effectiveDiscountPercent}%`,
        volumeMonthly: 0,
        unitPrice: 0,
        minCommitment: 0,
        billableVolume: 0,
        annualUSD: -discountAmount,
        annualConverted: -discountAmount * fxRate,
        notes: discountReason || `Applied to ${discountAppliesTo === "all" ? "all" : "recurring only"}`
      });
    }

    // Calculate subtotal after discount for VAT
    const subtotalAfterDiscount = (subtotalSetup + subtotalRecurring) - discountAmount;
    const vatBase = vatAppliesTo === "all" 
      ? subtotalAfterDiscount 
      : subtotalRecurring - (discountAppliesTo === "recurring" ? discountAmount : 0);

    // VAT
    const vatAmount = vatEnabled ? vatBase * (vatRate / 100) : 0;
    if (vatAmount > 0) {
      lineItems.push({
        category: "vat",
        model: "VAT",
        tier: `${vatRate}%`,
        volumeMonthly: 0,
        unitPrice: 0,
        minCommitment: 0,
        billableVolume: 0,
        annualUSD: vatAmount,
        annualConverted: vatAmount * fxRate,
        notes: `Applied to ${vatAppliesTo === "all" ? "all" : "recurring only"}`
      });
    }

    // Grand Total
    const grandTotalUSD = subtotalAfterDiscount + vatAmount;
    const grandTotalConverted = grandTotalUSD * fxRate;
    const monthlyEquivalent = grandTotalConverted / 12;

    return {
      lineItems,
      subtotalSetup,
      subtotalRecurring,
      discountAmount,
      vatAmount,
      grandTotalUSD,
      grandTotalConverted,
      monthlyEquivalent
    };
  }, [
    setupBase, setupLines, textConfig, voiceConfig, avatarConfig,
    discountPermission, discountPercent, discountAppliesTo, discountReason,
    vatEnabled, vatRate, vatAppliesTo, fxRate, forceMinimums
  ]);

  // ==================== HANDLERS ====================

  const addSetupLine = () => {
    setSetupLines([...setupLines, { id: generateId(), name: "", amount: 0 }]);
  };

  const updateSetupLine = (id: string, field: "name" | "amount", value: string | number) => {
    setSetupLines(setupLines.map(line => 
      line.id === id ? { ...line, [field]: value } : line
    ));
  };

  const removeSetupLine = (id: string) => {
    setSetupLines(setupLines.filter(line => line.id !== id));
  };

  const generateIntegrationScope = () => {
    if (!scopeInput.trim()) {
      toast({ title: "Please describe the integration", variant: "destructive" });
      return;
    }

    const input = scopeInput.toLowerCase();
    
    // Detect integration types and build concise scope
    const scopeItems: string[] = [];
    let title = "Integration Scope";
    let overview = "";

    // QR / Ordering / Menu
    if (input.includes('qr') || input.includes('ordering') || input.includes('menu')) {
      title = "Integration Scope — AI-Powered Ordering";
      overview = "AI-driven ordering experience integrated with live menu data for accurate pricing, availability, and seamless order completion.";
      
      if (input.includes('qr')) {
        scopeItems.push("QR code generation and mobile-optimized AI interface");
      }
      if (input.includes('menu') || input.includes('catalog') || input.includes('product')) {
        scopeItems.push("Menu/catalog sync via API (items, prices, availability, modifiers)");
      }
    }

    // CRM
    if (input.includes('crm') || input.includes('salesforce') || input.includes('hubspot') || input.includes('customer data')) {
      if (!title.includes('—')) title = "Integration Scope — CRM Integration";
      if (!overview) overview = "AI assistant connected to CRM for customer lookup, personalized experiences, and interaction logging.";
      scopeItems.push("CRM integration for customer lookup and profile sync");
    }

    // Voice / SIP
    if (input.includes('voice') || input.includes('sip') || input.includes('call') || input.includes('telephony') || input.includes('ivr')) {
      if (!title.includes('—')) title = "Integration Scope — Voice AI";
      if (!overview) overview = "AI-powered voice interactions through existing telephony infrastructure with intelligent routing and handoff.";
      scopeItems.push("SIP trunk configuration and call routing");
    }

    // Payment
    if (input.includes('payment') || input.includes('checkout') || input.includes('transaction')) {
      scopeItems.push("Payment gateway integration and confirmation flow");
    }

    // Orders / POS
    if (input.includes('order') || input.includes('pos') || input.includes('kitchen')) {
      scopeItems.push("Order management and POS/kitchen system handoff");
    }

    // Ticketing
    if (input.includes('ticket') || input.includes('support') || input.includes('zendesk') || input.includes('freshdesk') || input.includes('helpdesk')) {
      if (!title.includes('—')) title = "Integration Scope — Support Integration";
      if (!overview) overview = "AI assistant connected to ticketing system for issue resolution, ticket creation, and agent handoff.";
      scopeItems.push("Ticketing system integration (create, lookup, escalate)");
    }

    // Delivery
    if (input.includes('delivery') || input.includes('shipping') || input.includes('tracking') || input.includes('logistics')) {
      scopeItems.push("Delivery tracking and status updates");
    }

    // Channels
    const channels: string[] = [];
    if (input.includes('whatsapp')) channels.push("WhatsApp");
    if (input.includes('instagram')) channels.push("Instagram");
    if (input.includes('facebook')) channels.push("Facebook");
    if (input.includes('web') || input.includes('widget')) channels.push("Web widget");
    if (channels.length > 0) {
      scopeItems.push(`Channel configuration: ${channels.join(", ")}`);
    }

    // Database / API
    if (input.includes('database') || input.includes('api') || input.includes('data sync')) {
      scopeItems.push("API integration and data synchronization");
    }

    // Default if nothing detected
    if (scopeItems.length === 0) {
      title = "Integration Scope — Custom AI Solution";
      overview = "AI assistant integrated with client systems for seamless automation.";
      scopeItems.push("API integration with required systems");
      scopeItems.push("Data synchronization and mapping");
    }

    // Always add AI experience
    scopeItems.unshift("Conversational AI experience with smart recommendations");

    // Build concise output
    let output = `${title}\n\n`;
    output += `${overview}\n\n`;
    output += `Scope Includes:\n`;
    for (const item of scopeItems) {
      output += `• ${item}\n`;
    }
    output += `\n—\nConfirmation subject to API documentation evaluation by our technical team.`;

    setGeneratedScope(output);
    toast({ title: "Scope generated", description: "Integration scope ready to copy" });
  };

  const generateUseCases = () => {
    if (!useCaseInput.trim()) {
      toast({ title: "Please describe the use case context", variant: "destructive" });
      return;
    }

    const input = useCaseInput.toLowerCase();
    const useCases: string[] = [];

    // Restaurant / F&B
    if (input.includes('restaurant') || input.includes('food') || input.includes('f&b') || input.includes('dining') || input.includes('cafe')) {
      useCases.push("Menu browsing and item recommendations based on preferences");
      useCases.push("Order placement with modifiers and special requests");
      useCases.push("Table reservation and waitlist management");
      useCases.push("Delivery order tracking and status updates");
      useCases.push("Loyalty points inquiry and redemption");
      useCases.push("Complaint handling and feedback collection");
    }

    // Retail / E-commerce
    if (input.includes('retail') || input.includes('ecommerce') || input.includes('e-commerce') || input.includes('shop') || input.includes('store')) {
      useCases.push("Product search and recommendations");
      useCases.push("Order status and delivery tracking");
      useCases.push("Return and refund requests");
      useCases.push("Stock availability inquiries");
      useCases.push("Abandoned cart recovery");
      useCases.push("Loyalty program and promotions");
    }

    // Banking / Finance
    if (input.includes('bank') || input.includes('finance') || input.includes('insurance') || input.includes('loan')) {
      useCases.push("Account balance and transaction history");
      useCases.push("Card blocking and replacement requests");
      useCases.push("Loan application status updates");
      useCases.push("Payment reminders and due date inquiries");
      useCases.push("Branch/ATM locator");
      useCases.push("Fraud alert verification");
    }

    // Telecom
    if (input.includes('telecom') || input.includes('mobile') || input.includes('internet') || input.includes('broadband')) {
      useCases.push("Plan details and usage inquiries");
      useCases.push("Bill payment and due date reminders");
      useCases.push("Data top-up and add-on purchases");
      useCases.push("Network issue reporting");
      useCases.push("Plan upgrade recommendations");
      useCases.push("SIM replacement requests");
    }

    // Healthcare
    if (input.includes('health') || input.includes('hospital') || input.includes('clinic') || input.includes('medical') || input.includes('patient')) {
      useCases.push("Appointment booking and rescheduling");
      useCases.push("Lab results and report retrieval");
      useCases.push("Prescription refill requests");
      useCases.push("Doctor availability inquiries");
      useCases.push("Insurance eligibility verification");
      useCases.push("Symptom assessment and triage");
    }

    // Government
    if (input.includes('government') || input.includes('citizen') || input.includes('public') || input.includes('municipality')) {
      useCases.push("Service eligibility checks");
      useCases.push("Application status tracking");
      useCases.push("Document requirement explanations");
      useCases.push("Appointment scheduling for services");
      useCases.push("Fee and payment inquiries");
      useCases.push("Complaint registration and follow-up");
    }

    // Support / Customer Service
    if (input.includes('support') || input.includes('service') || input.includes('help') || input.includes('customer')) {
      useCases.push("FAQ resolution and common inquiries");
      useCases.push("Ticket creation and status tracking");
      useCases.push("Complaint handling with escalation");
      useCases.push("Product troubleshooting guidance");
      useCases.push("Account and profile management");
      useCases.push("Feedback and survey collection");
    }

    // HR / Internal
    if (input.includes('hr') || input.includes('employee') || input.includes('internal') || input.includes('staff')) {
      useCases.push("Leave balance and request submission");
      useCases.push("Policy and benefits inquiries");
      useCases.push("IT helpdesk and troubleshooting");
      useCases.push("Payroll and payslip questions");
      useCases.push("Training enrollment and schedules");
      useCases.push("Onboarding assistance for new hires");
    }

    // Voice specific
    if (input.includes('voice') || input.includes('call') || input.includes('phone') || input.includes('ivr')) {
      useCases.push("IVR deflection and self-service");
      useCases.push("Call routing and agent handoff");
      useCases.push("Appointment confirmations via voice");
      useCases.push("Payment processing over the phone");
    }

    // Default if nothing specific detected
    if (useCases.length === 0) {
      useCases.push("General inquiry handling and FAQ resolution");
      useCases.push("Status tracking and updates");
      useCases.push("Appointment/booking management");
      useCases.push("Complaint handling and escalation");
      useCases.push("Information lookup and retrieval");
      useCases.push("Feedback collection");
    }

    // Remove duplicates and limit
    const uniqueUseCases = [...new Set(useCases)].slice(0, 8);

    // Build output
    let output = "Potential Use Cases\n\n";
    for (const uc of uniqueUseCases) {
      output += `• ${uc}\n`;
    }

    setGeneratedUseCases(output.trim());
    toast({ title: "Use cases generated", description: `${uniqueUseCases.length} use cases created` });
  };

  const copyTableToClipboard = () => {
    const headers = ["Line Item", "Model", "Tier", "Monthly Volume", "Unit Price", "Min Commitment", "Billable Volume", "Annual Cost", "Notes"];
    const rows = calculations.lineItems.map(item => [
      item.model,
      item.model,
      item.tier,
      item.volumeMonthly || "-",
      item.unitPrice ? `$${item.unitPrice}` : "-",
      item.minCommitment || "-",
      item.billableVolume || "-",
      formatCurrency(item.annualConverted, currencySymbol),
      item.notes
    ]);
    
    // Add totals
    rows.push(["", "", "", "", "", "", "", "", ""]);
    rows.push(["Grand Total (Annual)", "", "", "", "", "", "", formatCurrency(calculations.grandTotalConverted, currencySymbol), ""]);
    rows.push(["Monthly Equivalent", "", "", "", "", "", "", formatCurrency(calculations.monthlyEquivalent, currencySymbol), ""]);

    const tsv = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
    navigator.clipboard.writeText(tsv);
    toast({ title: "Copied!", description: "Table copied to clipboard" });
  };

  const exportCSV = () => {
    const headers = ["Line Item", "Model", "Tier", "Monthly Volume", "Unit Price (USD)", "Min Commitment", "Billable Volume", "Annual Cost (USD)", "Annual Cost (Local)", "Notes"];
    const rows = calculations.lineItems.map(item => [
      item.model,
      item.model,
      item.tier,
      item.volumeMonthly || "",
      item.unitPrice || "",
      item.minCommitment || "",
      item.billableVolume || "",
      item.annualUSD,
      item.annualConverted,
      item.notes
    ]);
    
    rows.push(["", "", "", "", "", "", "", "", "", ""]);
    rows.push(["Grand Total (Annual)", "", "", "", "", "", "", calculations.grandTotalUSD, calculations.grandTotalConverted, ""]);
    rows.push(["Monthly Equivalent", "", "", "", "", "", "", calculations.grandTotalUSD / 12, calculations.monthlyEquivalent, ""]);

    const csv = [headers.join(","), ...rows.map(r => r.map(cell => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposal-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: "CSV file downloaded" });
  };

  const copyScopeToClipboard = () => {
    navigator.clipboard.writeText(generatedScope);
    toast({ title: "Copied!", description: "Integration scope copied to clipboard" });
  };

  const copyUseCasesToClipboard = () => {
    navigator.clipboard.writeText(generatedUseCases);
    toast({ title: "Copied!", description: "Use cases copied to clipboard" });
  };

  const resetForm = () => {
    setCustomerName("");
    setDraftName("");
    setCurrency("USD");
    setFxRate(1);
    setSetupBase(0);
    setSetupLines([]);
    setDiscountPercent(0);
    setDiscountReason("");
    setDiscountPermission("allowed");
    setDiscountAppliesTo("all");
    setVatEnabled(false);
    setVatRate(0);
    setVatAppliesTo("all");
    setForceMinimums(true);
    setTextConfig({ enabled: false, monthlyResponses: 0, customPricing: false, customAnnual: 0 });
    setVoiceConfig({ enabled: false, monthlyHours: 0, peakMonthHours: 0 });
    setAvatarConfig({ enabled: false, monthlyHours: 0 });
    setScopeInput("");
    setGeneratedScope("");
    setUseCaseInput("");
    setGeneratedUseCases("");
    toast({ title: "Reset", description: "Form has been reset" });
  };

  // ==================== RENDER ====================

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                Proposal Genie
              </h1>
              <p className="text-muted-foreground">
                Proposal notes, pricing calculator & pending proposals
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="notes" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-muted/50 p-1 h-auto">
            <TabsTrigger value="notes" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 py-3">
              <StickyNote className="h-4 w-4" />
              <span className="font-medium">Notes</span>
            </TabsTrigger>
            <TabsTrigger value="calculator" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 py-3">
              <Calculator className="h-4 w-4" />
              <span className="font-medium">Calculator</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-2 py-3">
              <Clock className="h-4 w-4" />
              <span className="font-medium">Pending Proposals</span>
            </TabsTrigger>
          </TabsList>

          {/* Notes Tab */}
          <TabsContent value="notes" className="mt-0">
            <ProposalNotesForm />
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="mt-0 space-y-6">
            {/* Customer Name & Actions Bar */}
            <Card className="border-0 shadow-lg bg-gradient-to-r from-purple-500/5 to-pink-500/5">
              <CardContent className="pt-4 pb-4">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        Customer Name *
                      </Label>
                      <Input 
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Draft Name (Optional)
                      </Label>
                      <Input 
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="e.g., Initial Quote, Revised v2"
                        className="bg-background"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={saveDraft}
                      disabled={savingDraft || !customerName.trim()}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                    >
                      {savingDraft ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Draft
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowSavedDrafts(!showSavedDrafts)}
                    >
                      <FolderOpen className="h-4 w-4 mr-2" />
                      {showSavedDrafts ? 'Hide' : 'Load'} Drafts
                      {savedDrafts.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {savedDrafts.length}
                        </Badge>
                      )}
                    </Button>
                    <Button variant="outline" onClick={resetForm}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saved Drafts Panel */}
            {showSavedDrafts && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FolderOpen className="h-4 w-4" />
                    Saved Calculator Drafts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingDrafts ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : savedDrafts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No saved drafts yet</p>
                      <p className="text-sm">Save your first calculator draft above</p>
                    </div>
                  ) : (
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-2 pr-4">
                        {savedDrafts.map((draft) => (
                          <div 
                            key={draft.id}
                            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">{draft.customer_name}</span>
                                {draft.draft_name && (
                                  <Badge variant="outline" className="text-xs">
                                    {draft.draft_name}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  {formatCurrency(draft.grand_total_converted, 
                                    CURRENCIES.find(c => c.code === draft.currency)?.symbol || '$'
                                  )}/yr
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(new Date(draft.updated_at), 'MMM dd, yyyy')}
                                </span>
                                <span className="flex items-center gap-1">
                                  {draft.text_config?.enabled && <MessageSquare className="h-3 w-3 text-blue-500" />}
                                  {draft.voice_config?.enabled && <Phone className="h-3 w-3 text-green-500" />}
                                  {draft.avatar_config?.enabled && <Video className="h-3 w-3 text-purple-500" />}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => loadDraft(draft)}
                              >
                                Load
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteDraft(draft.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT PANEL - INPUTS */}
          <div className="space-y-4">
            {/* Currency & Setup in one row */}
            <div className="grid grid-cols-2 gap-4">
              {/* Currency */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Currency
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={currency} onValueChange={(v) => {
                    setCurrency(v);
                    if (v === "USD") setFxRate(1);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(c => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code} - {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currency !== "USD" && (
                    <div>
                      <Label className="text-xs">FX Rate</Label>
                      <Input 
                        type="number"
                        step="0.0001"
                        value={fxRate}
                        onChange={(e) => setFxRate(parseFloat(e.target.value) || 1)}
                        className="h-8"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Setup Fees */}
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Setup Fee
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Input 
                      type="number"
                      value={setupBase || ""}
                      onChange={(e) => setSetupBase(parseFloat(e.target.value) || 0)}
                      placeholder="Base setup fee (USD)"
                    />
                  </div>
                  {setupLines.map((line) => (
                    <div key={line.id} className="flex gap-2">
                      <Input 
                        value={line.name}
                        onChange={(e) => updateSetupLine(line.id, "name", e.target.value)}
                        placeholder="Item"
                        className="flex-1 h-8 text-sm"
                      />
                      <Input 
                        type="number"
                        value={line.amount || ""}
                        onChange={(e) => updateSetupLine(line.id, "amount", parseFloat(e.target.value) || 0)}
                        placeholder="Amount"
                        className="w-24 h-8 text-sm"
                      />
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => removeSetupLine(line.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={addSetupLine} className="w-full h-7 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Add Line
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* AI Models */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    AI Models
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Enforce minimums</span>
                    <Switch checked={forceMinimums} onCheckedChange={setForceMinimums} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* AI Text */}
                <div className={`p-3 rounded-lg border-2 transition-all ${textConfig.enabled ? 'border-blue-500 bg-blue-500/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">AI Text</span>
                    </div>
                    <Switch 
                      checked={textConfig.enabled} 
                      onCheckedChange={(v) => setTextConfig({ ...textConfig, enabled: v })}
                    />
                  </div>
                  {textConfig.enabled && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number"
                          value={textConfig.monthlyResponses || ""}
                          onChange={(e) => setTextConfig({ 
                            ...textConfig, 
                            monthlyResponses: parseInt(e.target.value) || 0,
                            customPricing: parseInt(e.target.value) > 250000
                          })}
                          placeholder="Monthly responses"
                          className="h-8"
                        />
                        {textConfig.monthlyResponses > 0 && textConfig.monthlyResponses <= 250000 && (
                          <Badge variant="secondary" className="whitespace-nowrap">
                            {getTextPlan(textConfig.monthlyResponses).plan?.name}
                          </Badge>
                        )}
                      </div>
                      {textConfig.monthlyResponses > 250000 && (
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          <Input 
                            type="number"
                            value={textConfig.customAnnual || ""}
                            onChange={(e) => setTextConfig({ ...textConfig, customAnnual: parseFloat(e.target.value) || 0 })}
                            placeholder="Custom annual price (USD)"
                            className="h-8"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Voice */}
                <div className={`p-3 rounded-lg border-2 transition-all ${voiceConfig.enabled ? 'border-green-500 bg-green-500/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">AI Voice</span>
                    </div>
                    <Switch 
                      checked={voiceConfig.enabled} 
                      onCheckedChange={(v) => setVoiceConfig({ ...voiceConfig, enabled: v })}
                    />
                  </div>
                  {voiceConfig.enabled && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number"
                          value={voiceConfig.monthlyHours || ""}
                          onChange={(e) => setVoiceConfig({ ...voiceConfig, monthlyHours: parseInt(e.target.value) || 0 })}
                          placeholder="Monthly hours"
                          className="h-8"
                        />
                        {voiceConfig.monthlyHours > 0 && (
                          <Badge variant="secondary" className="whitespace-nowrap">
                            {getVoiceTier(voiceConfig.monthlyHours).name}
                          </Badge>
                        )}
                      </div>
                      {voiceConfig.monthlyHours > 0 && voiceConfig.monthlyHours < getVoiceTier(voiceConfig.monthlyHours).minCommitment && (
                        <p className="text-xs text-yellow-600">
                          Min: {getVoiceTier(voiceConfig.monthlyHours).minCommitment} hrs/month
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* AI Avatar */}
                <div className={`p-3 rounded-lg border-2 transition-all ${avatarConfig.enabled ? 'border-purple-500 bg-purple-500/5' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-sm">AI Avatar</span>
                    </div>
                    <Switch 
                      checked={avatarConfig.enabled} 
                      onCheckedChange={(v) => setAvatarConfig({ ...avatarConfig, enabled: v })}
                    />
                  </div>
                  {avatarConfig.enabled && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <Input 
                          type="number"
                          value={avatarConfig.monthlyHours || ""}
                          onChange={(e) => setAvatarConfig({ ...avatarConfig, monthlyHours: parseInt(e.target.value) || 0 })}
                          placeholder="Monthly hours"
                          className="h-8"
                        />
                        {avatarConfig.monthlyHours > 0 && (
                          <Badge variant="secondary" className="whitespace-nowrap">
                            {getAvatarTier(avatarConfig.monthlyHours).name}
                          </Badge>
                        )}
                      </div>
                      {avatarConfig.monthlyHours > 0 && avatarConfig.monthlyHours < getAvatarTier(avatarConfig.monthlyHours).minCommitment && (
                        <p className="text-xs text-yellow-600">
                          Min: {getAvatarTier(avatarConfig.monthlyHours).minCommitment} hrs/month
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Optional: Discount & VAT */}
            <Card className="border-0 shadow-lg border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                  <Percent className="h-4 w-4" />
                  Discount & VAT
                  <Badge variant="outline" className="ml-2 text-xs font-normal">Optional</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Discount */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Discount</Label>
                    <Select 
                      value={discountPermission} 
                      onValueChange={(v: "allowed" | "restricted") => setDiscountPermission(v)}
                    >
                      <SelectTrigger className="w-28 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="allowed">
                          <div className="flex items-center gap-1">
                            <Unlock className="h-3 w-3" />
                            Allowed
                          </div>
                        </SelectItem>
                        <SelectItem value="restricted">
                          <div className="flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Restricted
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {discountPermission === "allowed" && (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input 
                          type="number"
                          min={0}
                          max={100}
                          value={discountPercent || ""}
                          onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                          className="h-8 pr-8"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                      <Select value={discountAppliesTo} onValueChange={(v: "all" | "recurring") => setDiscountAppliesTo(v)}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="recurring">Recurring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Separator />

                {/* VAT */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">VAT</Label>
                    <Switch checked={vatEnabled} onCheckedChange={setVatEnabled} />
                  </div>
                  {vatEnabled && (
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input 
                          type="number"
                          value={vatRate || ""}
                          onChange={(e) => setVatRate(parseFloat(e.target.value) || 0)}
                          className="h-8 pr-8"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                      <Select value={vatAppliesTo} onValueChange={(v: "all" | "recurring") => setVatAppliesTo(v)}>
                        <SelectTrigger className="w-32 h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="recurring">Recurring</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT PANEL - OUTPUTS */}
          <div className="space-y-6">
            {/* Recommended Package */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-500/5 to-pink-500/5">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Recommended Package
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {textConfig.enabled && textConfig.monthlyResponses > 0 && (
                    <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-blue-500" />
                        <span>AI Text</span>
                      </div>
                      <Badge>{textConfig.monthlyResponses > 250000 ? "Custom" : getTextPlan(textConfig.monthlyResponses).plan?.name}</Badge>
                    </div>
                  )}
                  {voiceConfig.enabled && (
                    <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-green-500" />
                        <span>AI Voice</span>
                      </div>
                      <Badge>{getVoiceTier(voiceConfig.monthlyHours).name}</Badge>
                    </div>
                  )}
                  {avatarConfig.enabled && (
                    <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-purple-500" />
                        <span>AI Avatar</span>
                      </div>
                      <Badge>{getAvatarTier(avatarConfig.monthlyHours).name}</Badge>
                    </div>
                  )}
                  {!textConfig.enabled && !voiceConfig.enabled && !avatarConfig.enabled && (
                    <div className="text-center text-muted-foreground py-4">
                      Select AI models to see recommendations
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t text-xs text-muted-foreground space-y-1">
                  <p>• Billed annually</p>
                  <p>• One-time setup fees apply</p>
                  <p>• Minimum commitments apply for Voice/Avatar</p>
                </div>
              </CardContent>
            </Card>

            {/* Pricing Breakdown */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Pricing Breakdown
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={copyTableToClipboard}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button variant="outline" size="sm" onClick={exportCSV}>
                      <Download className="h-4 w-4 mr-1" />
                      CSV
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {calculations.lineItems.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    Add setup fees or select AI models to see pricing
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-2">Line Item</th>
                          <th className="text-left py-2 px-2">Tier</th>
                          <th className="text-right py-2 px-2">Volume</th>
                          <th className="text-right py-2 px-2">Unit</th>
                          <th className="text-right py-2 px-2">Min</th>
                          <th className="text-right py-2 px-2">Annual</th>
                        </tr>
                      </thead>
                      <tbody>
                        {calculations.lineItems.map((item, idx) => (
                          <tr key={idx} className={`border-b ${item.category === 'discount' ? 'text-green-600' : item.category === 'vat' ? 'text-orange-600' : ''}`}>
                            <td className="py-2 px-2 font-medium">{item.model}</td>
                            <td className="py-2 px-2">{item.tier}</td>
                            <td className="text-right py-2 px-2">{item.volumeMonthly || "-"}</td>
                            <td className="text-right py-2 px-2">{item.unitPrice ? `$${item.unitPrice}` : "-"}</td>
                            <td className="text-right py-2 px-2">{item.minCommitment || "-"}</td>
                            <td className="text-right py-2 px-2 font-medium">
                              {formatCurrency(item.annualConverted, currencySymbol)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 font-bold">
                          <td colSpan={5} className="py-3 px-2">Grand Total (Annual)</td>
                          <td className="text-right py-3 px-2 text-lg">
                            {formatCurrency(calculations.grandTotalConverted, currencySymbol)}
                          </td>
                        </tr>
                        <tr className="text-muted-foreground">
                          <td colSpan={5} className="py-2 px-2">Monthly Equivalent</td>
                          <td className="text-right py-2 px-2">
                            {formatCurrency(calculations.monthlyEquivalent, currencySymbol)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Grand Totals Card */}
            {calculations.lineItems.length > 0 && (
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-500/10 to-emerald-500/10">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Annual Total</p>
                      <p className="text-3xl font-bold text-green-600">
                        {formatCurrency(calculations.grandTotalConverted, currencySymbol)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Monthly</p>
                      <p className="text-3xl font-bold">
                        {formatCurrency(calculations.monthlyEquivalent, currencySymbol)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

            {/* BOTTOM - GENERATORS */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Generators</CardTitle>
                <CardDescription>Create integration scope tables or use cases for proposals</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="scope">
                  <TabsList className="mb-4">
                    <TabsTrigger value="scope">Integration Scope</TabsTrigger>
                    <TabsTrigger value="usecases">Use Cases</TabsTrigger>
                  </TabsList>

                  <TabsContent value="scope" className="space-y-4">
                    <div>
                      <Label>Describe the Integration Requirements</Label>
                      <Textarea 
                        value={scopeInput}
                        onChange={(e) => setScopeInput(e.target.value)}
                        placeholder="Describe the solution briefly, e.g.:
• QR ordering for restaurants with menu database and payment integration
• CRM integration with Salesforce for customer lookup
• Voice AI with SIP trunk for call center automation
• WhatsApp channel with order tracking and delivery updates
• Support ticketing with Zendesk integration..."
                        rows={4}
                        className="mt-2"
                      />
                    </div>

                    <Button onClick={generateIntegrationScope} disabled={!scopeInput.trim()}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Scope
                    </Button>

                    {generatedScope && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Generated Integration Scope</Label>
                          <Button variant="outline" size="sm" onClick={copyScopeToClipboard}>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border">
                          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                            {generatedScope}
                          </pre>
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="usecases" className="space-y-4">
                    <div>
                      <Label>Describe the Context</Label>
                      <Textarea 
                        value={useCaseInput}
                        onChange={(e) => setUseCaseInput(e.target.value)}
                        placeholder="Describe the industry, business type, or context, e.g.:
• Restaurant chain with delivery and dine-in
• Bank customer support for retail banking
• Telecom provider with mobile and broadband
• Government citizen services portal
• Healthcare clinic appointment management..."
                        rows={4}
                        className="mt-2"
                      />
                    </div>

                    <Button onClick={generateUseCases} disabled={!useCaseInput.trim()}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Use Cases
                    </Button>

                    {generatedUseCases && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <Label>Generated Use Cases</Label>
                          <Button variant="outline" size="sm" onClick={copyUseCasesToClipboard}>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </Button>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg border">
                          <pre className="whitespace-pre-wrap text-sm font-sans leading-relaxed">
                            {generatedUseCases}
                          </pre>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pending Proposals Tab */}
          <TabsContent value="pending" className="mt-0">
            <PendingProposals />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default ProposalGenie;

