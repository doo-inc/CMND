import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { 
  getCustomerPayments, 
  getPaymentSummary, 
  markPaymentAsPaid, 
  formatCurrency, 
  getPaymentStatusColor,
  Payment 
} from "@/utils/paymentUtils";
import { toast } from "sonner";
import { format } from "date-fns";

interface CustomerPaymentsProps {
  customerId: string;
}

export const CustomerPayments: React.FC<CustomerPaymentsProps> = ({ customerId }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState({
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
    nextPaymentDue: null as Payment | null,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");

  useEffect(() => {
    loadPaymentData();
  }, [customerId]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      const [paymentsData, summaryData] = await Promise.all([
        getCustomerPayments(customerId),
        getPaymentSummary(customerId)
      ]);
      
      setPayments(paymentsData);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error('Failed to load payment data');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (paymentId: string) => {
    try {
      await markPaymentAsPaid(paymentId);
      toast.success('Payment marked as paid');
      loadPaymentData(); // Refresh data
    } catch (error) {
      console.error('Error marking payment as paid:', error);
      toast.error('Failed to mark payment as paid');
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (filter === "all") return true;
    return payment.status === filter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-8 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Paid</p>
                <p className="text-2xl font-bold text-success">{formatCurrency(summary.totalPaid)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning">{formatCurrency(summary.totalPending)}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Overdue</p>
                <p className="text-2xl font-bold text-destructive">{formatCurrency(summary.totalOverdue)}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Next Payment</p>
                <p className="text-lg font-bold">
                  {summary.nextPaymentDue 
                    ? format(new Date(summary.nextPaymentDue.due_date), 'MMM dd, yyyy')
                    : 'None'
                  }
                </p>
              </div>
              <Calendar className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Filters */}
      <div className="flex gap-2">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
        >
          All Payments
        </Button>
        <Button
          variant={filter === "pending" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("pending")}
        >
          Pending
        </Button>
        <Button
          variant={filter === "paid" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("paid")}
        >
          Paid
        </Button>
        <Button
          variant={filter === "overdue" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("overdue")}
        >
          Overdue
        </Button>
      </div>

      {/* Payment List */}
      <div className="space-y-4">
        {filteredPayments.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No payments found for this filter.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredPayments.map((payment) => (
            <Card key={payment.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {getStatusIcon(payment.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{formatCurrency(payment.amount)}</h4>
                        <Badge variant={getPaymentStatusColor(payment.status) as any}>
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </Badge>
                        <Badge variant="outline">
                          {payment.payment_type === 'setup' ? 'Setup Fee' : 'Recurring'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span>Due: {format(new Date(payment.due_date), 'MMM dd, yyyy')}</span>
                        {payment.payment_date && (
                          <span>Paid: {format(new Date(payment.payment_date), 'MMM dd, yyyy')}</span>
                        )}
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{payment.notes}</p>
                      )}
                    </div>
                  </div>
                  
                  {payment.status === 'pending' && (
                    <Button
                      onClick={() => handleMarkAsPaid(payment.id)}
                      size="sm"
                      variant="outline"
                    >
                      Mark as Paid
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};