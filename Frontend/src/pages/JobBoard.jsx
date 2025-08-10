// src/pages/JobBoard.jsx
import React, { useState, useContext, useEffect } from "react";
import { Navigate } from "react-router-dom";
import JobTable from "@/appjobboard/components/JobTable";
import { getExchangeRate } from "@/shared/jobPricingUtils";
import { AuthContext } from "@/auth/AuthProvider";
import useAxiosSecure from "@/hooks/AxiosSecure/useAxiosSecure";
import AssignClient from "@/components/AssignClient";
import { basePlanTypes } from "@/shared/planTypes";

const JobBoard = () => {
  const { user } = useContext(AuthContext);
  const axiosSecure = useAxiosSecure();

  // 1️⃣ Role guard
  if (!["Admin", "Estimator"].includes(user?.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  // 2️⃣ State for clients
  const [clients, setClients] = useState([]);

  // 3️⃣ State for jobs + month filtering
  const [jobs, setJobs] = useState([]);
  const [months, setMonths] = useState([]);
  const [activeMonth, setActiveMonth] = useState("All");
  const [loadingJobs, setLoadingJobs] = useState(true);

  // 3a️⃣ Bring in your pricing config for the table
  const [dataConfig] = useState({
    planTypes: basePlanTypes,
  });

  // 4️⃣ Modal & live‐update state
  const [openColumn, setOpenColumn] = useState(null);
  const [isClientModalVisible, setClientModalVisible] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);

  // 5️⃣ Exchange rate
  const [exchangeRate, setExchangeRate] = useState(7);
  const handleFetchRate = async () => {
    const rate = await getExchangeRate();
    setExchangeRate(rate);
  };

  // ──────────────────────────────────────────────────────────
  // Fetch clients
  useEffect(() => {
    axiosSecure
      .get("/clients")
      .then(res => setClients(res.data || []))
      .catch(err => console.error("Failed to fetch clients:", err));
  }, [axiosSecure]);

// Fetch jobs and derive months (same as AllProjects)
useEffect(() => {
  const fetchJobs = async () => {
    setLoadingJobs(true);
    try {
      // use the same relative route as your Admin table
      const response = await axiosSecure.get("/projects/get-projects");
      console.log("Full Job Data Response:", response.data);  // ✅ debug

      // API returns { data: [...] }
      const payload = response.data.data || [];
      setJobs(payload);

      // derive unique month names and sort
      const uniqueMonths = Array.from(
        new Set(payload.map(job => job.Month).filter(Boolean))
      ).sort();
      setMonths(uniqueMonths);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      setJobs([]);
      setMonths([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  fetchJobs();
}, [axiosSecure]);



  // Live‐update callback for AssignClient
  const updateJobClients = (jobId, linkedClients) => {
    setJobs(prev =>
      prev.map(j => (j._id === jobId ? { ...j, linkedClients } : j))
    );
  };

  const openAssignClientModal = job => {
    setSelectedJob(job);
    setClientModalVisible(true);
  };
  const closeAssignClientModal = () => {
    setSelectedJob(null);
    setClientModalVisible(false);
  };

  // ──────────────────────────────────────────────────────────
  if (loadingJobs) return <p className="p-4">Loading jobs...</p>;

  // Filter by month
  const filteredJobs =
    activeMonth === "All"
      ? jobs
      : jobs.filter(job => job.Month === activeMonth);

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Job Board 2025</h1>
        <button
          onClick={handleFetchRate}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Refresh Exchange Rate (AUD → NOK)
        </button>
        <span className="text-gray-600">Current Rate: {exchangeRate}</span>
      </div>

      {/* Month filter buttons */}
      <div className="flex gap-2 overflow-x-auto">
        {["All", ...months].map(month => (
          <button
            key={month}
            onClick={() => setActiveMonth(month)}
            className={`px-4 py-2 rounded ${
              month === activeMonth
                ? "bg-blue-500 text-white"
                : "bg-gray-200"
            }`}
          >
            {month}
          </button>
        ))}
      </div>

      {/* Jobs table */}
      <JobTable
        jobs={filteredJobs}
        config={dataConfig}
        exchangeRate={exchangeRate}
        clients={clients}
        openColumn={openColumn}
        setOpenColumn={setOpenColumn}
        openAssignClient={openAssignClientModal}
      />

      {/* Assign‐Client modal */}
      {isClientModalVisible && selectedJob && (
        <AssignClient
          clients={clients}
          projectId={selectedJob._id}
          project={selectedJob}
          closeModal={closeAssignClientModal}
          updateProjectClients={updateJobClients}
        />
      )}
    </div>
  );
};

export default JobBoard;
