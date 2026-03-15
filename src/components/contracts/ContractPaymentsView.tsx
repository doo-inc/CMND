import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/contractUtils";
import {
  Upload,
  FileText,
  Check,
  Clock,
  AlertTriangle,
  Paperclip,
  ExternalLink,
  Pencil,
  X,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  CircleDashed,
  ChevronRight,
  Receipt,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ActiveContract {
  id: string;
  customerName: string;
  contractNumber: string;
  contractType: string;
  startDate: string;
  endDate: string;
  setupFee: number;
  annualRate: number;
  paymentFrequency: "annual" | "quarterly" | "semi-annual" | "monthly" | "one-time";
  value: number;
  terms: string | null;
}

interface ScheduledPayment {
  id: string;
  type: "setup_fee" | "recurring";
  label: string;
  amount: number;
  dueDate: string;
  periodIndex: number;
}

interface PaymentRecord {
  isPaid: boolean;
  paidDate?: string;
  invoiceUrl?: string;
  invoiceName?: string;
  dueDateOverride?: string;
}

type PaymentRecords = Record<string, PaymentRecord>;

// ─── Data helpers ────────────────────────────────────────────────────────────

function parsePaymentRecords(terms: string | null): PaymentRecords {
  if (!terms) return {};
  try {
    const parsed = JSON.parse(terms);
    return parsed?.payment_records || {};
  } catch {
    return {};
  }
}

function serializePaymentRecords(records: PaymentRecords): string {
  return JSON.stringify({ payment_records: records });
}

function computePaymentSchedule(contract: ActiveContract): ScheduledPayment[] {
  const payments: ScheduledPayment[] = [];
  if (!contract.startDate || contract.startDate === "-") return payments;

  const startDate = new Date(contract.startDate + "T00:00:00");
  const endDate =
    contract.endDate && contract.endDate !== "-"
      ? new Date(contract.endDate + "T00:00:00")
      : new Date(
          startDate.getFullYear() + 1,
          startDate.getMonth(),
          startDate.getDate()
        );

  if (contract.setupFee > 0) {
    payments.push({
      id: `setup`,
      type: "setup_fee",
      label: "Setup Fee",
      amount: contract.setupFee,
      dueDate: contract.startDate,
      periodIndex: 0,
    });
  }

  const annualRate = contract.annualRate;
  if (annualRate <= 0) return payments;

  // Annual & one-time: single upfront payment at start (alongside setup)
  if (
    contract.paymentFrequency === "annual" ||
    contract.paymentFrequency === "one-time"
  ) {
    payments.push({
      id: `p1`,
      type: "recurring",
      label:
        contract.paymentFrequency === "one-time"
          ? "One-time Payment"
          : "Annual Fee",
      amount: annualRate,
      dueDate: contract.startDate,
      periodIndex: 1,
    });
    return payments;
  }

  // Monthly: 12 payments per year, one each month from start date
  if (contract.paymentFrequency === "monthly") {
    const amountPerPayment = Math.round((annualRate / 12) * 100) / 100;
    let paymentDate = new Date(startDate);
    let idx = 1;

    while (paymentDate <= endDate) {
      payments.push({
        id: `p${idx}`,
        type: "recurring",
        label: `${paymentDate.toLocaleString("default", { month: "short" })} ${paymentDate.getFullYear()}`,
        amount: amountPerPayment,
        dueDate: paymentDate.toISOString().split("T")[0],
        periodIndex: idx,
      });
      paymentDate = new Date(paymentDate);
      paymentDate.setMonth(paymentDate.getMonth() + 1);
      idx++;
    }
    return payments;
  }

  // Semi-annual: exactly 2 payments, 6 months apart (first at start)
  if (contract.paymentFrequency === "semi-annual") {
    const half = Math.round((annualRate / 2) * 100) / 100;
    payments.push({
      id: `p1`,
      type: "recurring",
      label: "Semi-annual (1 of 2)",
      amount: half,
      dueDate: contract.startDate,
      periodIndex: 1,
    });
    const secondDate = new Date(startDate);
    secondDate.setMonth(secondDate.getMonth() + 6);
    payments.push({
      id: `p2`,
      type: "recurring",
      label: "Semi-annual (2 of 2)",
      amount: half,
      dueDate: secondDate.toISOString().split("T")[0],
      periodIndex: 2,
    });
    return payments;
  }

  // Quarterly: 4 payments per year, first at start, then every 3 months
  const monthsPerPeriod = 3;
  const amountPerPayment =
    Math.round((annualRate / 4) * 100) / 100;
  let paymentDate = new Date(startDate);
  let idx = 1;

  while (paymentDate <= endDate) {
    const q = Math.ceil((paymentDate.getMonth() + 1) / 3);
    payments.push({
      id: `p${idx}`,
      type: "recurring",
      label: `Q${q} ${paymentDate.getFullYear()}`,
      amount: amountPerPayment,
      dueDate: paymentDate.toISOString().split("T")[0],
      periodIndex: idx,
    });

    paymentDate = new Date(paymentDate);
    paymentDate.setMonth(paymentDate.getMonth() + monthsPerPeriod);
    idx++;
  }

  return payments;
}

function formatDate(dateStr: string): string {
  if (!dateStr || dateStr === "-") return "-";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(dateStr: string): boolean {
  if (!dateStr || dateStr === "-") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr + "T00:00:00") < today;
}

function frequencyLabel(freq: string): string {
  switch (freq) {
    case "quarterly":
      return "Quarterly";
    case "semi-annual":
      return "Semi-Annual";
    case "monthly":
      return "Monthly";
    case "annual":
      return "Annual";
    case "one-time":
      return "One-Time";
    default:
      return freq;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function ContractPaymentsView() {
  const [contracts, setContracts] = useState<ActiveContract[]>([]);
  const [paymentData, setPaymentData] = useState<Map<string, PaymentRecords>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [editingDate, setEditingDate] = useState<{
    contractId: string;
    paymentId: string;
  } | null>(null);
  const [editDateValue, setEditDateValue] = useState("");
  const fileInputRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  const fetchActiveContracts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("contracts")
        .select("*, customers (name)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: ActiveContract[] = (data || []).map((c: any) => ({
        id: c.id,
        customerName: c.customers?.name || "Unknown",
        contractNumber: c.contract_number || "",
        contractType: c.name || "Service Agreement",
        startDate: c.start_date
          ? new Date(c.start_date).toISOString().split("T")[0]
          : "-",
        endDate: c.end_date
          ? new Date(c.end_date).toISOString().split("T")[0]
          : "-",
        setupFee: c.setup_fee || 0,
        annualRate: c.annual_rate || 0,
        paymentFrequency: c.payment_frequency || "annual",
        value: c.value || 0,
        terms: c.terms || null,
      }));

      setContracts(mapped);

      const records = new Map<string, PaymentRecords>();
      mapped.forEach((c) => {
        records.set(c.id, parsePaymentRecords(c.terms));
      });
      setPaymentData(records);
    } catch (err) {
      console.error("Error fetching contracts:", err);
      toast.error("Failed to load contracts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveContracts();
  }, [fetchActiveContracts]);

  const savePaymentRecords = async (
    contractId: string,
    records: PaymentRecords
  ) => {
    setSavingIds((prev) => new Set(prev).add(contractId));
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ terms: serializePaymentRecords(records) } as any)
        .eq("id", contractId);

      if (error) throw error;

      setPaymentData((prev) => {
        const next = new Map(prev);
        next.set(contractId, records);
        return next;
      });
    } catch (err) {
      console.error("Error saving payment:", err);
      toast.error("Failed to save payment status");
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(contractId);
        return next;
      });
    }
  };

  const togglePayment = (contractId: string, paymentId: string) => {
    const records = { ...(paymentData.get(contractId) || {}) };
    const current = records[paymentId] || { isPaid: false };
    const nowPaid = !current.isPaid;
    records[paymentId] = {
      ...current,
      isPaid: nowPaid,
      paidDate: nowPaid ? new Date().toISOString().split("T")[0] : undefined,
    };
    savePaymentRecords(contractId, records);
    if (nowPaid) {
      toast.success("Payment marked as collected");
    }
  };

  const startEditDate = (contractId: string, paymentId: string, currentDate: string) => {
    setEditingDate({ contractId, paymentId });
    setEditDateValue(currentDate);
  };

  const saveEditDate = () => {
    if (!editingDate) return;
    const { contractId, paymentId } = editingDate;
    const records = { ...(paymentData.get(contractId) || {}) };
    const current = records[paymentId] || { isPaid: false };
    records[paymentId] = { ...current, dueDateOverride: editDateValue };
    savePaymentRecords(contractId, records);
    setEditingDate(null);
    toast.success("Due date updated");
  };

  const cancelEditDate = () => {
    setEditingDate(null);
  };

  const handleInvoiceUpload = async (
    contractId: string,
    paymentId: string,
    file: File
  ) => {
    try {
      const filePath = `invoices/${contractId}/${paymentId}-${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("invoices")
        .upload(filePath, file, { upsert: true });

      let invoiceUrl: string | undefined;
      if (!uploadError) {
        const {
          data: { publicUrl },
        } = supabase.storage.from("invoices").getPublicUrl(filePath);
        invoiceUrl = publicUrl;
      }

      const records = { ...(paymentData.get(contractId) || {}) };
      const current = records[paymentId] || { isPaid: false };
      records[paymentId] = {
        ...current,
        invoiceUrl: invoiceUrl || undefined,
        invoiceName: file.name,
      };
      savePaymentRecords(contractId, records);
      toast.success(`Invoice "${file.name}" attached`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload invoice");
    }
  };

  const removeInvoice = (contractId: string, paymentId: string) => {
    const records = { ...(paymentData.get(contractId) || {}) };
    const current = records[paymentId] || { isPaid: false };
    records[paymentId] = {
      ...current,
      invoiceUrl: undefined,
      invoiceName: undefined,
    };
    savePaymentRecords(contractId, records);
    toast.success("Invoice removed");
  };

  // ─── Derived data ──────────────────────────────────────────────────────────

  const contractSchedules = useMemo(() => {
    const map = new Map<string, ScheduledPayment[]>();
    contracts.forEach((c) => {
      map.set(c.id, computePaymentSchedule(c));
    });
    return map;
  }, [contracts]);

  const summaryStats = useMemo(() => {
    let totalDue = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let paidCount = 0;
    let totalCount = 0;

    contracts.forEach((contract) => {
      const schedule = contractSchedules.get(contract.id) || [];
      const records = paymentData.get(contract.id) || {};
      schedule.forEach((p) => {
        totalDue += p.amount;
        totalCount++;
        if (records[p.id]?.isPaid) {
          totalCollected += p.amount;
          paidCount++;
        } else {
          totalOutstanding += p.amount;
        }
      });
    });

    return { totalDue, totalCollected, totalOutstanding, paidCount, totalCount };
  }, [contracts, contractSchedules, paymentData]);

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
        <Receipt className="h-14 w-14 mb-4 opacity-20" />
        <p className="text-lg font-medium">No active contracts</p>
        <p className="text-sm mt-1">
          Active contracts will appear here with their payment schedules.
        </p>
      </div>
    );
  }

  const { totalDue, totalCollected, totalOutstanding, paidCount, totalCount } =
    summaryStats;
  const collectionProgress =
    totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="glass-card p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Due</p>
              <h3 className="text-2xl font-bold">
                {formatCurrency(totalDue)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-slate-600" />
            </div>
          </div>
        </Card>
        <Card className="glass-card p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Collected</p>
              <h3 className="text-2xl font-bold text-green-600">
                {formatCurrency(totalCollected)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </Card>
        <Card className="glass-card p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Outstanding</p>
              <h3 className="text-2xl font-bold text-amber-600">
                {formatCurrency(totalOutstanding)}
              </h3>
            </div>
            <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        </Card>
        <Card className="glass-card p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Progress</p>
              <h3 className="text-2xl font-bold">
                {paidCount}/{totalCount}
              </h3>
              <Progress
                value={collectionProgress}
                className="h-1.5 mt-1.5 w-24"
              />
            </div>
            <div className="h-10 w-10 rounded-full bg-doo-purple-100 flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-doo-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Contract Payment Checklists */}
      <Accordion
        type="multiple"
        defaultValue={[]}
        className="space-y-3"
      >
        {contracts.map((contract) => {
          const schedule = contractSchedules.get(contract.id) || [];
          const records = paymentData.get(contract.id) || {};
          const paid = schedule.filter((p) => records[p.id]?.isPaid).length;
          const progress =
            schedule.length > 0
              ? Math.round((paid / schedule.length) * 100)
              : 0;
          const isSaving = savingIds.has(contract.id);

          return (
            <AccordionItem
              key={contract.id}
              value={contract.id}
              className="border rounded-xl overflow-hidden bg-card shadow-sm"
            >
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30">
                <div className="flex items-center justify-between w-full pr-2">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-doo-purple-100 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4 text-doo-purple-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-base">
                        {contract.customerName}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                        {contract.contractNumber && (
                          <>
                            <span className="font-mono">#{contract.contractNumber}</span>
                            <span>·</span>
                          </>
                        )}
                        <span>{contract.contractType}</span>
                        <span>·</span>
                        <Badge
                          variant="outline"
                          className="text-[10px] h-4 px-1.5"
                        >
                          {frequencyLabel(contract.paymentFrequency)}
                        </Badge>
                        <span>·</span>
                        <span>{formatCurrency(contract.value)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {isSaving && (
                      <span className="text-xs text-muted-foreground animate-pulse">
                        Saving...
                      </span>
                    )}
                    <div className="flex items-center gap-2 min-w-[120px]">
                      <Progress value={progress} className="h-2 w-16" />
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {paid}/{schedule.length}
                      </span>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-0 pb-0">
                {schedule.length === 0 ? (
                  <div className="px-5 py-6 text-center text-sm text-muted-foreground">
                    <CircleDashed className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    No payments configured. Add setup fee or annual rate to
                    generate schedule.
                  </div>
                ) : (
                  <div className="divide-y">
                    {/* Table header */}
                    <div className="grid grid-cols-[40px_1fr_120px_140px_140px_80px] items-center px-5 py-2 bg-muted/40 text-xs font-medium text-muted-foreground">
                      <div></div>
                      <div>Payment</div>
                      <div>Amount</div>
                      <div>Due Date</div>
                      <div>Invoice</div>
                      <div>Status</div>
                    </div>

                    {schedule.map((payment) => {
                      const record: PaymentRecord = records[payment.id] || { isPaid: false };
                      const effectiveDate =
                        record.dueDateOverride || payment.dueDate;
                      const overdue =
                        !record.isPaid && isOverdue(effectiveDate);
                      const isEditingThis =
                        editingDate?.contractId === contract.id &&
                        editingDate?.paymentId === payment.id;
                      const refKey = `${contract.id}-${payment.id}`;

                      return (
                        <div
                          key={payment.id}
                          className={`grid grid-cols-[40px_1fr_120px_140px_140px_80px] items-center px-5 py-3 transition-colors ${
                            record.isPaid
                              ? "bg-green-50/50 dark:bg-green-950/10"
                              : overdue
                                ? "bg-red-50/50 dark:bg-red-950/10"
                                : "hover:bg-muted/20"
                          }`}
                        >
                          {/* Checkbox */}
                          <div>
                            <Checkbox
                              checked={record.isPaid || false}
                              onCheckedChange={() =>
                                togglePayment(contract.id, payment.id)
                              }
                              className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                            />
                          </div>

                          {/* Label */}
                          <div className="flex items-center gap-2">
                            {payment.type === "setup_fee" ? (
                              <DollarSign className="h-3.5 w-3.5 text-doo-purple-500 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            )}
                            <span
                              className={`text-sm ${
                                record.isPaid
                                  ? "line-through text-muted-foreground"
                                  : "font-medium"
                              }`}
                            >
                              {payment.label}
                            </span>
                            {payment.type === "setup_fee" && (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-4 px-1.5 bg-doo-purple-50 text-doo-purple-600 border-doo-purple-200"
                              >
                                Setup
                              </Badge>
                            )}
                          </div>

                          {/* Amount */}
                          <div
                            className={`text-sm font-mono ${
                              record.isPaid ? "text-muted-foreground" : ""
                            }`}
                          >
                            {formatCurrency(payment.amount)}
                          </div>

                          {/* Due Date */}
                          <div className="flex items-center gap-1">
                            {isEditingThis ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="date"
                                  value={editDateValue}
                                  onChange={(e) =>
                                    setEditDateValue(e.target.value)
                                  }
                                  className="h-7 text-xs w-[120px]"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") saveEditDate();
                                    if (e.key === "Escape") cancelEditDate();
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={saveEditDate}
                                >
                                  <Check className="h-3 w-3 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={cancelEditDate}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span
                                  className={`text-sm ${
                                    overdue
                                      ? "text-red-600 font-medium"
                                      : record.isPaid
                                        ? "text-muted-foreground"
                                        : ""
                                  }`}
                                >
                                  {formatDate(effectiveDate)}
                                </span>
                                {!record.isPaid && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                                    onClick={() =>
                                      startEditDate(
                                        contract.id,
                                        payment.id,
                                        effectiveDate
                                      )
                                    }
                                    title="Edit due date"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>

                          {/* Invoice */}
                          <div className="flex items-center gap-1">
                            {record.invoiceName ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 gap-1 text-xs"
                                  >
                                    <Paperclip className="h-3 w-3" />
                                    <span className="max-w-[80px] truncate">
                                      {record.invoiceName}
                                    </span>
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent
                                  className="w-52 p-3 space-y-2"
                                  align="start"
                                >
                                  <p className="text-xs font-medium truncate">
                                    {record.invoiceName}
                                  </p>
                                  <div className="flex gap-2">
                                    {record.invoiceUrl && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs gap-1 flex-1"
                                        onClick={() =>
                                          window.open(
                                            record.invoiceUrl,
                                            "_blank"
                                          )
                                        }
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        View
                                      </Button>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs gap-1 text-red-600 hover:text-red-700 flex-1"
                                      onClick={() =>
                                        removeInvoice(
                                          contract.id,
                                          payment.id
                                        )
                                      }
                                    >
                                      <X className="h-3 w-3" />
                                      Remove
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            ) : (
                              <>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                  ref={(el) => {
                                    if (el) fileInputRefs.current.set(refKey, el);
                                  }}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleInvoiceUpload(
                                        contract.id,
                                        payment.id,
                                        file
                                      );
                                    }
                                    e.target.value = "";
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
                                  onClick={() =>
                                    fileInputRefs.current.get(refKey)?.click()
                                  }
                                >
                                  <Upload className="h-3 w-3" />
                                  Attach
                                </Button>
                              </>
                            )}
                          </div>

                          {/* Status */}
                          <div>
                            {record.isPaid ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 text-[10px] h-5 px-1.5 gap-0.5">
                                <Check className="h-2.5 w-2.5" />
                                Paid
                              </Badge>
                            ) : overdue ? (
                              <Badge className="bg-red-100 text-red-700 border-red-200 text-[10px] h-5 px-1.5 gap-0.5">
                                <AlertTriangle className="h-2.5 w-2.5" />
                                Overdue
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] h-5 px-1.5 gap-0.5"
                              >
                                <Clock className="h-2.5 w-2.5" />
                                Due
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* Contract summary row */}
                    <div className="px-5 py-3 bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {contract.startDate !== "-" &&
                          `${formatDate(contract.startDate)} → ${formatDate(contract.endDate)}`}
                      </span>
                      <div className="flex items-center gap-4">
                        <span>
                          Collected:{" "}
                          <span className="font-medium text-green-600">
                            {formatCurrency(
                              schedule
                                .filter((p) => records[p.id]?.isPaid)
                                .reduce((s, p) => s + p.amount, 0)
                            )}
                          </span>
                        </span>
                        <span>
                          Remaining:{" "}
                          <span className="font-medium text-amber-600">
                            {formatCurrency(
                              schedule
                                .filter((p) => !records[p.id]?.isPaid)
                                .reduce((s, p) => s + p.amount, 0)
                            )}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
