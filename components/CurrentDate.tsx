"use client";

import { formatLongDate } from "@/lib/format";
import { useEffect, useState } from "react";

export function CurrentDate() {
  const [label, setLabel] = useState("");

  useEffect(() => {
    setLabel(formatLongDate(new Date().toISOString()));
  }, []);

  return (
    <p className="utility-date">
      <time dateTime={label ? new Date().toISOString() : undefined}>
        {label || "आज"}
      </time>
    </p>
  );
}
