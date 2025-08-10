import { useEffect, useState } from "react";
import { Button, Spin } from "antd";
import { IconDown } from "../shared/IconSet.jsx";
import { IconSearch } from "../shared/IconSet.jsx";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import { Link } from "react-router-dom";
import dayjs from "dayjs";

const UserTable = () => {
  const [activeButton, setActiveButton] = useState("All Project");
  const [tData, setTData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [, setErrors] = useState("");
  const axiosSecure = useAxiosSecure();
  const url = "/projects/get-projects";

  const fetchData = (query) => {
    setLoading(true);
    axiosSecure
      .get(url, { params: query })
      .then((res) => {
        setTData(res.data.data);
      })
      .catch((err) => setErrors(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let query = {};
    if (search) query.search = search;
    if (activeButton === "New Projects") {
      query.startDate = dayjs().subtract(7, "days").format("YYYY-MM-DD");
    } else if (activeButton === "Last Update") {
      query.startDate = dayjs().subtract(3, "days").format("YYYY-MM-DD");
    }
    fetchData(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [axiosSecure, activeButton, search]);

  return (
    <div className="min-h-screen">
      <div className="w-fit mx-auto gap-2 md:mx-0 lg:mx-0  md:flex md:w-full lg:w-full md:flex-row lg:flex-row  md:justify-between lg:justify-between my-6">
        {/* Search and Filter UI */}

        <div className="w-fit  mx-auto md:mx-0 lg:mx-0 my-2">
          <div className="relative">
            <IconSearch className="absolute top-[11px] left-2" />
            <input
              type="text"
              name="search"
              className="pl-10 h-9 rounded-md placeholder:text-medium"
              placeholder="Search"
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-4 py-1 px-1 text-medium text-textGray rounded-full bg-white w-fit">
          <button
            className={`px-4 py-1 rounded-full transition-colors ${
              activeButton === "All Project" ? "bg-secondary text-white" : ""
            }`}
            onClick={() => setActiveButton("All Project")}
          >
            All Projects
          </button>
          <button
            className={`px-4 py-1 rounded-full transition-colors ${
              activeButton === "New Projects" ? "bg-secondary text-white" : ""
            }`}
            onClick={() => setActiveButton("New Projects")}
          >
            New Projects
          </button>
          <button
            className={`px-4 py-1 rounded-full transition-colors ${
              activeButton === "Last Update" ? "bg-secondary text-white" : ""
            }`}
            onClick={() => setActiveButton("Last Update")}
          >
            Last Updated
          </button>
        </div>
      </div>
      <div className="overflow-x-auto bg-white p-4 rounded-md">
        {loading ? (
          <div className="text-center">
            <Spin size="large" />
          </div>
        ) : (
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="text-left h-10 bg-primary-10 text-medium">
                <td className="pl-2">
                  <span className="flex">
                    Project Name <IconDown />
                  </span>
                </td>
                <td>Address</td>
                <td>Date Posted</td>
                <td>Cost</td>
                <td>Due Date</td>
                <td>Action</td>
              </tr>
            </thead>
            <tbody>
              {tData?.map((data) => (
                <tr key={data._id} className="border-t-[1px] text-semiBold">
                  <td className="pl-2 py-2">
                    <span className="font-semibold">{data.name}</span>
                    <br />
                    {data.description && (
                      <span>{data.description.substring(0, 30)}...</span>
                    )}
                  </td>
                  <td>{data.location}</td>
                  <td>{data.posting_date}</td>
                  <td>${data?.subTotal + data?.gst}</td>
                  <td>{data.due_date}</td>
                  <td className="text-primary my-2">
                    <div className="flex gap-2">
                      <Button>
                        <Link to={`/project/${data?._id}`}>View</Link>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default UserTable;
