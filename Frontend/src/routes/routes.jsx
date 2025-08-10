import { createBrowserRouter } from "react-router-dom";
// ─── Layouts & Route Guards ─────────────────────────────────────────────────
import User from "../Layout/User";
import AdminRoutes from "./AdminRoutes";
import PrivateRoutes from "./PrivateRoutes";
// ─── Authentication & Public Pages ────────────────────────────────────────────
import Login from "../pages/Login";
import Register from "../pages/Register";
import ResetPassword from "../pages/ResetPassword";
import NotFound from "../pages/404NotFound";
import Forbidden from "../pages/403Forbidden";
// ─── Onboarding & Utilities ────────────────────────────────────────────────────
import RootRedirect from "../pages/RootRedirect";
import NavBarPreview from "../pages/NavBarPreview";
import IconGallery from "../pages/IconGallery";
// ─── User-Scoped Pages ─────────────────────────────────────────────────────────
import MyProjects from "../pages/MyProjects";
import Profile from "../pages/Profile";
import CompanyChoice from "../pages/CompanyChoice";
import CompanyProfile from "../pages/CompanyProfile";
import JobBoard from "../pages/JobBoard";
// ─── Admin-Scoped Pages ────────────────────────────────────────────────────────
import AllClientsTable from "../pages/AllClientsTable";
import AllProjects       from "../pages/AllProjects";
import AddNewProjects    from "../pages/AddNewProjects";
import AssignedProjects  from "../pages/AssignedProjects";
import ProjectsView      from "../pages/ProjectsView";
import UserManagement    from "../pages/UserManagement";
// ─── (Legacy / Unused) ─────────────────────────────────────────────────────────
// import UserTable from "../pages/UserTable";
// import UserTableDetails from "../components/UserTableDetails";

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
        path: "/MyProjects",
        element: (
          <PrivateRoutes>
            <MyProjects />
          </PrivateRoutes>
        ),
        handle: { title: "My Projects" },
      },
      {
        path: "/profile",
        element: (
          <PrivateRoutes>
            <Profile />
          </PrivateRoutes>
        ),
        handle: { title: "Profile" },
      },
      {
        path: "/company-choice",
        element: (
          <PrivateRoutes>
            <CompanyChoice />
          </PrivateRoutes>
        ),
        handle: { title: "Choose Company" },
      },
      {
        path: "/company-profile",
        element: (
          <PrivateRoutes>
            <CompanyProfile />
          </PrivateRoutes>
        ),
        handle: { title: "Company Profile" },
      },
      {
        path: "/job-board",
        element: (
          <PrivateRoutes>
            <JobBoard />
          </PrivateRoutes>
        ),
        handle: { title: "Job Board" },
      },

      // ─── Admin-Scoped Pages ────────────────────────────────────────────────────
      {
        path: "/users",
        element: (
          <AdminRoutes>
            <AllClientsTable />
          </AdminRoutes>
        ),
        handle: { title: "All Clients" },
      },
      {
        path: "/user-management",
        element: (
          <AdminRoutes>
            <UserManagement />
          </AdminRoutes>
        ),
        handle: { title: "User Management" },
      },
      {
        path: "/projects",
        element: (
          <AdminRoutes>
            <AllProjects />
          </AdminRoutes>
        ),
        handle: { title: "Admin Projects" },
      },
      {
        path: "/addNewProject",
        element: (
          <PrivateRoutes>
            <AddNewProjects />
          </PrivateRoutes>
        ),
        handle: { title: "Add New Project" },
      },
      {
        path: "/assignedProjects/:id",
        element: (
          <AdminRoutes>
            <AssignedProjects />
          </AdminRoutes>
        ),
        handle: { title: "Assigned Projects" },
      },
      {
        path: "/project/:alias",
        element: (
          <PrivateRoutes>
            <ProjectsView />
          </PrivateRoutes>
        ),
        handle: { title: "Project Details" },
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
    path: "/navbar-preview",  
    element: <NavBarPreview />,
    handle: { title: "NavBar Preview" },
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
]);
