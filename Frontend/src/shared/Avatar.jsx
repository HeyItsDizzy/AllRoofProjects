/* PRODUCTION READY*/
 import React from "react";

// Base URL for static assets from environment variables
const BASE_URL = import.meta.env.VITE_STATIC_BASE_URL || "";

/**
 * Avatar component that displays user profile pictures or initials
 * @param {Object} props - Component props
 * @param {string} props.name - User's full name for generating initials and alt text
 * @param {string} props.avatarUrl - URL or path to the avatar image
 * @param {string} props.size - Size variant (sm, md, lg, xl, xxl, responsive)
 * @returns {JSX.Element} Avatar component with image or initials fallback
 */
const Avatar = ({ name = "", avatarUrl = "", size = "md" }) => {
  /**
   * Tailwind CSS classes for different avatar sizes
   * Each size includes width, height, and font size
   * 'responsive' size fills the parent container
   */
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-10 h-10 text-sm", 
    lg: "w-16 h-16 text-lg",
    xl: "w-32 h-32 text-xl",
    xxl: "w-64 h-64 text-2xl",
    responsive: "w-full h-full text-xl",
  };

  /**
   * Generates user initials from full name
   * Takes first letter of each word, max 2 characters
   * @returns {string} User initials or "U" as default
   */
  const generateInitials = () => {
    if (!name) return "U";
    
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  /**
   * Determines the appropriate image source URL
   * Handles blob URLs, external URLs, and static assets
   * @param {string} url - Avatar URL to process
   * @returns {string} Complete image source URL
   */
  const getImageSource = (url) => {
    if (!url) return "";
    
    // Use URL as-is for blob URLs and external URLs
    if (url.startsWith("blob:") || url.startsWith("http")) {
      return url;
    }
    
    // Prepend base URL for static assets
    return `${BASE_URL}${url}`;
  };

  /**
   * Handles image load errors by falling back to UI Avatars service
   * @param {Event} event - Image error event
   */
  const handleImageError = (event) => {
    const target = event.target;
    target.onerror = null; // Prevent infinite loops
    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "User")}`;
  };

  const initials = generateInitials();
  const imageSrc = getImageSource(avatarUrl);
  const baseClasses = `rounded-full ${sizeClasses[size]}`;

  // Render image avatar if URL is provided
  if (avatarUrl) {
    return (
      <div className={`${baseClasses} overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0`}>
        <img
          src={imageSrc}
          alt={`${name}'s avatar` || "User avatar"}
          className="w-full h-full object-cover"
          onError={handleImageError}
        />
      </div>
    );
  }

  // Render initials fallback when no image URL is provided
  return (
    <div
      className={`${baseClasses} bg-secondary text-white flex items-center justify-center font-medium flex-shrink-0`}
      role="img"
      aria-label={`${name}'s initials` || "User initials"}
    >
      {initials}
    </div>
  );
};

export default Avatar;
