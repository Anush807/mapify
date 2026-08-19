import { AuthForm } from '@/components/AuthForm';

export function Login() {
  return (
    <div className="flex justify-center py-12">
      <AuthForm mode="login" />
    </div>
  );
}
