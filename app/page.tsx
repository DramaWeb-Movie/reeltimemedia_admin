import { redirect } from "next/navigation";
import { cookies } from "next/headers";

const SESSION_COOKIE = "reeltime-admin-session";

export default async function Home() {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;

  if (session === "authenticated") {
    redirect("/overview");
  }
  redirect("/login");
}
