import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSetAtom } from 'jotai';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { authAtom } from '@/atoms/authAtom';
import { ApiError, api } from '@/lib/api';
import { loginSchema, type LoginValues } from '@/lib/auth-schemas';

/** Errors the OAuth callback can redirect back with. */
const OAUTH_ERRORS: Record<string, string> = {
  google_failed: "Google sign-in didn't complete. Try again.",
  google_unavailable: 'Google sign-in is not available right now. Use your email and password.',
};

export function Login() {
  const setUser = useSetAtom(authAtom);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(
    OAUTH_ERRORS[params.get('error') ?? ''] ?? null,
  );

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginValues) => {
    setFormError(null);
    try {
      const { user } = await api.login(values);
      setUser(user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
      );
    }
  };

  const submitting = form.formState.isSubmitting;

  return (
    <AuthShell title="Welcome back" description="Log in to pick up where you left off.">
      <div className="flex flex-col gap-4">
        <GoogleButton label="Continue with Google" />
        <AuthDivider />

        {formError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? 'Logging in…' : 'Log in'}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground">
          Don’t have an account?{' '}
          <Link
            to="/signup"
            className="rounded-sm font-medium text-primary-strong underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
