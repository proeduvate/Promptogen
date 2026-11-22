import { useState, useEffect } from "react";

export default function UserAvatar({ user, size = "md", className = "" }) {
  const [imgError, setImgError] = useState(false);

  // Reset error state when user or avatar URL changes
  useEffect(() => {
    setImgError(false);
  }, [user?.avatar_url]);

  const displayName = user?.name || user?.email?.split("@")[0] || "User";
  const initial = displayName.charAt(0).toUpperCase() || "U";
  const avatarUrl = user?.avatar_url;

  const sizeClasses = {
    sm: "size-7 text-[12px]",
    md: "size-8 text-[13px]",
    lg: "size-10 text-[15px]",
  };

  const roundedClasses = {
    sm: "rounded-full",
    md: "rounded-full",
    lg: "rounded-xl",
  };

  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const roundedClass = roundedClasses[size] || roundedClasses.md;

  if (avatarUrl && !imgError) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        referrerPolicy="no-referrer"
        onError={() => setImgError(true)}
        className={`${sizeClass} ${roundedClass} shrink-0 object-cover ring-1 ring-white/10 ${className}`}
      />
    );
  }

  return (
    <div
      className={`grid ${sizeClass} shrink-0 place-items-center ${roundedClass} bg-gradient-to-br from-blue-600 to-indigo-600 font-semibold text-white ring-1 ring-white/10 shadow-sm ${className}`}
    >
      {initial}
    </div>
  );
}
