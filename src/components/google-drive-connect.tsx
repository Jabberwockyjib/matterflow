"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useState, useEffect } from "react";

interface GoogleDriveConnectProps {
  isConnected?: boolean;
  connectedAt?: string;
  returnUrl?: string;
}

export function GoogleDriveConnect({
  isConnected = false,
  connectedAt,
  returnUrl = "/",
}: GoogleDriveConnectProps) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check for connection success in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") === "true") {
      // Remove the parameter from URL
      window.history.replaceState(
        {},
        "",
        window.location.pathname
      );
    }
  }, []);

  const handleConnect = () => {
    setLoading(true);
    const encodedReturnUrl = encodeURIComponent(returnUrl);
    window.location.href = `/api/auth/google?returnUrl=${encodedReturnUrl}`;
  };

  if (isConnected) {
    return (
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-900">
              Google Drive Connected
            </p>
            {connectedAt && (
              <p className="text-xs text-green-700">
                Connected{" "}
                {new Date(connectedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-amber-50 border-amber-200">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg
            className="w-6 h-6 text-amber-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-900 mb-2">
            Google Drive Not Connected
          </p>
          <p className="text-xs text-amber-700 mb-3">
            Connect Google Drive to automatically organize documents in folders
            for each matter.
          </p>
          <Button
            onClick={handleConnect}
            disabled={loading}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
          >
            {loading ? "Connecting..." : "Connect Google Drive"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
