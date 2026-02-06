"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { disconnectSquare, saveSquareWebhookKey } from "@/lib/data/actions";

interface SquareConnectProps {
  isConnected: boolean;
  merchantName?: string;
  locationName?: string;
  environment?: string;
  connectedAt?: string;
  hasWebhookKey?: boolean;
  returnUrl?: string;
}

export function SquareConnect({
  isConnected,
  merchantName,
  locationName,
  environment,
  connectedAt,
  hasWebhookKey,
  returnUrl = "/settings",
}: SquareConnectProps) {
  const [loading, setLoading] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [savingKey, setSavingKey] = useState(false);
  const [webhookKey, setWebhookKey] = useState("");

  useEffect(() => {
    // Check for connection success in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get("square_connected") === "true") {
      // Remove the parameter from URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleConnect = () => {
    setLoading(true);
    const encodedReturnUrl = encodeURIComponent(returnUrl);
    window.location.href = `/api/auth/square?returnUrl=${encodedReturnUrl}`;
  };

  const handleDisconnect = async () => {
    if (
      !confirm(
        "Are you sure you want to disconnect Square? This will disable payment processing for invoices."
      )
    ) {
      return;
    }
    setDisconnecting(true);
    try {
      const result = await disconnectSquare();
      if ("error" in result) {
        alert(result.error);
      } else {
        window.location.reload();
      }
    } catch {
      alert("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSaveWebhookKey = async () => {
    if (!webhookKey.trim()) {
      alert("Please enter a webhook signature key");
      return;
    }
    setSavingKey(true);
    try {
      const result = await saveSquareWebhookKey(webhookKey.trim());
      if ("error" in result) {
        alert(result.error);
      } else {
        alert("Webhook signature key saved successfully");
      }
    } catch {
      alert("Failed to save webhook key");
    } finally {
      setSavingKey(false);
    }
  };

  const appUrl = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrl = `${appUrl}/api/webhooks/square`;

  if (isConnected) {
    return (
      <div className="space-y-4">
        {/* Connected Status Card */}
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
                Square Connected
              </p>
              {merchantName && (
                <p className="text-xs text-green-700">
                  Merchant: {merchantName}
                </p>
              )}
              {locationName && (
                <p className="text-xs text-green-700">
                  Location: {locationName}
                </p>
              )}
              <p className="text-xs text-green-700">
                Environment: {environment === "production" ? "Production" : "Sandbox"}
              </p>
              {connectedAt && (
                <p className="text-xs text-green-700">
                  Connected: {new Date(connectedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleConnect}
                disabled={loading}
                size="sm"
                variant="outline"
                className="text-green-700 border-green-300 hover:bg-green-100"
              >
                {loading ? "Reconnecting..." : "Reconnect"}
              </Button>
              <Button
                onClick={handleDisconnect}
                disabled={disconnecting}
                size="sm"
                variant="outline"
                className="text-red-700 border-red-300 hover:bg-red-100"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>
        </Card>

        {/* Webhook Setup Instructions */}
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <svg
                  className="w-5 h-5 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-900 mb-2">
                  Webhook Setup Required
                </p>
                <p className="text-xs text-amber-700 mb-2">
                  To receive payment notifications, configure webhooks in your Square Developer Dashboard:
                </p>
                <ol className="text-xs text-amber-700 space-y-1 ml-4 list-decimal">
                  <li>Go to Square Developer Dashboard</li>
                  <li>Select your app, then Webhooks</li>
                  <li>
                    Add endpoint URL:{" "}
                    <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-800 break-all">
                      {webhookUrl}
                    </code>
                  </li>
                  <li>
                    Select events: <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-800">invoice.payment_made</code>
                  </li>
                  <li>Copy the signature key and paste below</li>
                </ol>
              </div>
            </div>

            {/* Webhook Key Input */}
            <div className="pt-3 border-t border-amber-200">
              <Label htmlFor="webhook-key" className="text-xs text-amber-900">
                Webhook Signature Key
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="webhook-key"
                  type="password"
                  placeholder="Enter webhook signature key"
                  value={webhookKey}
                  onChange={(e) => setWebhookKey(e.target.value)}
                  className="flex-1 text-sm bg-white"
                />
                <Button
                  onClick={handleSaveWebhookKey}
                  disabled={savingKey || !webhookKey.trim()}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  {savingKey ? "Saving..." : "Save"}
                </Button>
              </div>
              {hasWebhookKey && (
                <p className="text-xs text-green-700 mt-1">
                  Signature key is configured
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Not connected state
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
            Square Not Connected
          </p>
          <p className="text-xs text-amber-700 mb-3">
            Connect Square to enable payment processing for invoices. Clients
            will be able to pay invoices online via Square.
          </p>
          <Button
            onClick={handleConnect}
            disabled={loading}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700"
          >
            {loading ? "Connecting..." : "Connect Square"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
