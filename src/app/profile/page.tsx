"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { User, Camera, Bell, BellOff, Palette, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { applyTheme, themes, ThemeName } from "@/lib/themes";

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [name, setName] = useState("");
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>("whatsapp");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      const data = await res.json();
      setUser(data);
      setName(data.name);
      setSelectedTheme(data.theme || "whatsapp");
      setNotificationsEnabled(data.notificationsEnabled ?? true);
      applyTheme(data.theme || "whatsapp");
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          theme: selectedTheme,
          notificationsEnabled,
        }),
      });
      const updated = await res.json();
      setUser(updated);
      setIsEditing(false);
      applyTheme(selectedTheme);
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  const handleThemeChange = (theme: ThemeName) => {
    setSelectedTheme(theme);
    applyTheme(theme);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Profile
          </h1>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">
          {/* Profile Picture */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                {user.image ? (
                  <img
                    src={user.image}
                    alt={user.name}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <User className="h-12 w-12 text-primary" />
                )}
              </div>
              <button className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-2 shadow-lg">
                <Camera className="h-4 w-4" />
              </button>
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {user.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </p>
            </div>
          </div>

          {/* Edit Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </label>
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!isEditing}
                className="flex-1"
              />
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)}>Edit</Button>
              ) : (
                <Button onClick={handleSave}>Save</Button>
              )}
            </div>
          </div>

          {/* Notifications Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center gap-3">
              {notificationsEnabled ? (
                <Bell className="h-5 w-5 text-primary" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Notifications
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {notificationsEnabled ? "Enabled" : "Disabled"}
                </p>
              </div>
            </div>
            <Button
              variant={notificationsEnabled ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setNotificationsEnabled(!notificationsEnabled);
                fetch("/api/profile", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    notificationsEnabled: !notificationsEnabled,
                  }),
                });
              }}
            >
              {notificationsEnabled ? "Disable" : "Enable"}
            </Button>
          </div>

          {/* Theme Selector */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Theme
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(themes).map(([key, theme]) => (
                <button
                  key={key}
                  onClick={() => handleThemeChange(key as ThemeName)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedTheme === key
                      ? "border-primary bg-primary/5"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{ backgroundColor: `hsl(${theme.primary})` }}
                    />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {theme.name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Save Theme */}
          {selectedTheme !== user.theme && (
            <Button onClick={handleSave} className="w-full">
              Save Theme
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
