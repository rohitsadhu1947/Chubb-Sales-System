import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth-actions"

export default async function HomePage() {
  const user = await getCurrentUser()

  if (user) {
    redirect("/admin/dashboard")
  } else {
    redirect("/login")
  }
}
