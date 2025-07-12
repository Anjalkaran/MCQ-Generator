'use server';

import { z } from 'zod';
import { getFirebaseAuth } from '@/lib/firebase';
import { updateUserDocument } from '@/lib/firestore';
import { updateProfile } from 'firebase/auth';

const profileUpdateSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  examCategory: z.enum(['MTS', 'POSTMAN', 'PA'], {
    errorMap: () => ({ message: 'Please select a valid exam category.' }),
  }),
});

export async function updateUserProfile(
  userId: string,
  formData: FormData
): Promise<{ success: boolean; message: string; }> {
  const auth = getFirebaseAuth();
  const currentUser = auth?.currentUser;

  if (!currentUser || currentUser.uid !== userId) {
    return { success: false, message: 'Authentication error. You can only update your own profile.' };
  }

  const rawFormData = {
    name: formData.get('name'),
    examCategory: formData.get('examCategory'),
  };

  const validatedFields = profileUpdateSchema.safeParse(rawFormData);

  if (!validatedFields.success) {
    return {
      success: false,
      message: validatedFields.error.flatten().fieldErrors.name?.[0] || validatedFields.error.flatten().fieldErrors.examCategory?.[0] || 'Validation failed.',
    };
  }

  try {
    // Update Firestore document
    await updateUserDocument(userId, validatedFields.data);

    // Update Firebase Auth display name if it has changed
    if (currentUser.displayName !== validatedFields.data.name) {
      await updateProfile(currentUser, { displayName: validatedFields.data.name });
    }

    return { success: true, message: 'Profile updated successfully!' };

  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, message: 'An unexpected error occurred while updating your profile.' };
  }
}
