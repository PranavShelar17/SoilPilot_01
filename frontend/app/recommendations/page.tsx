"use client";

import React from "react";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { RecommendationsView } from "@/components/recommendations/RecommendationsView";

export default function RecommendationsPage() {
  return (
    <ProtectedRoute>
      <RecommendationsView />
    </ProtectedRoute>
  );
}

