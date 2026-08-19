import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSetAtom } from 'jotai';
import { Link } from 'react-router-dom';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AuthShell } from '@/components/auth/AuthShell';
import { AuthDivider } from '@/components/auth/AuthDivider';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { CheckEmail } from '@/components/auth/CheckEmail';
import { authAtom } from '@/atoms/authAtom';
import { ApiError, api } from '@/lib/api';
import { PASSWORD_MIN_LENGTH, signupSchema, type SignupValues } from '@/lib/auth-schemas';

export function Signup() {
  const setUser = useSetAtom(authAtom);
  const [formError, setFormError] = useState<string | null>(null);
  /** Set on success — swaps the card contents in place instead of routing away. */
  const [signedUpEmail, setSignedUpEmail] = useState<string | null>(null);

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = async (values: SignupValues) => {
    setFormError(null);
    try {
      const { user } = await api.signup(values);
      // A session is issued immediately, so the app is usable while unverified.
      setUser(user);
      setSignedUpEmail(user.email);
    } catch (err) {
      setFormError(
        err instanceof ApiError ? err.message : 'Something went wrong. Try again.',
      );
    }
  };

  const submitting = form.formState.isSubmitting;

  if (signedUpEmail) {
    return (
      <AuthShell title="Check your email">
        <CheckEmail email={signedUpEmail} />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" description="Save your roadmaps and track progress.">
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
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormDescription>At least {PASSWORD_MIN_LENGTH} characters.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting ? 'Creating account…' : 'Create account'}
            </Button>
          </form>
        </Form>

        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            to="/login"
            className="rounded-sm font-medium text-primary-strong underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
