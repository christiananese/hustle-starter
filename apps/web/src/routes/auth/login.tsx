import SignInForm from "@/components/sign-in-form";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  return (
    <SignInForm
      onSwitchToSignUp={() => (window.location.href = "/auth/signup")}
    />
  );
}
