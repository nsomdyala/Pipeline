import { Suspense } from "react";
import { LoginLanding } from "@/components/auth/login-landing";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-navy text-white/60">
          Loading…
        </div>
      }
    >
      <LoginLanding />
    </Suspense>
  );
}
