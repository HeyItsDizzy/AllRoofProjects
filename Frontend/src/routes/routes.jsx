import { createBrowserRouter } from "react-router-dom";
import RootRedirect from "../pages/RootRedirect"; 
import UserTable from "../pages/userTable";
import NavBarPreview from "../pages/NavBarPreview"; 
import Login from "../pages/login";
import Register from "../pages/register";
import AllUsersTable from "../pages/AllUsersTable";
import AdminProjectTable from "../pages/AdminProjectTable";
import AssignedProjects from "../pages/AssignedProjects";
import AddNewProjects from "../pages/AddNewProjects";
import ProjectsView from "../pages/ProjectsView";
import ProjectsUser from "../pages/ProjectsUser";
import UserTableDetails from "../Components/UserTableDetails";
import AdminRoutes from "./AdminRoutes";
import PrivateRoutes from "./PrivateRoutes";
import User from "../Layout/user";
import Forbidden from "../pages/403Forbidden"; 
import NotFound from "../pages/404NotFound"; // ✅ Import the 404 Page
import Profile from "../pages/Profile"; // ✅ Add at the top
import ResetPassword from "../pages/ResetPassword";   // Placeholder page
import IconGallery from "../pages/IconGallery";




export const router = createBrowserRouter([
  {
    path: "/",
    element: <User />, 
    children: [
      {
        path: "/",
        element: (
          <PrivateRoutes>
            <RootRedirect />
          </PrivateRoutes>
        ),
      },
      {
        path: "/forbidden",
        element: (
          <PrivateRoutes>
            <Forbidden />
          </PrivateRoutes>
        ),
      },
      {
        path: "/MyProjects",
        element: (
          <PrivateRoutes>
            <ProjectsUser />
          </PrivateRoutes>
        ),
      },
      {
        path: "/icons",
        element: (
          <PrivateRoutes>
            <IconGallery />
          </PrivateRoutes>
        ),
      },
      
      {
        path: "/users",
        element: (
          <AdminRoutes>
            <AllUsersTable />
          </AdminRoutes>
        ),
      },
      {
        path: "/projects",
        element: (
          <AdminRoutes>
            <AdminProjectTable />
          </AdminRoutes>
        ),
      },
      {
        path: "/addNewProject",
        element: (
          <PrivateRoutes>
            <AddNewProjects />
          </PrivateRoutes>
        ),
      },
      {
        path: "/project/:id",
        element: (
          <PrivateRoutes>
            <ProjectsView />
          </PrivateRoutes>
        ),
      },
      {
        path: "/userProjects/:id",
        element: (
          <PrivateRoutes>
            <UserTableDetails />
          </PrivateRoutes>
        ),
      },
      {
        path: "/assignedProjects/:id",
        element: (
          <AdminRoutes>
            <AssignedProjects />
          </AdminRoutes>
        ),
      },
      {
        path: "/profile",
        element: (
          <PrivateRoutes>
            <Profile />
          </PrivateRoutes>
        ),
      },
      
    ],
  },
  {
    path: "/navbar-preview",  
    element: <NavBarPreview />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/reset-password/:token",
    element: <ResetPassword />,
  },
  
  {
    path: "*", // ✅ This catches any unmatched routes (404)
    element: <NotFound />,
  },
]);
