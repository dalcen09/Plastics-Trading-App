import { useState, FormEvent } from "react";
import { login } from "@/lib/auth";
import { Loader2, Lock } from "lucide-react";

interface LoginPageProps {
  onSuccess: () => void;
}

export function LoginPage({ onSuccess }: LoginPageProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(password);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "ログインに失敗しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #f0faf4 0%, #e6f4ec 100%)",
        padding: "1rem",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          boxShadow: "0 4px 32px rgba(0,0,0,0.10)",
          padding: "2.5rem 2rem",
          width: "100%",
          maxWidth: "360px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.5rem",
        }}
      >
        {/* Logo / brand */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "hsl(152,73%,41%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1rem",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <circle cx="17" cy="17" r="16" stroke="white" strokeWidth="2" />
              <text
                x="17"
                y="22"
                textAnchor="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
                fontFamily="serif"
              >
                丸
              </text>
            </svg>
          </div>
          <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "#1a2e1e", letterSpacing: "0.02em" }}>
            丸喜産業株式会社
          </div>
          <div style={{ fontSize: "0.82rem", color: "#5e7a66", marginTop: "0.2rem" }}>
            樹脂取引管理システム
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div style={{ position: "relative" }}>
            <Lock
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "#5e7a66",
                pointerEvents: "none",
              }}
            />
            <input
              type="password"
              placeholder="パスワード"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "0.65rem 0.75rem 0.65rem 2.25rem",
                border: `1.5px solid ${error ? "#e53e3e" : "#c8dece"}`,
                borderRadius: "8px",
                fontSize: "0.95rem",
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => {
                if (!error) e.currentTarget.style.borderColor = "hsl(152,73%,41%)";
              }}
              onBlur={(e) => {
                if (!error) e.currentTarget.style.borderColor = "#c8dece";
              }}
            />
          </div>

          {error && (
            <div style={{ fontSize: "0.82rem", color: "#e53e3e", textAlign: "center" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              width: "100%",
              padding: "0.7rem",
              background: loading || !password ? "#a8d4b8" : "hsl(152,73%,41%)",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: loading || !password ? "default" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              transition: "background 0.15s",
              fontFamily: "inherit",
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "確認中..." : "ログイン"}
          </button>
        </form>
      </div>
    </div>
  );
}
