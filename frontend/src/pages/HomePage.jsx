import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Zap,
  Users,
  UserPlus,
  CheckCheck,
  ShieldCheck,
  DownloadCloud,
  ArrowRight,
} from 'lucide-react';
import Button from '../components/common/Button';
import Avatar from '../components/common/Avatar';

const DEMO_STEPS = [
  { type: 'message', from: 'alice', text: 'Hey! Did you see the new group chat roles?' },
  { type: 'typing', from: 'bob' },
  { type: 'message', from: 'bob', text: 'Yeah, made me admin 😄 setting up moderators now' },
  { type: 'seen' },
  { type: 'pause' },
];

function LiveChatDemo() {
  const [step, setStep] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const current = DEMO_STEPS[step % DEMO_STEPS.length];
    let delay = 1400;

    if (current.type === 'message') {
      setVisibleMessages((prev) => [...prev, current]);
      setIsTyping(false);
      delay = 1600;
    } else if (current.type === 'typing') {
      setIsTyping(true);
      delay = 1300;
    } else if (current.type === 'seen') {
      setSeen(true);
      delay = 1800;
    } else if (current.type === 'pause') {
      delay = 1200;
    }

    const isLastStep = step % DEMO_STEPS.length === DEMO_STEPS.length - 1;
    const timer = setTimeout(() => {
      if (isLastStep) {
        setVisibleMessages([]);
        setIsTyping(false);
        setSeen(false);
      }
      setStep((s) => s + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [step]);

  return (
    <div className="w-full max-w-sm bg-app-panel border border-app-border rounded-2xl shadow-panel overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-app-border bg-app-elevated">
        <Avatar name="Bob" size="sm" isOnline />
        <div>
          <p className="text-sm font-medium text-ink-primary">Bob</p>
          <p className="text-[11px] text-ink-secondary">Online</p>
        </div>
      </div>

      <div className="h-56 px-4 py-4 flex flex-col justify-end gap-2 overflow-hidden">
        {visibleMessages.map((m, i) => (
          <div key={i} className={`flex ${m.from === 'alice' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                m.from === 'alice' ? 'bg-accent-deep text-ink-primary rounded-br-sm' : 'bg-app-elevated text-ink-primary rounded-bl-sm'
              }`}
            >
              {m.text}
              {m.from === 'alice' && (
                <span className="inline-flex ml-1.5 align-middle">
                  <CheckCheck size={12} className={seen ? 'text-accent-strong' : 'text-ink-secondary'} />
                </span>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-app-elevated rounded-2xl rounded-bl-sm px-3 py-2.5 flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-ink-secondary animate-blink" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-ink-secondary animate-blink" style={{ animationDelay: '160ms' }} />
              <span className="w-1.5 h-1.5 rounded-full bg-ink-secondary animate-blink" style={{ animationDelay: '320ms' }} />
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-app-border">
        <div className="bg-app-elevated rounded-full px-4 py-2 text-xs text-ink-muted">Type a message</div>
      </div>
    </div>
  );
}

const FEATURES = [
  { icon: Zap, title: 'Instant delivery', description: 'WebSocket-powered messaging with typing indicators and live presence, no refresh required.' },
  { icon: Users, title: 'Group roles that matter', description: 'Admins and moderators are enforced on the backend - not just hidden UI buttons.' },
  { icon: UserPlus, title: 'Friend requests', description: 'Connect on your terms. Direct messages only open up once a friend request is accepted.' },
  { icon: CheckCheck, title: 'Delivery & seen status', description: 'Know exactly when a message reached someone, and when they read it.' },
  { icon: ShieldCheck, title: 'Secure by default', description: 'Hashed passwords, rotated sessions, and rate-limited endpoints from day one.' },
  { icon: DownloadCloud, title: 'Own your history', description: 'Export any conversation, or your entire chat history, as a portable JSON file.' },
];

const STEPS = [
  { title: 'Create your account', description: 'Sign up and verify your email - no guest access, ever.' },
  { title: 'Add friends or a group', description: 'Search for people, send requests, or spin up a group in seconds.' },
  { title: 'Start chatting', description: 'Real-time messages, typing indicators, and read receipts, right away.' },
];

export default function HomePage() {
  return (
    <div>
      <section className="max-w-6xl mx-auto px-5 pt-14 md:pt-20 pb-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h1 className="font-display font-semibold text-4xl md:text-5xl text-ink-primary leading-tight tracking-tight">
            Real-time messaging, <span className="text-accent-strong">without the noise.</span>
          </h1>
          <p className="text-ink-secondary text-lg mt-5 max-w-md">
            SkyChat is a fast, secure chat app for one-to-one and group conversations - with real roles, real
            presence, and message history that's actually yours.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/signup">
              <Button size="lg">
                Sign up free <ArrowRight size={17} className="ml-2" />
              </Button>
            </Link>
            <Link to="/login">
              <Button size="lg" variant="outline">
                Log in
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex justify-center">
          <LiveChatDemo />
        </div>
      </section>

      <section className="border-t border-app-border">
        <div className="max-w-6xl mx-auto px-5 py-16">
          <h2 className="font-display font-semibold text-2xl md:text-3xl text-ink-primary text-center mb-12">
            Everything a modern chat app needs
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-app-panel border border-app-border rounded-2xl p-6">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
                  <Icon size={19} className="text-accent-strong" />
                </div>
                <h3 className="font-medium text-ink-primary mb-1.5">{title}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-app-border">
        <div className="max-w-4xl mx-auto px-5 py-16">
          <h2 className="font-display font-semibold text-2xl md:text-3xl text-ink-primary text-center mb-12">
            Up and running in three steps
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="w-9 h-9 rounded-full bg-accent text-white font-display font-semibold flex items-center justify-center mx-auto mb-4">
                  {i + 1}
                </div>
                <h3 className="font-medium text-ink-primary mb-1.5">{step.title}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-app-border">
        <div className="max-w-4xl mx-auto px-5 py-16 text-center">
          <h2 className="font-display font-semibold text-2xl md:text-3xl text-ink-primary mb-3">Ready to start chatting?</h2>
          <p className="text-ink-secondary mb-7">It takes less than a minute to create an account.</p>
          <Link to="/signup">
            <Button size="lg">
              Sign up free <ArrowRight size={17} className="ml-2" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
