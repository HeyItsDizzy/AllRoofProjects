import React from "react";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Avatar = ({ name = "", avatarUrl = "", size = "md" }) => {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-lg",
    xl: "w-32 h-32 text-xl",
    xxl: "w-64 h-64 text-2xl",

  };

  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "U";

  return avatarUrl ? (
    <img
  src={avatarUrl?.startsWith("blob:") ? avatarUrl : `${BASE_URL}${avatarUrl}`}
  alt={name}
  className={`rounded-full object-cover ${sizeClasses[size]}`}
  onError={(e) => {
    e.target.onerror = null;
    e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
  }}
/>


  ) : (
    <div
      className={`rounded-full bg-secondary text-white flex items-center justify-center font-medium ${sizeClasses[size]}`}
    >
      {initials}
    </div>
  );
};

export default Avatar;
