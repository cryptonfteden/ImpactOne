import { memo } from "react";

function ErrorState({ message = "Something went wrong." }) {
  return <p className="company-description negative">{message}</p>;
}

export default memo(ErrorState);
