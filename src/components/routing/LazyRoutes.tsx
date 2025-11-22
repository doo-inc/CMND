
import { lazy } from 'react';

// Lazy load all pages for better performance
export { default as LazyIndex } from '@/pages/Index';
export const LazyAuth = lazy(() => import('@/pages/Auth'));
export const LazyCustomers = lazy(() => import('@/pages/Customers'));
export const LazyCustomerDetails = lazy(() => import('@/pages/CustomerDetails'));
export const LazyAddEditCustomer = lazy(() => import('@/pages/AddEditCustomer'));
export const LazyPartnerships = lazy(() => import('@/pages/Partnerships'));
export const LazyPartnershipDetails = lazy(() => import('@/pages/PartnershipDetails'));
export const LazyAddEditPartnership = lazy(() => import('@/pages/AddEditPartnership'));
export const LazySubscriptionTracker = lazy(() => import('@/pages/SubscriptionTracker'));
export const LazyPipelineMap = lazy(() => import('@/pages/PipelineMap'));
export const LazyNotifications = lazy(() => import('@/pages/Notifications'));
export const LazyTeamManagement = lazy(() => import('@/pages/TeamManagement'));
export const LazyTasksBoard = lazy(() => import('@/pages/TasksBoard'));
export const LazyLifecycle = lazy(() => import('@/pages/Lifecycle'));
export const LazyContracts = lazy(() => import('@/pages/Contracts'));
export const LazySettings = lazy(() => import('@/pages/Settings'));
export const LazyNotFound = lazy(() => import('@/pages/NotFound'));
export const LazyAcceptInvite = lazy(() => import('@/pages/AcceptInvite'));
export const LazyAnalyticsDetail = lazy(() => import('@/pages/AnalyticsDetail'));
export const LazyProjectManager = lazy(() => import('@/pages/ProjectManager'));
