export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <h1 className="font-display font-semibold text-3xl text-ink-primary mb-2">Privacy Policy</h1>
      <p className="text-sm text-ink-muted mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-sm text-ink-secondary mb-8">
        This is a template policy generated for the SkyChat demo project. Have a lawyer review and adapt it to your
        jurisdiction and actual data practices before using it in production.
      </div>

      <div className="text-ink-secondary leading-relaxed space-y-6">
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">1. Information we collect</h2>
          <p>
            We collect the information you provide directly: your username, email address, password (stored as a
            secure hash, never in plain text), profile photo, bio, and the messages you send. We also store
            technical metadata needed to operate the service, such as when you last logged in and IP addresses used
            for rate-limiting and security purposes.
          </p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">2. How we use your information</h2>
          <p>
            Your information is used to provide the core service: authenticating you, delivering messages to the
            right recipients, showing presence and read receipts, enforcing group roles, and sending transactional
            emails (email verification, password resets). We do not sell your data to third parties or use your
            messages for advertising.
          </p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">3. Message storage</h2>
          <p>
            Messages are stored so that conversation history remains available across devices and sessions. Deleting
            a message marks it as removed for all participants; it is not immediately purged from backups. You can
            export your full message history at any time from Settings.
          </p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">4. Data sharing</h2>
          <p>
            Group conversation participants can see messages sent to that group, along with your username, avatar,
            and role. Direct messages are visible only to the two participants. We do not share your data with
            third parties except where required by law.
          </p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">5. Security</h2>
          <p>
            Passwords are hashed using bcrypt and never stored or logged in plain text. Sessions use short-lived
            access tokens paired with rotated, database-backed refresh tokens. We apply rate limiting to
            authentication and messaging endpoints to reduce abuse.
          </p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">6. Your choices</h2>
          <p>
            You can update or delete your profile information, block other users, and export or request deletion of
            your data at any time by contacting support.
          </p>
        </section>
      </div>
    </div>
  );
}
