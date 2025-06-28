
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Customers from "./pages/Customers";
import CustomerDetails from "./pages/CustomerDetails";
import AddEditCustomer from "./pages/AddEditCustomer";
import Partnerships from "./pages/Partnerships";
import PartnershipDetails from "./pages/PartnershipDetails";
import AddEditPartnership from "./pages/AddEditPartnership";
import PipelineMap from "./pages/PipelineMap";
import Notifications from "./pages/Notifications";
import TeamManagement from "./pages/TeamManagement";
import TasksBoard from "./pages/TasksBoard";
import NotFound from "./pages/NotFound";

// Create a client
const queryClient = new QueryClient();

const App = () => {
  return (
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/new" element={<AddEditCustomer />} />
              <Route path="/customers/:id/edit" element={<AddEditCustomer />} />
              <Route path="/customers/edit/:id" element={<AddEditCustomer />} />
              <Route path="/customers/:id" element={<CustomerDetails />} />
              <Route path="/partnerships" element={<Partnerships />} />
              <Route path="/partnerships/new" element={<AddEditPartnership />} />
              <Route path="/partnerships/:id" element={<PartnershipDetails />} />
              <Route path="/partnerships/:id/edit" element={<AddEditPartnership />} />
              <Route path="/pipeline" element={<PipelineMap />} />
              <Route path="/tasks" element={<TasksBoard />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/team" element={<TeamManagement />} />
              {/* Redirect the old routes to customers */}
              <Route path="/lifecycle" element={<Navigate to="/customers" replace />} />
              <Route path="/contracts" element={<Navigate to="/customers" replace />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
};

export default App;
