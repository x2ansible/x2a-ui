"use client";

/**
 * useAdminAuth
 * - Authenticates user for admin pages
 * - Redirects unauthenticated or unauthorized users
 * - Returns admin status, session, navigation helpers, and flags for UI logic
 *
 * Usage:
 *   const { isAdmin, isAuthenticated, navigateBackToApp } = useAdminAuth();
 */

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function useAdminAuth() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Add all admin emails here
  const allowedEmails = ["rbanda@redhat.com"];

  // Determine admin privilege
  const isAdmin =
    (session?.user?.email && allowedEmails.includes(session.user.email)) ||
    process.env.NODE_ENV === "development";

  // Workflow context for navigation
  const fromWorkflow = searchParams?.get("from") || "x2ansible";

  // Handle auth/redirect
  useEffect(() => {
    if (status === "unauthenticated") {
      // Redirect to login, preserve intended return path
      router.replace(`/?redirect=admin&from=${fromWorkflow}`);
      return;
    }
    if (status === "authenticated" && !isAdmin) {
      // Redirect non-admins to workflow
      router.replace(`/run?workflow=${fromWorkflow}`);
      return;
    }
  }, [status, isAdmin, router, fromWorkflow]);

  // Helper to go back to workflow page
  const navigateBackToApp = () => {
    router.push(`/run?workflow=${fromWorkflow}`);
  };

  return {
    session,
    status,
    isAdmin,
    fromWorkflow,
    navigateBackToApp,
    isLoading: status === "loading",
    isAuthenticated: status === "authenticated",
    isUnauthenticated: status === "unauthenticated",
  };
}
