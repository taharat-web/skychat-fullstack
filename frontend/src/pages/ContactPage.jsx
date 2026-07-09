import { useState } from 'react';
import { Mail } from 'lucide-react';
import Input from '../components/common/Input';
import Button from '../components/common/Button';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const subject = encodeURIComponent(`SkyChat support request from ${form.name || 'a user'}`);
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`);
    window.location.href = `mailto:support@skychat.app?subject=${subject}&body=${body}`;
  }

  return (
    <div className="max-w-xl mx-auto px-5 py-16">
      <h1 className="font-display font-semibold text-3xl text-ink-primary mb-3">Contact us</h1>
      <p className="text-ink-secondary mb-8">
        Questions, bug reports, or feedback - we'd like to hear it. Fill out the form and it'll open in your email
        client ready to send, or reach us directly at{' '}
        <a href="mailto:support@skychat.app" className="text-accent-strong hover:underline">
          support@skychat.app
        </a>
        .
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-app-panel border border-app-border rounded-2xl p-6">
        <Input label="Your name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
        <Input
          label="Your email"
          type="email"
          value={form.email}
          onChange={(e) => update('email', e.target.value)}
          required
        />
        <div>
          <label className="block text-sm text-ink-secondary mb-1.5">Message</label>
          <textarea
            value={form.message}
            onChange={(e) => update('message', e.target.value)}
            rows={5}
            required
            className="w-full bg-app-elevated border border-app-border focus:border-accent rounded-lg px-3.5 py-2.5 text-sm text-ink-primary outline-none resize-none"
          />
        </div>
        <Button type="submit" className="self-start">
          <Mail size={16} className="mr-2" /> Send message
        </Button>
      </form>
    </div>
  );
}
