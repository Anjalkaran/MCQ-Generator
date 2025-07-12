'use server';

import * as z from 'zod';

const registerSchema = z.object({
  username: z.string().min(2, { message: 'Username must be at least 2 characters.' }),
  email: z.string().email({ message: 'Invalid email address.' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters.' }),
});

export async function registerUser(values: z.infer<typeof registerSchema>) {
  const validatedFields = registerSchema.safeParse(values);

  if (!validatedFields.success) {
    return { error: 'Invalid fields!' };
  }

  const { username, email, password } = validatedFields.data;

  // In a real application, you would hash the password and save the user to a database.
  // For example:
  // const hashedPassword = await bcrypt.hash(password, 10);
  // await db.user.create({ data: { name: username, email, password: hashedPassword } });

  console.log('Simulating user registration:');
  console.log('Username:', username);
  console.log('Email:', email);

  // For demonstration, we'll just simulate a success response.
  // We can also simulate an error, for example if the email is already taken.
  if (email === 'taken@example.com') {
    return { error: 'Email is already taken.' };
  }


  return { success: 'Registration successful!' };
}
