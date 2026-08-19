import { AuthForm } from '@/components/AuthForm';

export function Signup() {
  return (
    <div className="flex justify-center py-12">
      <AuthForm mode="signup" />
    </div>
  );
}
