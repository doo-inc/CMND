import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TotalRevenueDetail } from "@/components/analytics/TotalRevenueDetail";
import { TotalARRDetail } from "@/components/analytics/TotalARRDetail";
import { LiveCustomersDetail } from "@/components/analytics/LiveCustomersDetail";
import { TotalCustomersDetail } from "@/components/analytics/TotalCustomersDetail";
import { TotalContractsDetail } from "@/components/analytics/TotalContractsDetail";
import { DealsPipelineDetail } from "@/components/analytics/DealsPipelineDetail";
import { ConversionRateDetail } from "@/components/analytics/ConversionRateDetail";
import { AverageDealSizeDetail } from "@/components/analytics/AverageDealSizeDetail";
import { MRRDetail } from "@/components/analytics/MRRDetail";
import { DealsAtRiskDetail } from "@/components/analytics/DealsAtRiskDetail";
import { ChurnRateDetail } from "@/components/analytics/ChurnRateDetail";
import { PitchToPayDetail } from "@/components/analytics/PitchToPayDetail";
import { CustomersAtRiskDetail } from "@/components/analytics/CustomersAtRiskDetail";

const AnalyticsDetail = () => {
  const { metric } = useParams<{ metric: string }>();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");

  useEffect(() => {
    const titles: Record<string, string> = {
      "total-revenue": "Total Revenue Details",
      "total-arr": "Total ARR Details",
      "live-customers": "Live Customers Details",
      "total-customers": "Total Customers Details",
      "total-contracts": "Total Contracts Details",
      "deals-pipeline": "Deals Pipeline Details",
      "conversion-rate": "Conversion Rate Details",
      "average-deal-size": "Average Deal Size Details",
      "mrr": "Monthly Recurring Revenue Details",
      "deals-at-risk": "Deals at Risk Details",
      "churn-rate": "Churn Rate Details",
      "pitch-to-pay": "Pitch to Pay Details",
      "customers-at-risk": "Customers At Risk Details"
    };
    setTitle(titles[metric || ""] || "Analytics Details");
  }, [metric]);

  const renderDetailComponent = () => {
    switch (metric) {
      case "total-revenue":
        return <TotalRevenueDetail />;
      case "total-arr":
        return <TotalARRDetail />;
      case "live-customers":
        return <LiveCustomersDetail />;
      case "total-customers":
        return <TotalCustomersDetail />;
      case "total-contracts":
        return <TotalContractsDetail />;
      case "deals-pipeline":
        return <DealsPipelineDetail />;
      case "conversion-rate":
        return <ConversionRateDetail />;
      case "average-deal-size":
        return <AverageDealSizeDetail />;
      case "mrr":
        return <MRRDetail />;
      case "deals-at-risk":
        return <DealsAtRiskDetail />;
      case "churn-rate":
        return <ChurnRateDetail />;
      case "pitch-to-pay":
        return <PitchToPayDetail />;
      case "customers-at-risk":
        return <CustomersAtRiskDetail />;
      default:
        return (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Analytics detail not found</p>
          </div>
        );
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
        </div>

        {renderDetailComponent()}
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsDetail;