import { useState, type FormEvent } from 'react';
import { useSetAtom } from 'jotai';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authAtom } from '@/atoms/authAtom';
import { ApiError, api } from '@/lib/api';

interface AuthFormProps {
  mode: 'login' | 'signup';
}

export function AuthForm({ mode }: AuthFormProps) {
  const isSignup = mode === 'signup';
  const setUser = useSetAtom(authAtom);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const { user } = isSignup
        ? await api.signup({ email, password, ...(name.trim() ? { name: name.trim() } : {}) })
        : await api.login({ email, password });
      setUser(user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">{isSignup ? 'Create an account' : 'Welcome back'}</CardTitle>
        <CardDescription>
          {isSignup
            ? 'Save your roadmaps and track your progress.'
            : 'Log in to pick up where you left off.'}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {isSignup && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Name (optional)</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={isSignup ? 8 : undefined}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
            {isSignup && (
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            )}
          </div>

          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Link
            to={isSignup ? '/login' : '/signup'}
            className="font-medium text-primary-strong underline-offset-4 hover:underline"
          >
            {isSignup ? 'Log in' : 'Sign up'}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
