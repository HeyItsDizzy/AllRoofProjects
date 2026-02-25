/* eslint-disable react-hooks/rules-of-hooks */
import { useContext } from "react";
import { AuthContext } from "../../auth/AuthProvider";

const userIsAdmin = () => {
  const { user } = useContext(AuthContext);

  let isAdmin = false;
  if (user?.role === "Admin") {
    isAdmin = true;
  } else {
    console.log(isAdmin);
    return isAdmin;
  }

  return isAdmin; // Ensure it always returns a value
};

export default userIsAdmin;
