
import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import {
  LazyIndex,
  LazyAuth,
  LazyCustomers,
  LazyCustomerDetails,
  LazyAddEditCustomer,
  LazyPartnerships,
  LazyPartnershipDetails,
  LazyAddEditPartnership,
  LazySubscriptionTracker,
  LazyPipelineMap,
  LazyNotifications,
  LazyTeamManagement,
  LazyTasksBoard,
  LazyLifecycle,
  LazyContracts,
  LazySettings,
  LazyNotFound,
  LazyAcceptInvite,
  LazyAnalyticsDetail,
  LazyProjectManager,
} from "@/components/routing/LazyRoutes";

// Create a client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Loading component for Suspense
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const App = () => {
  // Add debug logging
  console.log('App component rendering');
  console.log('Current pathname:', window.location.pathname);

  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Public routes - these should come first to ensure they're matched */}
                  <Route path="/auth" element={<LazyAuth />} />
                  <Route path="/accept-invite" element={<LazyAcceptInvite />} />
                  
                  {/* Protected routes */}
                  <Route path="/" element={<ProtectedRoute><LazyIndex /></ProtectedRoute>} />
                  <Route path="/customers" element={<ProtectedRoute><LazyCustomers /></ProtectedRoute>} />
                  <Route path="/customers/new" element={<ProtectedRoute><LazyAddEditCustomer /></ProtectedRoute>} />
                  <Route path="/customers/:id/edit" element={<ProtectedRoute><LazyAddEditCustomer /></ProtectedRoute>} />
                  <Route path="/customers/edit/:id" element={<ProtectedRoute><LazyAddEditCustomer /></ProtectedRoute>} />
                  <Route path="/customers/:id" element={<ProtectedRoute><LazyCustomerDetails /></ProtectedRoute>} />
                  <Route path="/partnerships" element={<ProtectedRoute><LazyPartnerships /></ProtectedRoute>} />
                  <Route path="/partnerships/new" element={<ProtectedRoute><LazyAddEditPartnership /></ProtectedRoute>} />
                  <Route path="/partnerships/:id" element={<ProtectedRoute><LazyPartnershipDetails /></ProtectedRoute>} />
                  <Route path="/partnerships/:id/edit" element={<ProtectedRoute><LazyAddEditPartnership /></ProtectedRoute>} />
                  <Route path="/subscription-tracker" element={<ProtectedRoute><LazySubscriptionTracker /></ProtectedRoute>} />
                  <Route path="/pipeline" element={<ProtectedRoute><LazyPipelineMap /></ProtectedRoute>} />
                  <Route path="/project-manager" element={<ProtectedRoute><LazyProjectManager /></ProtectedRoute>} />
                  <Route path="/tasks" element={<ProtectedRoute><LazyTasksBoard /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><LazyNotifications /></ProtectedRoute>} />
                  <Route path="/team" element={<ProtectedRoute><LazyTeamManagement /></ProtectedRoute>} />
                  <Route path="/lifecycle" element={<ProtectedRoute><LazyLifecycle /></ProtectedRoute>} />
                  <Route path="/lifecycle/:customerId" element={<ProtectedRoute><LazyLifecycle /></ProtectedRoute>} />
  <Route path="/contracts" element={<ProtectedRoute><LazyContracts /></ProtectedRoute>} />
  <Route path="/settings" element={<ProtectedRoute><LazySettings /></ProtectedRoute>} />
                  <Route path="/analytics/:metric" element={<ProtectedRoute><LazyAnalyticsDetail /></ProtectedRoute>} />
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<LazyNotFound />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
