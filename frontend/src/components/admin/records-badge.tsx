"use client";

import React from "react";

export function RecordsBadge({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <span className="text-lg">📋</span>
      <span className="font-black">Records</span>
      <span className="text-sm font-semibold text-foreground">{count}</span>
    </div>
  );
}

export default RecordsBadge;
