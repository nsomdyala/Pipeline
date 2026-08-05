import { SetPasswordForm } from "@/components/auth/set-password-form";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <SetPasswordForm token={params.token ?? ""} />;
}
