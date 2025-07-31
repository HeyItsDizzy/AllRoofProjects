import { Button } from "antd";
import { IconBackArrow } from "../shared/IconSet.jsx";
import { Link, useNavigate } from "react-router-dom";
import useAxiosSecure from "../hooks/AxiosSecure/useAxiosSecure";
import { useContext, useEffect, useState, useRef } from "react";
import { AuthContext } from "../auth/AuthProvider";
import Swal from '@/shared/swalConfig';
//import Swal from "sweetalert2";
import axios from "axios";
import AddressInput from "../Components/AddressInput";


const AddNewProjects = () => {
  const axiosSecure = useAxiosSecure();
  const [addressDetails, setAddressDetails] = useState({}); // Structured address for backend
  const [subTotal, setSubTotal] = useState(0);
  const [gst, setGst] = useState(0);
  const [total, setTotal] = useState(0);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "Admin";
  const [userCountry, setUserCountry] = useState("AU"); // Default to Australia

  const [selectedUserId, setSelectedUserId] = useState(isAdmin ? "" : user?._id);
  const [selectedUserDetails, setSelectedUserDetails] = useState(
    isAdmin
      ? {}
      : {
          name: user?.name || "",
          email: user?.email || "",
          phone: user?.phone || "",
          address: user?.address || "",
        }
  );
  
// Fetch users if Admin
useEffect(() => {
  if (isAdmin) {
    axiosSecure.get("/projects/get-userData").then((res) => setUsers(res.data.data));
  }
}, [axiosSecure, isAdmin]);

// When Admin selects a user, update "Created for:"
const handleUserSelection = (e) => {
  const userId = e.target.value;
  setSelectedUserId(userId);

  const userDetails = users.find((u) => u._id === userId);
  setSelectedUserDetails(
    userDetails || { name: "", email: "", phone: "", address: "" }
  );
};


  useEffect(() => {
    const fetchUserCountry = async () => {
      try {
        const res = await axios.get("https://geolocation-db.com/json/");
        if (res.data?.country_code) {
          console.log("🌍 Auto-Detected Country:", res.data.country_code);
          setUserCountry(res.data.country_code);
        }
      } catch (error) {
        console.error("❌ Error fetching user location:", error);
      }
    };

    fetchUserCountry();
  }, []);

  useEffect(() => {
    // Calculate total whenever subTotal or gst changes
    setTotal(parseFloat(subTotal) + parseFloat(gst));
  }, [subTotal, gst]);

  // const formatDate = (date) => {
  //   const month = date.getMonth() + 1; // getMonth() is zero-based
  //   const day = date.getDate();
  //   const year = date.getFullYear();
  //   return `${month}/${day}/${year}`;
  // };

  const url = "/projects/addProject";

  // const debounceTimeoutRef = useRef(null);

  const generateProjectNumber = async (existingProjects) => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const baseNumber = `${year}-${month}`;

    const count = existingProjects.filter(
      (project) => project.projectNumber && project.projectNumber.startsWith(baseNumber)
    ).length;

    return `${baseNumber}${String(count + 1).padStart(3, "0")}`;
  };

  const handleAddNewProject = async (e) => {
    e.preventDefault();
    setLoading(true);

    const form = e.target;
    const name = form.name.value.trim() || "Untitled Project";
    const due_date_raw = form.due_date?.value || "";
    const due_date     = due_date_raw
      ? new Date(due_date_raw).toISOString().slice(0, 10)
      : "";
    const description = form.description.value.trim() || "No description provided.";
    const subTotal = parseFloat(form.subTotal.value) || 0;
    const gst = parseFloat(form.gst.value) || 0;
    const total = subTotal + gst;
    // Store as ISO-8601 so backend always sees the same format
    const posting_date = new Date().toISOString().slice(0, 10);    // "2025-07-25"

    let existingProjects = [];
    try {
      existingProjects = res.data.data || [];
    } catch (error) {
      console.error("❌ Error fetching projects:", error);
    }

    const projectNumber = await generateProjectNumber(existingProjects);

    // If Admin, send that selected client ID, otherwise link the current user
    const linkedUsers   = isAdmin ? []       : [user._id];
    const linkedClients = isAdmin ? [form.client.value] : [];

    const project = {
      name,
      location: Object.keys(addressDetails).length > 0 ? addressDetails : "",
      due_date,
      posting_date,
      linkedUsers,
      linkedClients,
      description,
      subTotal,
      total,
      gst,
      status: "New Lead",
    };

    console.log("✅ Final Project Data Before API Call:", JSON.stringify(project, null, 2));

    try {
      const response = await axiosSecure.post("/projects/addProject", project);
      console.log("✅ Server Response:", response.data);

      if (response?.data?.success && response?.data?.data?._id) {
        const newProjectId = response.data.data._id;
        console.log("✅ Navigating to project:", newProjectId);

        Swal.fire({
          position: "top-end",
          icon: "success",
          title: "Project added successfully!",
          showConfirmButton: false,
          timer: 1500,
        });

        setTotal(0);
        form.reset();
        navigate(`/project/${newProjectId}`);
      } else {
        throw new Error("Project ID is missing in response.");
      }
    } catch (err) {
      console.error("❌ Error adding project:", err);
      Swal.fire({
        icon: "error",
        title: "Oops...",
        text: err?.message || "Failed to add new project",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = (e) => {
    e.preventDefault();
    const form = e.target.closest("form");
    form.reset();
  };

  return (
    <div className="min-h-screen py-4">
      {/* header and button */}
      <div className="h-fit my-3 items-center">
        <div>
          <p className="flex gap-3">
            <button onClick={() => navigate(-1)}>
              <IconBackArrow className="text-2xl text-textGray" />
            </button>
            Create new Project
          </p>
        </div>
      </div>

      {/* form section */}
      <div className="bg-white p-4 rounded-md">
        <form onSubmit={handleAddNewProject}>
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
                <select name="client" className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md">
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
                <AddressInput location={addressDetails} setLocation={setAddressDetails} />
              </div>
              <div className="border-2 border-bgGray p-4 rounded-md">
                <h3 className="text-xl font-semibold">Due Date</h3>
                <div className="flex flex-col">
                  <label>Date</label>
                  <input
                    type="date"
                    name="due_date"
                    placeholder="Type here"
                    className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
                  />
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/2 border-2 rounded-md border-bgGray p-2">
  <div className="flex flex-col gap-2">
    <h1 className="text-xl font-semibold">Created for:</h1>

    {/* Admin Dropdown to Select a User */}
    {isAdmin && (
      <div className="flex flex-col">
        <label>Select Client</label>
        <select
          value={selectedUserId}
          onChange={handleUserSelection}
          className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
        >
          <option value="">Select a client</option>
          {users.map((u) => (
            <option key={u._id} value={u._id}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
    )}

    {/* Name */}
    <div className="flex flex-col">
      <label>Name</label>
      <input
        type="text"
        value={selectedUserDetails.name || ""}
        className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
        readOnly
      />
    </div>

    {/* Address */}
    <div className="flex flex-col">
      <label>Address</label>
      <input
  type="text"
  value={
    typeof selectedUserDetails.address === "object"
      ? `${selectedUserDetails.address.full_address?.split(",")[0] || "No Address Available"}, ${selectedUserDetails.address.city || ""}, ${user.address.zip}`
      : selectedUserDetails.address || "No Address Available"
  }
  className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
  readOnly
/>
    </div>

    {/* Email & Phone */}
    <div className="flex flex-col md:flex-row gap-4">
      <div className="flex flex-col w-full md:w-1/2">
        <label>Email</label>
        <input
          type="email"
          value={selectedUserDetails.email || ""}
          className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
          readOnly
        />
      </div>
      <div className="flex flex-col w-full md:w-1/2">
        <label>Phone</label>
        <input
          type="number"
          value={selectedUserDetails.phone || ""}
          className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md"
          readOnly
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
          <div className="flex flex-col md:flex-row gap-2">
            <Button
              type="button"
              className="w-full bg-transparent text-textGray py-5 border-2 border-textGray"
              onClick={handleResetForm}
            >
              Reset all fields
            </Button>

            <Button
              className="w-full text-white bg-primary py-5"
              htmlType="submit"
              loading={loading}
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
