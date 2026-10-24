import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import LandingClient from "./landing-client";

export default async function PublicLandingPage() {
  // Authenticated visitors go straight to the dashboard. This must use
  // getSession() (cookie `session_token`, HMAC-signed): the earlier version read
  // the pre-migration unsigned `session` cookie, which no longer exists, so
  // signed-in users always landed on the marketing page and reported the app
  // "not keeping me logged in" (tester feedback 2026-10-23).
  const session = await getSession();
  if (session) {
    redirect("/overview");
  }

  return <LandingClient />;
}
