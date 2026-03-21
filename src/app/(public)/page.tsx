import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import LandingClient from "./landing-client";

export default async function PublicLandingPage() {
  // If user is authenticated, send them to the dashboard
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (session?.value) {
    try {
      const parsed = JSON.parse(
        Buffer.from(session.value, "base64").toString()
      );
      if (parsed.userId && new Date(parsed.expiresAt) > new Date()) {
        redirect("/daily");
      }
    } catch {
      // Invalid session, show landing page
    }
  }

  return <LandingClient />;
}
