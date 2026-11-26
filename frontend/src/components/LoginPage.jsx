import { useEffect, useState } from "react";
import { apiRequest } from "../api.js";

export default function LoginPage({ onAuthed, goRegister, isAdmin, onToggleAdmin, authNotice }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMsg(authNotice ? { type: "error", text: authNotice } : null);
  }, [authNotice, isAdmin]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!identifier.trim() || !password.trim()) {
      setMsg({ type: "error", text: "All fields are required." });
      return;
    }

    setLoading(true);
    setMsg(null);
    try {
      const endpoint = isAdmin ? "/auth/admin/login" : "/auth/login";
      const payload = isAdmin
        ? { email: identifier.trim(), password }
        : { identifier: identifier.trim(), email: identifier.trim(), password };
      const data = await apiRequest(endpoint, {
        method: "POST",
        body: payload,
      });
      setMsg({ type: "success", text: "Login successful! Redirecting..." });
      setTimeout(() => onAuthed(data.token, data.user), 400);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-section">
      <div className="auth-card auth-card-enhanced">
        {isAdmin && <span className="admin-badge">Admin Access</span>}
        <h2>{isAdmin ? "Admin Login" : "Welcome Back"}</h2>
        <p className="auth-sub">
          {isAdmin ? "Sign in to manage NFT Bazar" : "Log in with your email or @username"}
        </p>

        {msg && <div className={"form-msg " + msg.type}>{msg.text}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{isAdmin ? "Admin Email Address" : "Email or Username"}</label>
            <input
              type={isAdmin ? "email" : "text"}
              placeholder={isAdmin ? "admin@nftbazar.com" : "you@example.com or @username"}
              value={identifier}
              autoComplete="username"
              onChange={(e) => setIdentifier(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading ? "Authenticating..." : isAdmin ? "Login as Admin" : "Login"}
          </button>
        </form>

        {!isAdmin && (
          <p className="auth-switch">
            Don't have an account? <a onClick={goRegister}>Register</a>
          </p>
        )}

        {onToggleAdmin && (
          <div className="admin-toggle">
            <a onClick={onToggleAdmin}>
              {isAdmin ? "← Switch to User Login" : "Admin Portal Login →"}
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
