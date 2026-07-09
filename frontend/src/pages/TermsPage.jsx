export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-16">
      <h1 className="font-display font-semibold text-3xl text-ink-primary mb-2">Terms of Service</h1>
      <p className="text-sm text-ink-muted mb-8">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="bg-accent/10 border border-accent/30 rounded-xl px-4 py-3 text-sm text-ink-secondary mb-8">
        This is a template terms of service generated for the SkyChat demo project. Have a lawyer review and adapt
        it before using it in production.
      </div>

      <div className="text-ink-secondary leading-relaxed space-y-6">
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">1. Acceptance of terms</h2>
          <p>
            By creating an account on SkyChat, you agree to these terms. If you don't agree, please don't use the
            service.
          </p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">2. Account eligibility</h2>
          <p>
            You must provide a valid email address and verify it before logging in. You are responsible for keeping
            your password confidential and for all activity under your account.
          </p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">3. Acceptable use</h2>
          <p>
            You agree not to use SkyChat to harass others, distribute illegal content, attempt to compromise the
            security of the service, or circumvent group moderation and blocking features. Group admins and
            moderators may remove or ban members who violate a group's own rules.
          </p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">4. Content ownership</h2>
          <p>
            You retain ownership of the messages and media you send. You grant SkyChat the limited right to store
            and transmit that content as needed to operate the service, including delivering it to the intended
            recipients and including it in your data exports.
          </p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">5. Group moderation</h2>
          <p>
            Group admins can manage membership, appoint moderators, and ban members. Moderators can remove members
            and messages within the groups they moderate. SkyChat is not responsible for moderation decisions made
            by individual group admins or moderators.
          </p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">6. Termination</h2>
          <p>
            We may suspend or terminate accounts that violate these terms. You may stop using the service and
            request account deletion at any time.
          </p>
        </section>
        <section>
          <h2 className="font-display font-semibold text-lg text-ink-primary mb-2">7. Disclaimer</h2>
          <p>
            SkyChat is provided "as is" without warranties of any kind. We aim for high availability but do not
            guarantee uninterrupted service.
          </p>
        </section>
      </div>
    </div>
  );
}
