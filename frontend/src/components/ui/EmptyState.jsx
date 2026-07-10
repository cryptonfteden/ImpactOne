import { memo } from "react";

function EmptyState({ message = "No data available." }) {
  return <p className="company-description subtle">{message}</p>;
}

export default memo(EmptyState);
