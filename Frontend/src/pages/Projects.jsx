import { Button, Drawer, Space } from "antd";
import { useEffect, useState } from "react";
import { CiSearch } from "react-icons/ci";
import { GoChevronDown } from "react-icons/go";
import { MdOutlineFileDownload } from "react-icons/md";
import useAxiosSecure from "../hooks/AxoisSecure/useAxiosSecure";

const Projects = () => {
  const [activeButton, setActiveButton] = useState("All Project");
  const [tData, setTData] = useState([]);

  const [open, setOpen] = useState(false);
  const showDrawer = () => {
    setOpen(true);
  };
  const onClose = () => {
    setOpen(false);
  };

  const axoisSecure = useAxiosSecure();
  const url = "/get-projects";
  useEffect(() => {
    axoisSecure
      .get(url)
      .then((res) => {
        setTData(res.data);
        console.log(res.data);
      })
      .catch((err) => {
        console.log(err);
      });
  }, [axoisSecure, url]);

  return (
    <div className="min-h-screen">
      <div className="flex justify-between my-6">
        <div>
          <div className="relative">
            <CiSearch className="absolute top-[11px] left-2" />
            <input
              type="text"
              className="pl-10 h-9 rounded-md placeholder:text-medium "
              placeholder="Search"
            />
          </div>
        </div>
        <div className="flex gap-6 py-1 px-1 text-medium text-textGray rounded-full bg-white w-fit">
          <button
            className={`px-4 py-1 rounded-full transition-colors duration-300 ${
              activeButton === "All Project"
                ? "bg-secondary text-white"
                : "bg-transparent text-textGray"
            }`}
            onClick={() => setActiveButton("All Project")}
          >
            All Project
          </button>
          <button
            className={`px-4 py-1 rounded-full transition-colors duration-300 ${
              activeButton === "Last Update"
                ? "bg-secondary text-white"
                : "bg-transparent text-textGray"
            }`}
            onClick={() => setActiveButton("Last Update")}
          >
            New Project
          </button>
          <button
            className={`px-4 py-1 rounded-full transition-colors duration-300 ${
              activeButton === "Unassigns Projects"
                ? "bg-secondary text-white"
                : "bg-transparent text-textGray"
            }`}
            onClick={() => setActiveButton("Unassigns Projects")}
          >
            Unassigns Projects
          </button>
        </div>
      </div>
      <div className="overflow-x-auto bg-white p-4 rounded-md ">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="text-left h-10 bg-primary-10 text-medium ">
              <td className="pl-2">
                <span className="flex">
                  Project Name <GoChevronDown />
                </span>
              </td>
              <td>Country</td>
              <td>Posting date</td>
              <td>Cost</td>
              <td>Dateline</td>
              <td>Action</td>
            </tr>
          </thead>
          <tbody>
            {tData.map((data) => (
              <>
                <tr className="border-t-[1px] text-semiBold">
                  <td className="pl-2">
                    <span className="font-semibold">{data.name}</span>
                    <br />
                    <span>{data.description}</span>
                  </td>
                  <td>{data.country}</td>
                  <td>{data.posting_date}</td>
                  <td>${data.cost}</td>
                  <td>{data.dateline}</td>
                  <td className="flex gap-2 text-primary my-2">
                    <>
                      <Button
                        type="primary"
                        className="text-primary bg-white border-stoke hover:text-white hover:bg-primary"
                        onClick={showDrawer}
                      >
                        View
                      </Button>
                      <Drawer
                        extra={
                          <Space>
                            <Button onClick={onClose}>Cancel</Button>
                            <Button type="primary" onClick={onClose}>
                              OK
                            </Button>
                          </Space>
                        }
                        title="Multi-level drawer"
                        width={370}
                        closable={false}
                        onClose={onClose}
                        open={open}
                      >
                        <h1>hlw world</h1>
                      </Drawer>
                    </>
                    <button className="px-2 py-1 rounded-md border-2 border-primary">
                      <span className="flex gap-2">
                        <MdOutlineFileDownload className="mt-1" /> Download
                      </span>
                    </button>
                  </td>
                </tr>
              </>
            ))}

            {/* Add more rows as needed */}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Projects;
