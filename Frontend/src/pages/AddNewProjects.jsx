import { Button, Select } from "antd";
import Avatar from "@/shared/Avatar";
import { IconBackArrow } from "@/shared/IconSet.jsx";
import { Link, useNavigate } from "react-router-dom";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
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
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const isAdmin = user?.role === "Admin";
  const [userCountry, setUserCountry] = useState("AU"); // Default to Australia

  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedClientDetails, setSelectedClientDetails] = useState({});

  const handleClientSelection = (clientId) => {
    setSelectedClientId(clientId);
    const details = clients.find((c) => c._id === clientId) || {};
    setSelectedClientDetails(details);
  };
  // Fetch clients (all for Admin, or only the ones this user is linked to)
  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await axiosSecure.get("/clients");
        const all = Array.isArray(res.data) ? res.data : res.data.client || [];

        if (isAdmin) {
          setClients(all);
        } else {
          // non-admin: only those where linkedUsers includes you
          const mine = all.filter((c) =>
            Array.isArray(c.linkedUsers) &&
            c.linkedUsers.some((uid) => uid.toString() === user._id)
          );
          setClients(mine);
        }
      } catch (err) {
        console.error("Failed to load clients", err);
      }
    };
    loadClients();
  }, [axiosSecure, isAdmin, user._id]);

// after your clients load, set a default
useEffect(() => {
  if (clients.length === 0) return;

  // 1) look for last-used in localStorage
  const last = localStorage.getItem("lastClientId");
  if (last && clients.some((c) => c._id === last)) {
    handleClientSelection(last);
  }
  // 2) otherwise pick the first in the list
  else {
    handleClientSelection(clients[0]._id);
  }
}, [clients]); 

  useEffect(() => {
    const fetchUserCountry = async () => {
      try {
        const res = await axios.get("https://geolocation-db.com/json/");
        if (res.data?.country_code) {
          console.log("🌍 Auto-Detected Country:", res.data.country_code);
          setUserCountry(res.data.country_code);
        }
      } catch (error) {
        console.error("❌ Error fetching projects:", error);
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
    const linkedUsers   = [];
    const linkedClients = [selectedClientId];

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
      console.error("❌ Error adding project:", error);
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

// after your clients load, set a default
useEffect(() => {
  if (clients.length === 0) return;

  // 1) look for last-used in localStorage
  const last = localStorage.getItem("lastClientId");
  if (last && clients.some((c) => c._id === last)) {
    handleClientSelection(last);
  }
  // 2) otherwise pick the first in the list
  else {
    handleClientSelection(clients[0]._id);
  }
}, [clients]); 



  return (
    <div className="min-h-screen py-4">
      {/* Header and button */}
      <div className="h-fit my-3 items-center">
        <div>
          <p className="flex gap-3 items-center text-lg font-semibold text-gray-900">
            <button onClick={() => navigate(-1)}>
              <IconBackArrow className="text-2xl text-gray-600" />
            </button>
            Create new Project
          </p>
        </div>
      </div>

      {/* Form section */}
      <div className="bg-white p-4 rounded-md">
        <form onSubmit={handleAddNewProject}>
          <div className="flex flex-col sm:flex-row sm:gap-4 justify-between">
            <div className="w-full flex flex-col">
              <label className="text-sm font-medium text-gray-700 mb-1">Project name</label>
              <input
                type="text"
                name="name"
                placeholder="Type here"
                className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md text-sm"
                required
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-4 w-full h-fit my-4">
            <div className="w-full md:w-1/2 flex flex-col gap-y-4">
              <div className="border-2 border-bgGray p-4 rounded-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Location</h3>
                <AddressInput location={addressDetails} setLocation={setAddressDetails} />
              </div>
              <div className="border-2 border-bgGray p-4 rounded-md">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Due Date</h3>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="due_date"
                    placeholder="Type here"
                    className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="w-full md:w-1/2 border-2 rounded-md border-bgGray p-4">
              <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Created for:</h3>

                {/* Name */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">Name</label>
                  <Select
                    value={selectedClientId}
                    onChange={handleClientSelection}
                    placeholder="Select a client"
                    className="w-full"
                    optionLabelProp="label"
                  >
                    {clients.map((c) => (
                      <Select.Option key={c._id} value={c._id} label={c.name}>
                        <div className="flex items-center gap-2">
                          <Avatar name={c.name} avatarUrl={c.avatar} size="sm" />
                          <span className="text-sm">{c.name}</span>
                        </div>
                      </Select.Option>
                    ))}
                  </Select>
                </div>

                {/* Address */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    value={
                      typeof selectedClientDetails.address === "object"
                        ? `${selectedClientDetails.address.full_address?.split(",")[0] || "No Address Available"}, ${selectedClientDetails.address.city || ""}, ${user.address.zip}`
                        : selectedClientDetails.address || "No Address Available"
                    }
                    className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md text-sm"
                    readOnly
                  />
                </div>

                {/* Email & Phone */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex flex-col w-full md:w-1/2">
                    <label className="text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={selectedClientDetails.email || ""}
                      className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md text-sm"
                      readOnly
                    />
                  </div>
                  <div className="flex flex-col w-full md:w-1/2">
                    <label className="text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="tel"
                      value={selectedClientDetails.phone || ""}
                      className="w-full pl-2 bg-bgGray h-8 border-2 rounded-md text-sm"
                      readOnly
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col my-4">
            <label className="text-sm font-medium text-gray-700 mb-1">Job Description</label>
            <textarea
              id="message"
              rows="4"
              name="description"
              className="w-full px-4 py-2 text-sm text-gray-700 bg-bgGray border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Write your message here..."
            />
          </div>

          <div className="border-2 border-bgGray rounded-md p-4 my-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h3>
            <div className="flex flex-col md:flex-row lg:flex-row gap-4">
              <div className="flex flex-col w-full md:w-1/3">
                <label className="text-sm font-medium text-gray-700 mb-1">Sub-total</label>
                <input
                  type="number"
                  name="subTotal"
                  value={subTotal}
                  onChange={(e) => setSubTotal(e.target.value)}
                  className="w-full px-2 bg-bgGray h-8 border-2 rounded-md text-sm"
                  required
                />
              </div>
              <div className="flex flex-col w-full md:w-1/3">
                <label className="text-sm font-medium text-gray-700 mb-1">GST</label>
                <input
                  type="number"
                  name="gst"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  className="w-full px-2 bg-bgGray h-8 border-2 rounded-md text-sm"
                  required
                />
              </div>
              <div className="flex flex-col w-full md:w-1/3">
                <label className="text-sm font-medium text-gray-700 mb-1">Total</label>
                <input
                  type="number"
                  name="total"
                  value={total}
                  readOnly
                  className="w-full px-2 bg-bgGray h-8 border-2 rounded-md text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* Button section */}
          <div className="flex flex-col md:flex-row gap-2">
            <Button
              type="button"
              className="w-full bg-transparent text-gray-600 py-5 border-2 border-gray-300 text-sm font-medium"
              onClick={handleResetForm}
            >
              Reset all fields
            </Button>

            <Button
              className="w-full text-white bg-primary py-5 text-sm font-medium"
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
