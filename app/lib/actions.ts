'use server';


import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { CustomerField } from '@/app/lib/definitions';

const date = new Date().toISOString().split('T')[0];

function getSqlClient() {
  try {
    return postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
  } catch (err) {
    console.error('Failed to create Postgres client:', err);
    throw err;
  }
}
const sql = getSqlClient();
 

 
const FormSchema = z.object({
  id: z.string(),
  customerId: z.string({
    invalid_type_error: 'Please select a customer.',
  }),
  amount: z.coerce
  .number()
  .gt(0, { message: 'Please enter an amount greater than $0.' }),

  status: z.enum(['pending', 'paid'],{    invalid_type_error: 'Please select an invoice status.',
  }),
  date: z.string(),
});


const UpdateInvoice = FormSchema.omit({ id: true, date: true });
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export type State = {
  errors?: {
    customerId?: string[];
    amount?: string[];
    status?: string[];
  };
  message?: string | null;
};
 
export async function createInvoice(prevState: State, formData: FormData) {
  // ...
  
   const validatedFields = CreateInvoice.safeParse({
  customerId: formData.get('customerId'),
  amount: formData.get('amount'),
  status: formData.get('status'),
});

if (validatedFields.success) {
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T') [0];

  console.log('CustomerId:', customerId);
    console.log('Amount in Cents:', amountInCents);
    console.log('Status:', status);
    console.log('Date:', date);
  // Use the validated fields to create the invoice
} else {
  // Handle the validation error
  console.error('Validation error:', validatedFields.error);
}

  try{
    const { customerId, amount: amountInCents, status } = validatedFields.data;
  const date = new Date().toISOString().split('T') [0];
  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;} catch (error) {
    console.error('Error creating invoice:', error);
  };
    revalidatePath('/dashboard/invoices');
      redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
};

export async function updateInvoice(
  id: string,
  prevState: State,
  formData: FormData,
) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Missing Fields. Failed to Update Invoice.',
    };
  }
 
  const { customerId, amount, status } = validatedFields.data;
  const amountInCents = amount * 100;
 
  try {
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
  } catch (error) {
    return { message: 'Database Error: Failed to Update Invoice.' };
  }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}