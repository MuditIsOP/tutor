import { Eye, EyeOff, GraduationCap, House, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import Card from "../components/Card";
import { API_BASE_URL } from "../lib/api";

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Login failed.");
      }

      localStorage.setItem("virtualTutorStudent", JSON.stringify(data.student));
      navigate("/dashboard");
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
          title="Welcome Back"
          subtitle="Sign in using your registration number or email address."
          className="rounded-panel p-8"
        >
          <div className="mb-6 flex justify-end">
            <Link to="/admin/login" className="secondary-button inline-flex items-center gap-2">
              <ShieldCheck size={16} />
              Login as Admin
            </Link>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">
                Registration Number or Email
              </span>
              <input
                type="text"
                name="identifier"
                placeholder="STD202601002 or name@example.com"
                className="glass-input"
                value={formData.identifier || ""}
                onChange={handleChange}
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Password</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  className="glass-input pr-11"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soft transition duration-200 hover:text-ink"
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
              {isSubmitting ? "Signing In..." : "Login"}
            </button>

            <div className="flex justify-end">
              <Link to="/reset-password" className="text-sm font-medium text-accent transition hover:text-[#4F46E5]">
                Forgot password?
              </Link>
            </div>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-white/45 px-4 py-4">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/55 text-accent">
                <GraduationCap size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Student Access</p>
                <p className="text-xs text-soft">Use your registration number or your email address.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/" className="secondary-button inline-flex items-center gap-2">
                <House size={16} />
                Home
              </Link>
              <Link to="/register" className="secondary-button">
                Register
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default Login;
