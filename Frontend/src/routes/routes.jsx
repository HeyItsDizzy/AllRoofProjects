import { createBrowserRouter } from "react-router-dom";
import UserTable from "../pages/userTable";
import Login from "../pages/login";
import Register from "../pages/register";
import AllUsersTable from "../pages/AllUsersTable";
import AdminProjectTable from "../pages/AdminProjectTable";
import AssignedProjects from "../pages/AssignedProjects";
import AddNewProjects from "../pages/AddNewProjects";
import ProjectsView from "../pages/ProjectsView";
import MyProjects from "../pages/MyProjects";
import UserTableDetails from "../Components/UserTableDetails";
import AdminRoutes from "./AdminRoutes";
import PrivateRoutes from "./PrivateRoutes";
import User from "../Layout/user";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <User />,
    children: [
      {
        path: "/",
        element: (
          <PrivateRoutes>
            <UserTable />
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
        path: "/myProjects",
        element: (
          <PrivateRoutes>
            <MyProjects />
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
    ],
  },
  {
    path: "/register",
    element: <Register />,

  },
  {
    path: "/login",
    element: <Login />,
  },
]);
