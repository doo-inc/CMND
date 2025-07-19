
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Customers from "./pages/Customers";
import CustomerDetails from "./pages/CustomerDetails";
import AddEditCustomer from "./pages/AddEditCustomer";
import Partnerships from "./pages/Partnerships";
import PartnershipDetails from "./pages/PartnershipDetails";
import AddEditPartnership from "./pages/AddEditPartnership";
import SubscriptionTracker from "./pages/SubscriptionTracker";
import PipelineMap from "./pages/PipelineMap";
import Notifications from "./pages/Notifications";
import TeamManagement from "./pages/TeamManagement";
import TasksBoard from "./pages/TasksBoard";
import Lifecycle from "./pages/Lifecycle";
import Contracts from "./pages/Contracts";
import NotFound from "./pages/NotFound";

// Create a client
const queryClient = new QueryClient();

const App = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public route */}
                <Route path="/auth" element={<Auth />} />
                
                {/* Protected routes */}
                <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                <Route path="/customers/new" element={<ProtectedRoute><AddEditCustomer /></ProtectedRoute>} />
                <Route path="/customers/:id/edit" element={<ProtectedRoute><AddEditCustomer /></ProtectedRoute>} />
                <Route path="/customers/edit/:id" element={<ProtectedRoute><AddEditCustomer /></ProtectedRoute>} />
                <Route path="/customers/:id" element={<ProtectedRoute><CustomerDetails /></ProtectedRoute>} />
                <Route path="/partnerships" element={<ProtectedRoute><Partnerships /></ProtectedRoute>} />
                <Route path="/partnerships/new" element={<ProtectedRoute><AddEditPartnership /></ProtectedRoute>} />
                <Route path="/partnerships/:id" element={<ProtectedRoute><PartnershipDetails /></ProtectedRoute>} />
                <Route path="/partnerships/:id/edit" element={<ProtectedRoute><AddEditPartnership /></ProtectedRoute>} />
                <Route path="/subscription-tracker" element={<ProtectedRoute><SubscriptionTracker /></ProtectedRoute>} />
                <Route path="/pipeline" element={<ProtectedRoute><PipelineMap /></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><TasksBoard /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
                <Route path="/team" element={<ProtectedRoute><TeamManagement /></ProtectedRoute>} />
                <Route path="/lifecycle" element={<ProtectedRoute><Lifecycle /></ProtectedRoute>} />
                <Route path="/contracts" element={<ProtectedRoute><Contracts /></ProtectedRoute>} />
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
