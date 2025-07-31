//Client control this until one of the estimating team members takes over
// after estimator is finishe and estimate is "Estimate Completed" they regain control
export const projectStatuses = [
    { label: "New Lead", color: "bg-white text-black" },
    { label: "Estimate Requested", color: "bg-blue-400 text-white" },
    { label: "Estimate Completed", color: "bg-blue-600 text-white" },
    { label: "Quote Sent", color: "bg-yellow-300 text-black" },
    { label: "Approved", color: "bg-green-600 text-white" },
    { label: "Project Active", color: "bg-yellow-500 text-black" },
    { label: "Completed", color: "bg-green-700 text-white" },
    { label: "Cancelled", color: "bg-gray-200 text-gray-500" },
    { label: "Job lost", color: "bg-red-200 text-gray-500" },
  ];
  
  //to be used in the job board and 'displayed only' in the project table with a prefix of 'ART:' 
  export const estimateStatuses = [
    { label: "Estimate Requested", color: "bg-blue-400 text-white" },
    { label: "Assigned",        color: "bg-gray-200 text-gray-800" },
    { label: "In Progress",     color: "bg-yellow-500 text-black" },
    //{ label: "Sent",            color: "bg-teal-500 text-white" },
    { label: "RFI",             color: "bg-red-500 text-white" },
    { label: "HOLD",            color: "bg-red-700 text-white" },
    { label: "Small Fix",       color: "bg-pink-300 text-black" },
    { label: "Cancelled", color: "bg-gray-200 text-gray-500" },
    { label: "Estimate Completed",        color: "bg-green-500 text-white" },
  ];
    