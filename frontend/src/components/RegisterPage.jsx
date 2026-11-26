import { useMemo, useState } from "react";
import { apiRequest } from "../api.js";

function getPasswordStrength(pw) {
  if (!pw) return { score: 0, label: "", color: "transparent" };
  let score = 0;
  if (pw.length >= 6) score += 1;
  if (pw.length >= 10) score += 1;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw) || /[^A-Za-z0-9]/.test(pw)) score += 1;

  if (score <= 1) return { score: 1, label: "Weak", color: "#ef4444" };
  if (score === 2) return { score: 2, label: "Fair", color: "#f59e0b" };
  if (score === 3) return { score: 3, label: "Good", color: "#3b82f6" };
  return { score: 4, label: "Strong", color: "#22c55e" };
}

export default function RegisterPage({ onAuthed, goLogin }) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !password.trim() || !confirm.trim()) {
      setMsg({ type: "error", text: "Name, email, and password fields are required." });
      return;
    }
    if (!/^[A-Za-z\s.'-]+$/.test(name.trim())) {
      setMsg({ type: "error", text: "Name can only contain letters and spaces, not numbers." });
      return;
    }
    const cleanUsername = username.trim().replace(/^@+/, "");
    if (cleanUsername && !/^[a-zA-Z0-9_]{3,30}$/.test(cleanUsername)) {
      setMsg({ type: "error", text: "Username must be 3-30 chars (letters, numbers, underscore)." });
      return;
    }
    const emailDomain = email.trim().split("@")[1]?.split(".")[0] || "";
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ||
      !/[A-Za-z]/.test(emailDomain)
    ) {
      setMsg({ type: "error", text: "Enter a valid email address (e.g. name@example.com)." });
      return;
    }
    if (password.length < 6) {
      setMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (password !== confirm) {
      setMsg({ type: "error", text: "Password and Confirm Password do not match." });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        body: {
          name: name.trim(),
          email: email.trim(),
          username: cleanUsername || undefined,
          phone: phone.trim() || undefined,
          password,
        },
      });
      setMsg({ type: "success", text: "Registration successful! Redirecting..." });
      setTimeout(() => onAuthed(data.token, data.user), 400);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-section">
      <div className="auth-card auth-card-enhanced" style={{ maxWidth: 460 }}>
        <h2>Create Account</h2>
        <p className="auth-sub">Create your verified account on NFT Bazar</p>

        {msg && <div className={"form-msg " + msg.type}>{msg.text}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row-2">
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Username</label>
              <input type="text" placeholder="@username" value={username} onChange={(e) => setUsername(e.target.value)} />
            </div>
          </div>

          <div className="form-row-2">
            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Phone (optional)</label>
              <input type="tel" placeholder="+91 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Password *</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {password && (
              <div className="pw-strength">
                <div className="pw-strength-track">
                  <div
                    className="pw-strength-bar"
                    style={{ width: `${(strength.score / 4) * 100}%`, background: strength.color }}
                  />
                </div>
                <span style={{ color: strength.color }}>{strength.label}</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Confirm Password *</label>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <a onClick={goLogin}>Login</a>
        </p>
      </div>
    </section>
  );
}
