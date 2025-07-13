
'use server';

import { z } from 'zod';
import { getFirebaseAuth } from '@/lib/firebase';
import { updateUserDocument } from '@/lib/firestore';
import { updateProfile } from 'firebase/auth';
import { revalidatePath } from 'next/cache';

const profileUpdateSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  examCategory: z.enum(['MTS', 'POSTMAN', 'PA'], {
    errorMap: () => ({ message: 'Please select a valid exam category.' }),
  }),
});

export async function updateUserProfile(
  userId: string,
  prevState: any,
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
      const fieldErrors = validatedFields.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0];
      return {
        success: false,
        message: firstError || 'Validation failed.',
      };
  }

  try {
    // Update Firestore document
    await updateUserDocument(userId, validatedFields.data);

    // Update Firebase Auth display name if it has changed
    if (currentUser.displayName !== validatedFields.data.name) {
      await updateProfile(currentUser, { displayName: validatedFields.data.name });
    }
    
    // Revalidate relevant paths to show updated data
    revalidatePath('/dashboard/profile');
    revalidatePath('/dashboard/layout');


    return { success: true, message: 'Profile updated successfully!' };

  } catch (error) {
    console.error('Error updating profile:', error);
    return { success: false, message: 'An unexpected error occurred while updating your profile.' };
  }
}
