import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

function Welcome() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10 sm:px-8">
      <div className="glass-panel w-full max-w-4xl rounded-panel p-8 sm:p-10">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          <Sparkles size={16} />
          ChatGPT-powered learning
        </div>
        <h1 className="mt-6 max-w-2xl text-[32px] font-bold leading-tight text-ink">
          Learn through a calm, modern tutor workspace built for real student access.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
          Register with your academic details, receive your generated registration
          number, and sign in to the dashboard with your saved credentials.
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link to="/login" className="primary-button inline-flex items-center gap-2">
            Login
            <ArrowRight size={18} />
          </Link>
          <Link to="/register" className="secondary-button inline-flex items-center gap-2">
            Register Student
          </Link>
        </div>
      </div>
    </main>
  );
}

export default Welcome;
