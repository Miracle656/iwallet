import { redirect } from "next/navigation";

/** The landing was promoted to the homepage; keep old links working. */
export default function LandingRedirect() {
  redirect("/");
}
