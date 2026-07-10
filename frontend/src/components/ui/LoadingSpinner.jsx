import { memo } from "react";

function LoadingSpinner({ className = "loading-spinner", label = "Loading" }) {
  return <span className={className} aria-label={label} />;
}

export default memo(LoadingSpinner);
