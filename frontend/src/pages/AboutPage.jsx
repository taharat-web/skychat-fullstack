import { ShieldCheck, Zap, Users } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <h1 className="font-display font-semibold text-3xl md:text-4xl text-ink-primary mb-6">About SkyChat</h1>

      <div className="prose-like text-ink-secondary leading-relaxed space-y-5">
        <p>
          SkyChat started from a simple frustration: most chat apps either bury useful features behind clutter, or
          strip things down so far that group conversations become unmanageable. We wanted something in between -
          fast, focused, and built around how people actually talk to each other, one-on-one and in groups.
        </p>
        <p>
          Every conversation on SkyChat happens in real time over WebSockets, with proper delivery and read receipts,
          typing indicators, and presence - the details that make a chat app feel alive instead of like a form you're
          filling out. Group conversations get real moderation: admins and moderators have distinct, enforced
          permissions, not just different-looking buttons on the same access.
        </p>
        <p>
          We also believe your conversation history belongs to you. That's why every account can export its full
          message history at any time, in a plain, portable format - no waiting on a support ticket.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-6 mt-12">
        <div className="text-center">
          <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center mx-auto mb-3">
            <Zap size={20} className="text-accent-strong" />
          </div>
          <h3 className="font-medium text-ink-primary mb-1">Built for speed</h3>
          <p className="text-sm text-ink-secondary">Messages arrive instantly, not eventually.</p>
        </div>
        <div className="text-center">
          <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center mx-auto mb-3">
            <Users size={20} className="text-accent-strong" />
          </div>
          <h3 className="font-medium text-ink-primary mb-1">Made for groups</h3>
          <p className="text-sm text-ink-secondary">Real roles and moderation, enforced server-side.</p>
        </div>
        <div className="text-center">
          <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={20} className="text-accent-strong" />
          </div>
          <h3 className="font-medium text-ink-primary mb-1">Secure by default</h3>
          <p className="text-sm text-ink-secondary">Hashed credentials, verified emails, rate-limited endpoints.</p>
        </div>
      </div>
    </div>
  );
}
