import { redirect } from "next/navigation";

export default async function AgentRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/iwallets/${id}`);
}
