import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
// ─── Layouts & Route Guards ─────────────────────────────────────────────────
import User from "../Layout/User";
import AdminRoutes from "./AdminRoutes";
import PrivateRoutes from "./PrivateRoutes";
// ─── Authentication & Public Pages (Keep synchronous for fast initial load) ────────────────────────────────────────────
import Login from "../pages/Login";
import Register from "../pages/Register";
import ResetPassword from "../pages/ResetPassword";
import NotFound from "../pages/404NotFound";
import Forbidden from "../pages/403Forbidden";
// ─── Onboarding & Utilities (Keep small utilities synchronous) ────────────────────────────────────────────────────
import RootRedirect from "../pages/RootRedirect";
import NavBarPreview from "../pages/NavBarPreview";
import IconGallery from "../pages/IconGallery";

// ─── Lazy Load Heavy Components ─────────────────────────────────────────────────
const Profile = lazy(() => import("../pages/Profile"));
const CompanyChoice = lazy(() => import("../pages/CompanyChoice"));
const CompanyProfile = lazy(() => import("../pages/CompanyProfile"));
const Templates = lazy(() => import("../pages/Templates"));
const JobBoard = lazy(() => import("../pages/JobBoard"));
const AllClientsTable = lazy(() => import("../pages/AllClientsTable"));
const AllProjects = lazy(() => import("../pages/AllProjects"));
const UnifiedProjectsView = lazy(() => import("../pages/UnifiedProjectsView"));
const AddNewProjects = lazy(() => import("../pages/AddNewProjects"));
const AssignedProjects = lazy(() => import("../pages/AssignedProjects"));
const ProjectsView = lazy(() => import("../pages/ProjectsView"));
const ProjectNoAccess = lazy(() => import("../pages/ProjectNoAccess"));
const ReadOnlyProjectView = lazy(() => import("../pages/ReadOnlyProjectView"));
const UserManagement = lazy(() => import("../pages/UserManagement"));
const LiveFolderSyncTest = lazy(() => import("../pages/LiveFolderSyncTest"));
const Invoices = lazy(() => import("../pages/InvoiceFeed"));
const Invoicing = lazy(() => import("../pages/Invoicing"));
const QuickInvoiceCreator = lazy(() => import("../components/QuickInvoiceCreator"));

// ─── DEV - Project Dashboard (New Feature) ─────────────────────────────────────
const ProjectDashboard = lazy(() => import("../appprojectdash"));
const ProjectSelector = lazy(() => import("../appprojectdash/components/ProjectSelector").then(module => ({ default: module.ProjectSelector })));

// ─── File Management & Recycle Bin ────────────────────────────────────────────
const RecycleBinPage = lazy(() => import("../pages/RecycleBinPage"));

// ─── Legal & Policy Pages ──────────────────────────────────────────────────────
const TermsOfServicePage = lazy(() => import("../pages/TermsOfServicePage"));
const PrivacyPolicyPage = lazy(() => import("../pages/PrivacyPolicyPage"));

// ─── QuickBooks Integration ────────────────────────────────────────────────────
const QuickBooksCallback = lazy(() => import("../pages/QuickBooksCallbackPage"));
const QuickBooksSettings = lazy(() => import("../pages/QuickBooksSettings"));

// ─── Loading Component ─────────────────────────────────────────────────────────
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
  </div>
);

// ─── Suspense Wrapper ─────────────────────────────────────────────────────────
const withSuspense = (Component) => (props) => (
  <Suspense fallback={<LoadingSpinner />}>
    <Component {...props} />
  </Suspense>
);

