import { memo } from "react";

function Card({ className = "", children, ...props }) {
  return (
    <section className={className} {...props}>
      {children}
    </section>
  );
}

export default memo(Card);
