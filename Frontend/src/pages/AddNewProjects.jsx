import { Button } from "antd";
import { FaArrowLeftLong } from "react-icons/fa6";
import { Link, useNavigate } from "react-router-dom";
import useAxiosSecure from "../hooks/AxoisSecure/useAxiosSecure";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../auth/AuthProvider";
import Swal from "sweetalert2";

const AddNewProjects = () => {
  const [subTotal, setSubTotal] = useState(0);
  const [gst, setGst] = useState(0);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "Admin";
  useEffect(() => {
    // Calculate total whenever subTotal or gst changes
    setTotal(parseFloat(subTotal) + parseFloat(gst));
  }, [subTotal, gst]);

  const formatDate = (date) => {
    const month = date.getMonth() + 1; // getMonth() is zero-based
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const url = "/addProject";
  const axiouSecure = useAxiosSecure();

  useEffect(() => {
    if (isAdmin) {
      axiouSecure.get("/get-userData").then((res) => setUsers(res.data.data));
    }
  }, [axiouSecure, isAdmin]);

  const handelAddNewProject = (e) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target;

    const name = form.name.value;
    const location = form.location.value;
    const dateline = form.dateline.value;
    const description = form.description.value;
    const subTotal = form.subTotal.value;
    const gst = form.gst.value;
    const userName = form.userName.value;
    const userAddress = form.userAddress.value;
    const userPhone = form.userPhone.value;
    const userEmail = form.userEmail.value;

    const today = new Date();
    const posting_date = formatDate(today);
    const onarDetail = { userName, userAddress, userPhone, userEmail };

    const project = {
      name,
      location,
      dateline,
      posting_date,
      onarDetail,
      description,
      subTotal,
      total,
      gst,
    };

    // If the user is Admin
    if (isAdmin) {
      const clientId = form.client.value; // Selected client ID

      const client = users.find((user) => user._id === clientId);
      if (client) {
        project.assignedOn = {
          _id: client._id,
          name: client.name,
          image: client.image,
        };
        project.userId = user._id;
      }
    }

    console.log(project);

    // Submit the project
    axiouSecure
      .post(url, project)
      .then((res) => {
        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Project added successfully!",
          showConfirmButton: false,
          timer: 1500,
        });
        setTotal(0);
        form.reset();
        navigate(`/project/${res?.data?.data?._id}`);
      })
      .catch((err) => {
        Swal.fire({
          icon: "error",
          title: "Oops...",
          text: err?.message || "Failed to add new project",
        });
      })
      .finally(() => setLoading(false));
  };

  const handelResetForm = (e) => {
    e.preventDefault();
    const form = e.target.closest("form"); // Find the closest form element
    form.reset();
  };

  return (
    <div className="min-h-screen py-4">
      {/* header and button */}
      <div className=" h-fit my-3 items-center ">
        <div>
          <p className="flex gap-3 ">
            <Link to="/">
              <FaArrowLeftLong className="text-2xl text-textGray" />{" "}
            </Link>
            Create new Project
          </p>
        </div>
      </div>

      {/* form section */}
      <div className="bg-white p-4 rounded-md">
        <form onSubmit={handelAddNewProject}>
          <div className="flex flex-col sm:flex-row sm:gap-4 justify-between">
            <div className="w-full flex flex-col">
              <label>Project name</label>
              <input
                type="text"
                name="name"
                placeholder="Type here"
                className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
                required
              />
            </div>
            {isAdmin && (
              <div className="w-full flex flex-col">
                <label>Select Client</label>
                <select
                  name="client"
                  className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
                >
                  <option value={""}>Select a client</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user?.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="flex flex-col md:flex-row gap-4 w-full h-fit my-4">
            <div className="w-full md:w-1/2 flex flex-col gap-y-4">
              <div className="border-2 border-bgGray p-4 rounded-md">
                <h3 className="text-xl font-semibold">Location</h3>
                <div className="flex flex-col">
                  <label>Address</label>
                  <input
                    type="text"
                    name="location"
                    placeholder="Type here"
                    className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
                  />
                </div>
              </div>
              <div className="border-2 border-bgGray p-4 rounded-md">
                <h3 className="text-xl font-semibold">Dateline</h3>
                <div className="flex flex-col">
                  <label>Date</label>
                  <input
                    type="date"
                    name="dateline"
                    placeholder="Type here"
                    className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
                  />
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2 border-2 rounded-md border-bgGray p-2">
              <div className="flex flex-col gap-2">
                <h1 className="text-xl font-semibold">My details</h1>
                <div className="flex flex-col">
                  <label>Name</label>
                  <input
                    type="text"
                    name="userName"
                    placeholder="Type here"
                    className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
                  />
                </div>
                <div className="flex flex-col">
                  <label>Address</label>
                  <input
                    type="text"
                    name="userAddress"
                    placeholder="Type here"
                    className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
                  />
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex flex-col w-full md:w-1/2">
                    <label>Email</label>
                    <input
                      type="email"
                      name="userEmail"
                      placeholder="Type here"
                      className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
                    />
                  </div>
                  <div className="flex flex-col w-full md:w-1/2">
                    <label>Phone</label>
                    <input
                      type="number"
                      name="userPhone"
                      placeholder="Type here"
                      className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-between my-4">
            <label>Job Description</label>
            <textarea
              id="message"
              rows="4"
              name="description"
              className="w-full pl-2 px-4 py-2 text-gray-700 bg-bgGray border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Write your message here..."
            />
          </div>

          <div className="border-2 border-bgGray rounded-md p-4 my-4">
            <h1 className="text-xl font-semibold mb-4">Pricing</h1>
            <div className="flex flex-col md:flex-row lg:flex-row gap-4">
              <div className="flex flex-col w-full md:w-1/3">
                <label className="mb-1">Sub-total</label>
                <input
                  type="number"
                  name="subTotal"
                  value={subTotal}
                  onChange={(e) => setSubTotal(e.target.value)}
                  className="w-full bg-bgGray h-8 border-2 rounded-md"
                  required
                />
              </div>
              <div className="flex flex-col w-full md:w-1/3">
                <label className="mb-1">GST</label>
                <input
                  type="number"
                  name="gst"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  className="w-full bg-bgGray h-8 border-2 rounded-md"
                  required
                />
              </div>
              <div className="flex flex-col w-full md:w-1/3">
                <label className="mb-1">Total</label>
                <input
                  type="number"
                  name="total"
                  value={total}
                  readOnly
                  className="w-full bg-bgGray h-8 border-2 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* button section */}
          <div className="flex flex-col md:flex-row gap-2 ">
            <Button
              type="button" // Use button type to prevent form submission
              className=" w-full bg-transparent text-textGray py-5 border-2 border-textGray"
              onClick={handelResetForm}
            >
              Reset all fields
            </Button>
            <Button
              className="w-full text-white bg-primary py-5"
              htmlType="submit"
              loading={loading} // Ant Design provides a built-in loader for buttons
            >
              {loading ? "Saving..." : "Save Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNewProjects;
