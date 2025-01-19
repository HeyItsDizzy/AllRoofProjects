import { useEffect, useState } from "react";
import { CiSearch } from "react-icons/ci";
import useAxiosSecure from "../hooks/AxoisSecure/useAxiosSecure";
import { Button } from "antd";
import { Link } from "react-router-dom";

export default function AllUsersTable() {
  const [activeButton, setActiveButton] = useState("All Users");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);

  const axiosSecure = useAxiosSecure();
  const url = "/get-users";

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await axiosSecure.get(url, {
          params: { search, recent: activeButton === "New Users" },
        });
        setUsers(res.data.data);
      } catch (err) {
        console.log(err);
      }
    };

    const debounceFetch = setTimeout(fetchUsers, 500); // Debounce API calls for better performance

    return () => clearTimeout(debounceFetch);
  }, [axiosSecure, search, activeButton]);

  return (
    <div className="min-h-screen">
      <div className="w-fit mx-auto gap-2  md:flex md:justify-between md:w-full lg:w-full my-6">
        <div className="w-fit my-2">
          <div className="relative">
            <CiSearch className="absolute top-[11px] left-2" />
            <input
              type="text"
              className="pl-10 h-9 rounded-md placeholder:text-medium"
              placeholder="Search"
              onChange={handleSearchChange}
            />
          </div>
        </div>
        <div className="flex gap-4 py-1 px-1 text-medium text-textGray rounded-full bg-white w-fit">
          <button
            className={`px-4 py-1 rounded-full transition-colors duration-300 ${
              activeButton === "All Users"
                ? "bg-secondary text-white"
                : "bg-transparent text-textGray"
            }`}
            onClick={() => setActiveButton("All Users")}
          >
            All Users
          </button>
          <button
            className={`px-4 py-1 rounded-full transition-colors duration-300 ${
              activeButton === "New Users"
                ? "bg-secondary text-white"
                : "bg-transparent text-textGray"
            }`}
            onClick={() => setActiveButton("New Users")}
          >
            New Users
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-white p-4 rounded-md">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="text-left h-10 bg-primary-10 text-medium">
              <td className="pl-2">Client Name</td>
              <td>Address</td>
              <td>Phone</td>
              <td>Email</td>
              <td>Project Assign</td>
              <td>Action</td>
            </tr>
          </thead>
          <tbody>
            {users.map((data) => (
              <tr key={data._id} className="border-t-[1px] text-semiBold">
                <td>
                  <div className="flex items-center gap-2 py-2">
                    <figure className="rounded-full w-10">
                      {data.image ? (
                        <img
                          className="rounded-full w-full h-full"
                          src={data.image}
                          alt=""
                        />
                      ) : (
                        <div className="rounded-full w-full h-10 flex justify-center align-middle bg-bgGray">
                          <h1 className="h-fit my-auto text-xl text-textBlack font-serif font-medium">
                            {data.name.slice(0, 2)}
                          </h1>
                        </div>
                      )}
                    </figure>
                    <span className="font-semibold">{data.name}</span>
                  </div>
                </td>
                <td>{data.address}</td>
                <td>{data.phone}</td>
                <td>{data.email}</td>
                <td>{data.projectAssign}</td>
                <td className="text-primary">
                  <Link to={`/asignedProjects/${data._id}`}>
                    <Button
                      type="primary"
                      className="text-primary bg-white border-stoke shadow-none hover:bg-primary"
                    >
                      View Projects
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
