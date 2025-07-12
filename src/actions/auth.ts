'use server';

import * as z from 'zod';
import { createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { getFirebaseAuth, getFirebaseDb } from '@/lib/firebase';

const registerSchema = z.object({
  username: z.string().min(2, { message: 'Username must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
  confirmPassword: z.string(),
  examCategory: z.enum(['MTS', 'POSTMAN', 'PA'], { required_error: 'Please select an exam category.'}),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
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

  const { username, email, password, examCategory } = validatedFields.data;

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const userDoc: { username: string; email: string; examCategory: string; isAdmin?: boolean } = {
      username: username,
      email: email,
      examCategory: examCategory,
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
    return { error: `An unknown error occurred: ${error.code || 'Please try again.'}` };
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

const forgotPasswordSchema = z.object({
    email: z.string().email({ message: "Invalid email address." }),
});

export async function forgotPassword(values: z.infer<typeof forgotPasswordSchema>) {
    const auth = getFirebaseAuth();
    if (!auth) {
        return { error: 'Firebase is not configured correctly. Please check your environment variables.' };
    }

    const validatedFields = forgotPasswordSchema.safeParse(values);

    if (!validatedFields.success) {
        return { error: "Invalid email!" };
    }

    const { email } = validatedFields.data;

    try {
        await sendPasswordResetEmail(auth, email);
        return { success: "Password reset email sent!" };
    } catch (error: any) {
        console.error("Forgot Password Error:", error);
         switch (error.code) {
            case 'auth/user-not-found':
                // To prevent email enumeration, we can return a success message even if the user doesn't exist.
                return { success: "If an account with this email exists, a password reset link has been sent." };
            case 'auth/invalid-api-key':
                return { error: 'Invalid Firebase API Key. Please check your environment variables.' };
            default:
                return { error: `An unknown error occurred: ${error.code}` };
        }
    }
}
