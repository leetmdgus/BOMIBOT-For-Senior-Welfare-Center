import { AuthForm } from "@auth/components/auth-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-white px-4 py-10">
      <AuthForm initialMode="login" />
    </div>
  )
}
