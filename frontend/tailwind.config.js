/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "#111827",
        muted: "#6B7280",
        soft: "#9CA3AF",
        accent: "#6366F1",
        accentSecondary: "#8B5CF6",
        success: "#22C55E",
        warning: "#F59E0B",
        danger: "#EF4444",
      },
      borderRadius: {
        glass: "16px",
        panel: "20px",
      },
      boxShadow: {
        glass: "0 8px 24px rgba(0,0,0,0.08)",
      },
      backdropBlur: {
        glass: "16px",
      },
      backgroundImage: {
        tutor: "linear-gradient(135deg, #E9D5FF, #BFDBFE)",
      },
    },
  },
  plugins: [],
};
