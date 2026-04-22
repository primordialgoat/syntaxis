import { useState } from 'react';
import { motion } from 'framer-motion';
import posthog from 'posthog-js';
import Nav from './Nav';
import Footer from './Footer';
import type { Route } from './routes';

interface Props {
  onNavigate: (route: Route) => void;
}

export default function Feedback({ onNavigate }: Props) {
  const [msg, setMsg] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const handleSend = () => {
    const trimmed = msg.trim();
    if (!trimmed) return;
    posthog.capture('feedback_submitted', {
      message_length: trimmed.length,
      has_email: email.trim().length > 0,
    });
    setSent(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="min-h-screen"
    >
      <Nav currentRoute="feedback" onNavigate={onNavigate} />

      <div className="max-w-[560px] mx-auto px-6 sm:px-10 pt-16 sm:pt-[72px] pb-10">
        <div
          className="font-sans text-[11px] uppercase mb-4"
          style={{ color: '#c9a84c', letterSpacing: '0.22em' }}
        >
          Feedback
        </div>
        <h1
          className="font-serif text-[32px] sm:text-[40px] font-medium m-0"
          style={{ color: '#eae3d4', letterSpacing: '-0.01em' }}
        >
          Send a note
        </h1>
        <p
          className="mt-3.5 font-serif italic text-base leading-[1.6]"
          style={{ color: '#9a9284' }}
        >
          Bug reports, suggestions, or classroom stories are all welcome. We will respond as soon
          as possible!
        </p>

        {sent ? (
          <div
            className="mt-9 py-7 px-[30px]"
            style={{
              border: '1px solid rgba(201,168,76,0.25)',
              borderLeft: '3px solid #c9a84c',
              borderRadius: '10px',
              background: 'rgba(201,168,76,0.05)',
            }}
          >
            <p
              className="font-serif italic text-lg m-0"
              style={{ color: '#eae3d4' }}
            >
              Gratias tibi ago. Your note has been received.
            </p>
          </div>
        ) : (
          <div className="mt-9">
            <label
              className="block font-sans text-[11px] uppercase mb-2"
              style={{ letterSpacing: '0.16em', color: '#6e6558' }}
            >
              Your message
            </label>
            <textarea
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder="Bug, suggestion, or just saying hello…"
              className="w-full h-40 py-3.5 px-4 rounded-[10px] font-serif text-base resize-y outline-none mb-[18px] box-border focus:ring-1 focus:ring-amber-500/30 transition-all"
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#eae3d4',
              }}
            />

            <label
              className="block font-sans text-[11px] uppercase mb-2"
              style={{ letterSpacing: '0.16em', color: '#6e6558' }}
            >
              Email{' '}
              <span
                className="normal-case"
                style={{ letterSpacing: 0, color: '#4a4236' }}
              >
                (optional, if you&rsquo;d like a reply)
              </span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.edu"
              className="w-full py-3 px-4 rounded-[10px] font-sans text-sm outline-none mb-6 box-border focus:ring-1 focus:ring-amber-500/30 transition-all"
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: '#eae3d4',
              }}
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => onNavigate('landing')}
                className="py-2.5 px-[18px] rounded-lg font-sans text-[13px] cursor-pointer bg-transparent transition-colors hover:border-white/20"
                style={{
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#9a9284',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!msg.trim()}
                className="py-2.5 px-[22px] rounded-lg font-sans text-[13px] font-semibold border-none transition-opacity duration-150"
                style={{
                  background: msg.trim() ? '#c9a84c' : '#3a342c',
                  color: msg.trim() ? '#1a1612' : '#6e6558',
                  cursor: msg.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Send →
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer onNavigate={onNavigate} />
    </motion.div>
  );
}
