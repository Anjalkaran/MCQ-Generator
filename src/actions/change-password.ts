'use server';

import { z } from 'zod';
import { getFirebaseAuth } from '@/lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'Current password is required.' }),
  newPassword: z.string().min(6, { message: 'New password must be at least 6 characters.' }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "New passwords don't match.",
  path: ['confirmPassword'],
});

export async function changePassword(
  prevState: any,
  formData: FormData
): Promise<{ success: boolean; message: string; }> {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  if (!currentUser || !currentUser.email) {
    return { success: false, message: 'Authentication error. Please log in again.' };
  }

  const rawFormData = {
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  };

  const validatedFields = changePasswordSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
      const fieldErrors = validatedFields.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0];
      return {
        success: false,
        message: firstError || 'Validation failed.',
      };
  }
  
  const { currentPassword, newPassword } = validatedFields.data;

  try {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPassword);
    
    return { success: true, message: 'Password updated successfully!' };

  } catch (error: any) {
    console.error('Error changing password:', error);
    let message = 'An unexpected error occurred.';
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'The current password you entered is incorrect.';
    }
    return { success: false, message };
  }
}
