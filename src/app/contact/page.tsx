import { createClient } from '@/lib/supabase/server';
import HostContactForm from '@/app/contact/HostContactForm';

export default async function ContactPage() {
  let initialReplyEmail = '';
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) initialReplyEmail = user.email;
  } catch {
    // unsigned in or auth unavailable — form still works
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <HostContactForm initialReplyEmail={initialReplyEmail} />
    </main>
  );
}
