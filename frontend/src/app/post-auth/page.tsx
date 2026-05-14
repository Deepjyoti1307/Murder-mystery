"use client";

import { useEffect } from "react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/lib/api";

export default function PostAuthPage() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const routeUser = async () => {
      const token = await getToken();
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
        "X-Dev-Clerk-Id": token ? "" : user.id,
      };

      await fetch(`${API_BASE_URL}/api/user/register`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          clerk_id: user.id,
          email: user.primaryEmailAddress?.emailAddress || "",
          name: user.fullName || user.firstName || "UNKNOWN",
        }),
      });

      const adminRes = await fetch(`${API_BASE_URL}/api/admin/check`, { headers });
      const adminData = await adminRes.json();
      if (adminData.is_admin) {
        router.replace("/admin");
      } else {
        router.replace("/dashboard");
      }
    };

    routeUser();
  }, [user, getToken, router]);

  return (
    <div className="bg-black min-h-screen flex items-center justify-center font-mono text-blood-red tracking-widest uppercase">
      ROUTING CLEARANCE...
    </div>
  );
}
