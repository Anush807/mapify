import { atom } from 'jotai';
import type { User } from '@/lib/types';

/** null = logged out. `authReadyAtom` distinguishes that from "not checked yet". */
export const authAtom = atom<User | null>(null);

/** False until the initial GET /auth/me settles, so guards don't bounce early. */
export const authReadyAtom = atom(false);
