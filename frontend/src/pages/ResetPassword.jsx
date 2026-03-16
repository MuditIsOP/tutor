import { Eye, EyeOff, KeyRound, House } from "lucide-react";
import { useState } from "react";
import DatePicker from "react-datepicker";
import { Link } from "react-router-dom";

import Card from "../components/Card";
import { postJson } from "../lib/api";

const passwordRules = [
  { id: "length", label: "At least 8 characters" },
  { id: "upper", label: "One uppercase letter" },
  { id: "lower", label: "One lowercase letter" },
  { id: "number", label: "One number" },
  { id: "special", label: "One special character" },
];

function formatDateForApi(dateValue) {
  if (!dateValue) {
    return "";
  }

  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ResetPassword() {
  const [formData, setFormData] = useState({
    identifier: "",
    dob: null,
    newPassword: "",
    confirmPassword: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPasswordHelp, setShowPasswordHelp] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordChecks = {
    length: formData.newPassword.length >= 8,
    upper: /[A-Z]/.test(formData.newPassword),
    lower: /[a-z]/.test(formData.newPassword),
    number: /\d/.test(formData.newPassword),
    special: /[^A-Za-z0-9]/.test(formData.newPassword),
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (!formData.dob) {
        throw new Error("Please select your date of birth.");
      }
      if (formData.newPassword !== formData.confirmPassword) {
        throw new Error("New password and confirm password must match.");
      }

      const response = await postJson("/reset-password", {
        identifier: formData.identifier.trim(),
        dob: formatDateForApi(formData.dob),
        new_password: formData.newPassword,
      });

      setSuccessMessage(response.message);
      setFormData({
        identifier: "",
        dob: null,
        newPassword: "",
        confirmPassword: "",
      });
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
          title="Reset Password"
          subtitle="Verify your account with registration number or email plus date of birth."
          className="rounded-panel p-8"
        >
          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">
                Registration Number or Email
              </span>
              <input
                type="text"
                className="glass-input"
                value={formData.identifier}
                onChange={(event) =>
                  setFormData((current) => ({ ...current, identifier: event.target.value }))
                }
                placeholder="STD202601002 or name@example.com"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Date of Birth</span>
              <DatePicker
                selected={formData.dob}
                onChange={(dateValue) =>
                  setFormData((current) => ({ ...current, dob: dateValue }))
                }
                dateFormat="dd MMM yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                maxDate={new Date()}
                className="glass-input"
                yearDropdownItemNumber={100}
                scrollableYearDropdown
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">New Password</span>
              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  className="glass-input pr-11"
                  value={formData.newPassword}
                  onChange={(event) =>
                    setFormData((current) => ({ ...current, newPassword: event.target.value }))
                  }
                  onFocus={() => setShowPasswordHelp(true)}
                  onBlur={() => window.setTimeout(() => setShowPasswordHelp(false), 120)}
                  required
                />
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => setShowNewPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soft transition duration-200 hover:text-ink"
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-muted">Confirm Password</span>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="glass-input pr-11"
                  value={formData.confirmPassword}
                  onChange={(event) =>
                    setFormData((current) => ({
                      ...current,
                      confirmPassword: event.target.value,
                    }))
                  }
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-soft transition duration-200 hover:text-ink"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>

            {showPasswordHelp ? (
              <div className="rounded-[14px] border border-white/40 bg-white/45 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-soft">
                  Password Requirements
                </p>
                <div className="mt-3 grid gap-2 text-sm">
                  {passwordRules.map((rule) => (
                    <p
                      key={rule.id}
                      className={passwordChecks[rule.id] ? "text-success" : "text-muted"}
                    >
                      {rule.label}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {errorMessage ? (
              <p className="rounded-[10px] bg-red-50/70 px-3 py-2 text-sm text-danger">
                {errorMessage}
              </p>
            ) : null}

            {successMessage ? (
              <p className="rounded-[10px] bg-green-50/70 px-3 py-2 text-sm text-success">
                {successMessage}
              </p>
            ) : null}

            <button type="submit" className="primary-button w-full" disabled={isSubmitting}>
              {isSubmitting ? "Resetting..." : "Reset Password"}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] bg-white/45 px-4 py-4">
            <div className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/55 text-accent">
                <KeyRound size={22} />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Account Recovery</p>
                <p className="text-xs text-soft">Use DOB verification to set a new password.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/" className="secondary-button inline-flex items-center gap-2">
                <House size={16} />
                Home
              </Link>
              <Link to="/login" className="secondary-button">
                Back to Login
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default ResetPassword;
