'use server';

import * as z from 'zod';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';

const registerSchema = z.object({
  username: z.string().min(2, { message: 'Username must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export async function registerUser(values: z.infer<typeof registerSchema>) {
  const auth = getFirebaseAuth();
  const db = getFirebaseDb();

  if (!auth || !db) {
    return { error: 'Firebase is not configured correctly. Please check your environment variables.' };
  }

  const validatedFields = registerSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Invalid fields!' };
  }

  const { username, email, password } = validatedFields.data;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDoc: { username: string; email: string; isAdmin?: boolean } = {
      username: username,
      email: email,
    };
    
    if (email === 'admin@anjalkaran.com') {
      userDoc.isAdmin = true;
    }

    await setDoc(doc(db, 'users', user.uid), userDoc);

    return { success: 'Registration successful!' };
  } catch (error: any) {
    console.error("Firebase Registration Error:", error);
    if (error.code === 'auth/email-already-in-use') {
      return { error: 'Email is already in use.' };
    }
     if (error.code === 'auth/invalid-api-key') {
        return { error: 'Invalid Firebase API Key. Please check your environment variables.' };
    }
    return { error: `An unknown error occurred: ${error.code}` };
  }
}


const loginSchema = z.object({
    email: z.string().email({ message: "Invalid email address." }),
    password: z.string().min(1, { message: "Password is required." }),
});

export async function loginUser(values: z.infer<typeof loginSchema>) {
    const auth = getFirebaseAuth();
     if (!auth) {
      return { error: 'Firebase is not configured correctly. Please check your environment variables.' };
    }
    const validatedFields = loginSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid fields!" };
    }

    const { email, password } = validatedFields.data;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        return { success: "Login successful!" };
    } catch (error: any) {
        console.error("Firebase Login Error:", error);
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-credential':
                return { error: 'Invalid email or password.' };
            case 'auth/invalid-api-key':
                return { error: 'Invalid Firebase API Key. Please check your environment variables.' };
            default:
                return { error: `An unknown error occurred: ${error.code}` };
        }
    }
}
