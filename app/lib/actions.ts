'use server';

import { z } from 'zod';
import postgres from 'postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

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
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.enum(['pending', 'paid']),
  date: z.string(),
});


const UpdateInvoice = FormSchema.omit({ id: true, date: true });
const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
    const amountInCents = amount * 100;
    const date = new Date().toISOString().split('T')[0];

    try{
      console.log({ customerId, amount, status, amountInCents, date });

     await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;}
    catch (error) {
    console.error('Error creating invoice:', error);
    revalidatePath('/dashboard/invoices');
      redirect('/dashboard/invoices');
}
};

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
};

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  const amountInCents = amount * 100;
  try{ 
    console.log({ customerId, amount, status, amountInCents, date });

    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;}
  catch(error) {
    console.error('Error updating invoice:', error);
  }

 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}