import { AuthForm } from "@/components/auth/auth-form"

export default function SignupPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-white px-4 py-10">
      <AuthForm initialMode="signup" />
    </div>
  )
}
