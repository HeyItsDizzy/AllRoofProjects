// JobBoard.jsx
import React, { useState, useContext } from "react";
import { Navigate } from "react-router-dom";
import JobTable from "@/appjobboard/components/JobTable";
import { useJobData } from "@/appjobboard/hooks/useJobData";
import { getExchangeRate } from "@/appjobboard/utils/exchangeRate";
import { AuthContext } from "@/auth/AuthProvider";


const JobBoard = () => {
  const { user } = useContext(AuthContext);

  // 1️⃣ Role guard
  if (!["Admin", "Estimator"].includes(user?.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  // 2️⃣ Job data from DB
  const { allJobs, months, loading, dataConfig } = useJobData();
  const [activeMonth, setActiveMonth] = useState("All");
  const [exchangeRate, setExchangeRate] = useState(7); // or use getExchangeRate()

  // 3️⃣ Exchange rate fetch
  const handleFetchRate = async () => {
    const rate = await getExchangeRate();
    setExchangeRate(rate);
  };

  if (loading) return <p className="p-4">Loading jobs...</p>;

  const filteredJobs = activeMonth === "All"
    ? allJobs
    : allJobs.filter(job => job.Month === activeMonth);

  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Job Board 2025</h1>
        <button onClick={handleFetchRate} className="bg-blue-600 text-white px-4 py-2 rounded">
          Refresh Exchange Rate (AUD → NOK)
        </button>
        <span className="text-gray-600">Current Rate: {exchangeRate}</span>
      </div>

      <div className="flex gap-2 overflow-x-auto">
        {["All", ...months].map(month => (
          <button
            key={month}
            onClick={() => setActiveMonth(month)}
            className={`px-4 py-2 rounded ${month === activeMonth ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          >
            {month}
          </button>
        ))}
      </div>

      <JobTable
        jobs={filteredJobs}
        config={dataConfig}
        exchangeRate={exchangeRate}
      />
    </div>
  );
};

export default JobBoard;
