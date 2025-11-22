import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { decodeFiltersFromQueryString, FilterParams } from "@/utils/filterUtils";
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
  const [searchParams] = useSearchParams();
  const [title, setTitle] = useState("");
  const [filterParams, setFilterParams] = useState<FilterParams>({});

  useEffect(() => {
    // Parse filters from URL
    const filters = decodeFiltersFromQueryString(searchParams);
    setFilterParams(filters);
  }, [searchParams]);

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
    const { countries, dateFrom, dateTo } = filterParams;
    
    switch (metric) {
      case "total-revenue":
        return <TotalRevenueDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "total-arr":
        return <TotalARRDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "live-customers":
        return <LiveCustomersDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "total-customers":
        return <TotalCustomersDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "total-contracts":
        return <TotalContractsDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "deals-pipeline":
        return <DealsPipelineDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "conversion-rate":
        return <ConversionRateDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "average-deal-size":
        return <AverageDealSizeDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "mrr":
        return <MRRDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "deals-at-risk":
        return <DealsAtRiskDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "churn-rate":
        return <ChurnRateDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "pitch-to-pay":
        return <PitchToPayDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
      case "customers-at-risk":
        return <CustomersAtRiskDetail countries={countries} dateFrom={dateFrom} dateTo={dateTo} />;
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