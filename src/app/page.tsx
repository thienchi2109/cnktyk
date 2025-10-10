import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  try {
    const session = await auth();
    
    // Redirect authenticated users to their appropriate dashboard
    if (session?.user) {
      const dashboardUrl = getDashboardUrl(session.user.role);
      redirect(dashboardUrl);
    }

    // Redirect unauthenticated users directly to signin page
    redirect("/auth/signin");
  } catch (error) {
    // If there's any error with auth, redirect to signin
    console.error('Auth error:', error);
    redirect("/auth/signin");
  }
}

function getDashboardUrl(role: string): string {
  switch (role) {
    case "SoYTe":
      return "/dashboard/doh";
    case "DonVi":
      return "/dashboard/unit-admin";
    case "NguoiHanhNghe":
      return "/dashboard/practitioner";
    case "Auditor":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}
