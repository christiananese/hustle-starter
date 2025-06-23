import SignUpForm from "@/components/sign-up-form";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/auth/signup")({
  component: SignUpPage,
});

function SignUpPage() {
  return (
    <SignUpForm
      onSwitchToSignIn={() => (window.location.href = "/auth/login")}
    />
  );
}