export const router = createBrowserRouter([
  {
    path: "/",
    element: <User />,
    handle: { title: "Home" },
    children: [
      // ─── Onboarding & Utilities ────────────────────────────────────────────────
      {
        path: "/",
        element: (
          <PrivateRoutes>
            <RootRedirect />
          </PrivateRoutes>
        ),
        handle: { title: "Redirect" },
      },
      {
        path: "/icons",
        element: (
          <PrivateRoutes>
            <IconGallery />
          </PrivateRoutes>
        ),
        handle: { title: "Icon Gallery" },
      },

      // ─── Authentication & Access Control ───────────────────────────────────────
      {
        path: "/forbidden",
        element: (
          <PrivateRoutes>
            <Forbidden />
          </PrivateRoutes>
        ),
        handle: { title: "Forbidden" },
      },

      // ─── User-Scoped Pages ─────────────────────────────────────────────────────
      {
        path: "/profile",
        element: (
          <PrivateRoutes>
            {withSuspense(Profile)()}
          </PrivateRoutes>
        ),
        handle: { title: "Profile" },
      },
      {
        path: "/company-choice",
        element: (
          <PrivateRoutes>
            {withSuspense(CompanyChoice)()}
          </PrivateRoutes>
        ),
        handle: { title: "Choose Company" },
      },
      {
        path: "/company-profile",
        element: (
          <PrivateRoutes>
            {withSuspense(CompanyProfile)()}
          </PrivateRoutes>
        ),
        handle: { title: "Company Profile" },
      },
      {
        path: "/templates",
        element: (
          <AdminRoutes>
            {withSuspense(Templates)()}
          </AdminRoutes>
        ),
        handle: { title: "Email Templates" },
      },
      {
        path: "/job-board",
        element: (
          <PrivateRoutes>
            {withSuspense(JobBoard)()}
          </PrivateRoutes>
        ),
        handle: { title: "Job Board" },
      },

      // ─── Invoicing & Financial Management ──────────────────────────────────────
      {
        path: "/invoices",
        element: (
          <PrivateRoutes>
            {withSuspense(Invoices)()}
          </PrivateRoutes>
        ),
        handle: { title: "Invoices" },
      },
      {
        path: "/invoicing",
        element: (
          <PrivateRoutes>
            {withSuspense(Invoicing)()}
          </PrivateRoutes>
        ),
        handle: { title: "Create Invoice" },
      },
      {
        path: "/quick-invoices",
        element: (
          <PrivateRoutes>
            {withSuspense(QuickInvoiceCreator)()}
          </PrivateRoutes>
        ),
        handle: { title: "Quick Invoice Creator" },
      },
      {
        path: "/admin/quickbooks",
        element: (
          <AdminRoutes>
            {withSuspense(QuickBooksSettings)()}
          </AdminRoutes>
        ),
        handle: { title: "QuickBooks Settings" },
      },

      // ─── Admin-Scoped Pages ────────────────────────────────────────────────────
      {
        path: "/clients",
        element: (
          <AdminRoutes>
            {withSuspense(AllClientsTable)()}
          </AdminRoutes>
        ),
        handle: { title: "All Clients" },
      },
      {
        path: "/user-management",
        element: (
          <AdminRoutes>
            {withSuspense(UserManagement)()}
          </AdminRoutes>
        ),
        handle: { title: "User Management" },
      },

      // ─── DEV - Project Dashboard (New Feature) ─────────────────────────────────
      {
        path: "/project-selector",
        element: (
          <AdminRoutes>
            {withSuspense(ProjectSelector)()}
          </AdminRoutes>
        ),
        handle: { title: "Select Project" },
      },
      {
        path: "/project-dashboard/:projectId",
        element: (
          <AdminRoutes>
            {withSuspense(ProjectDashboard)()}
          </AdminRoutes>
        ),
        handle: { title: "Project Dashboard" },
      },

      // ─── File Management & Recovery ─────────────────────────────────────────────
      {
        path: "/recycle-bin",
        element: (
          <PrivateRoutes>
            {withSuspense(RecycleBinPage)()}
          </PrivateRoutes>
        ),
        handle: { title: "Recycle Bin" },
      },
      {
        path: "/projects",
        element: (
          <PrivateRoutes>
            {withSuspense(UnifiedProjectsView)()}
          </PrivateRoutes>
        ),
        handle: { title: "Projects" },
      },
      {
        path: "/addNewProject",
        element: (
          <PrivateRoutes>
            {withSuspense(AddNewProjects)()}
          </PrivateRoutes>
        ),
        handle: { title: "Add New Project" },
      },
      {
        path: "/assignedProjects/:id",
        element: (
          <AdminRoutes>
            {withSuspense(AssignedProjects)()}
          </AdminRoutes>
        ),
        handle: { title: "Assigned Projects" },
      },
      {
        path: "/project/:alias",
        element: (
          <PrivateRoutes>
            {withSuspense(ProjectsView)()}
          </PrivateRoutes>
        ),
        handle: { title: "Project Details" },
      },
      {
        path: "/project/noaccess",
        element: <Suspense fallback={<LoadingSpinner />}><ProjectNoAccess /></Suspense>,
        handle: { title: "Project Access Required" },
      },

      // ─── (Legacy / Unused) ─────────────────────────────────────────────────────
      {/*
        path: "/userProjects/:id",
        element: (
          <PrivateRoutes>
            <UserTableDetails />
          </PrivateRoutes>
        ),
        handle: { title: "User Projects" },
      */},
    ],
  },

  // ─── Public Routes (Outside User Layout) ──────────────────────────────────────
  {
    path: "/socket-test",
    element: <Suspense fallback={<LoadingSpinner />}><LiveFolderSyncTest /></Suspense>,
    handle: { title: "Live Folder Sync Test" },
  },
  {
    path: "/project/view/:token",
    element: <Suspense fallback={<LoadingSpinner />}><ReadOnlyProjectView /></Suspense>,
    handle: { title: "Project View" },
  },
  {
    path: "/navbar-preview",  
    element: <NavBarPreview />,
    handle: { title: "NavBar Preview" },
  },

  // ─── Legal & Policy Pages (Public for QuickBooks) ────────────────────────────
  {
    path: "/terms-of-service",
    element: <Suspense fallback={<LoadingSpinner />}><TermsOfServicePage /></Suspense>,
    handle: { title: "Terms of Service" },
  },
  {
    path: "/privacy-policy",
    element: <Suspense fallback={<LoadingSpinner />}><PrivacyPolicyPage /></Suspense>,
    handle: { title: "Privacy Policy" },
  },

  // ─── QuickBooks Integration ────────────────────────────────────────────────────
  {
    path: "/quickbooks/callback",
    element: <Suspense fallback={<LoadingSpinner />}><QuickBooksCallback /></Suspense>,
    handle: { title: "QuickBooks Connection" },
  },

  // ─── Authentication & Public Pages ────────────────────────────────────────────
  {
    path: "/register",
    element: <Register />,
    handle: { title: "Register" },
  },
  {
    path: "/login",
    element: <Login />,
    handle: { title: "Login" },
  },
  {
    path: "/reset-password/:token",
    element: <ResetPassword />,
    handle: { title: "Reset Password" },
  },

  // ─── Error Pages ───────────────────────────────────────────────────────────────
  {
    path: "*",
    element: <NotFound />,
    handle: { title: "404 Not Found" },
  },
], {
  future: {
    v7_startTransition: true,
  },
});
