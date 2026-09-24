"use client";

import { useEffect } from "react";

export default function MePage() {
  useEffect(() => {
    window.location.href = "/profile";
  }, []);

  return null;
}
