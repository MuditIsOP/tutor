import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Card from "../components/Card";
import { postJson } from "../lib/api";
import { setStoredAdmin } from "../lib/session";

function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "Kanishk Singh", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await postJson("/admin/login", formData);
      setStoredAdmin({ ...response.admin, session_token: response.token });
      navigate("/admin/dashboard");
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <div className="w-full max-w-xl">
        <Card
          title="Admin Login"
          subtitle="Restricted access for platform administration."
          className="rounded-panel p-8"
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/55 px-4 py-2 text-sm font-medium text-ink">
            <ShieldCheck size={16} className="text-accent" />
            Admin access only
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Admin Username</span>
              <input
                type="text"
                className="glass-input"
                value={formData.username}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, username: event.target.value }))
                }
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="glass-input pr-11"
                  value={formData.password}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, password: event.target.value }))
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soft transition hover:text-ink"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {errorMessage ? (
              <p className="rounded-[10px] bg-red-50/70 px-3 py-2 text-sm text-danger">
                {errorMessage}
              </p>
            ) : null}

            <button type="submit" className="primary-button w-full" disabled={isSubmitting}>
              {isSubmitting ? "Opening Console..." : "Login as Admin"}
            </button>
          </form>

          <div className="mt-6 flex justify-end">
            <Link to="/login" className="text-sm font-medium text-accent transition hover:text-[#4F46E5]">
              Back to Student Login
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default AdminLogin;
