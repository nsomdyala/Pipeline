import { Suspense } from "react";
import { LoginLanding } from "@/components/auth/login-landing";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-bone text-muted">
          Loading…
        </div>
      }
    >
      <LoginLanding />
    </Suspense>
  );
}
