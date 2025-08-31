import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import { Button, Spin } from "antd";
import { IconDown } from "@/shared/IconSet.jsx";

const AssignedProjects = () => {
  const [loading, setLoading] = useState(true);
  const [tData, setTData] = useState([]);
  const { id } = useParams();
  const axiosSecure = useAxiosSecure();
  const url = `/projects/get-projects/${id}`;

  useEffect(() => {
    axiosSecure
      .get(url)
      .then((res) => {
        console.log(res.data);
        setTData(res.data.data);
        setLoading(false);
      })
      .catch((err) => console.log(err));
  }, [axiosSecure, url]);

  return (
    <div className="min-h-screen my-4">
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
                    <span>{data.description}</span>
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

export default AssignedProjects;
