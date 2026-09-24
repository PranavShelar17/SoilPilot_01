"use client";

import React from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { SoilHealthCardView } from "@/components/soil/SoilHealthCardView";

export default function SoilHealthCardPage() {
  return (
    <ProtectedRoute>
      <SoilHealthCardView />
    </ProtectedRoute>
  );
}
