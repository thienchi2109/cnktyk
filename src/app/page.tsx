import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";

export default async function Home() {
  const session = await getCurrentSession();
  
  // Redirect authenticated users to their appropriate dashboard
  if (session?.user) {
    const dashboardUrl = getDashboardUrl(session.user.role);
    redirect(dashboardUrl);
  }

  // Redirect unauthenticated users directly to signin page
  redirect("/auth/signin");
}

function getDashboardUrl(role: string): string {
  switch (role) {
    case "SoYTe":
      return "/so-y-te/dashboard";
    case "DonVi":
      return "/don-vi/dashboard";
    case "NguoiHanhNghe":
      return "/nguoi-hanh-nghe/dashboard";
    case "Auditor":
      return "/dashboard";
    default:
      return "/dashboard";
  }
}
