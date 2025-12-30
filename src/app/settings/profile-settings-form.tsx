"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

type ProfileSettingsFormProps = {
  profile: Profile;
};

export function ProfileSettingsForm({ profile }: ProfileSettingsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState(profile.full_name || "");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword && newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Implement password change action
      toast.success("Password updated successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast.error("Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Implement profile update action
      toast.success("Profile updated successfully");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your display name and contact information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileUpdate} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.user_id}
                disabled
                className="bg-slate-50"
              />
              <p className="text-xs text-slate-500 mt-1">
                Email cannot be changed
              </p>
            </div>

            <div>
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your full name"
              />
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Update your password to keep your account secure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
              />
              <p className="text-xs text-slate-500 mt-1">
                At least 8 characters
              </p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={8}
              />
            </div>

            <Button type="submit" disabled={isSubmitting || !newPassword}>
              {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Email Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Email Preferences</CardTitle>
          <CardDescription>
            Manage which emails you receive
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Intake Notifications</p>
                <p className="text-xs text-slate-500">
                  Get notified when clients submit intake forms
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>

            <div className="flex items-center justify-between">
              <p className="font-medium text-sm">Invoice Reminders</p>
              <div>
                <p className="text-xs text-slate-500">
                  Receive reminders about overdue invoices
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Activity Alerts</p>
                <p className="text-xs text-slate-500">
                  Get notified about matter activity
                </p>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">Weekly Summary</p>
                <p className="text-xs text-slate-500">
                  Receive a weekly summary of your matters
                </p>
              </div>
              <input type="checkbox" className="h-4 w-4" />
            </div>

            <Button type="button" variant="outline">
              Save Preferences
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
