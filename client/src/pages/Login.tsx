import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import { BookOpen, KeyRound, User } from "lucide-react";

const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password.trim()) {
      setError("Пожалуйста, заполните все поля.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err.message || "Неверное имя пользователя или пароль.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
          padding: 24px;
          color: #f8fafc;
        }
        .login-card {
          width: 100%;
          max-width: 440px;
          background: rgba(15, 23, 42, 0.65);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
          border-radius: var(--radius-lg);
          padding: 40px;
          text-align: center;
        }
        .login-logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 60px;
          height: 60px;
          border-radius: var(--radius-md);
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          margin-bottom: 24px;
          color: white;
          box-shadow: 0 8px 16px rgba(99, 102, 241, 0.3);
        }
        .login-title {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }
        .login-subtitle {
          font-size: 14px;
          color: var(--text-muted);
          margin-bottom: 32px;
        }
        .form-group {
          margin-bottom: 20px;
          text-align: left;
        }
        .form-label {
          display: block;
          font-size: 13px;
          font-weight: 500;
          margin-bottom: 8px;
          color: #94a3b8;
        }
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        .input-icon {
          position: absolute;
          left: 14px;
          color: #64748b;
        }
        .form-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-sm);
          color: white;
          font-size: 14px;
          transition: border-color var(--transition-fast), background var(--transition-fast);
        }
        .form-input:focus {
          outline: none;
          border-color: #6366f1;
          background: rgba(255, 255, 255, 0.06);
        }
        .error-banner {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: var(--radius-sm);
          color: #fca5a5;
          padding: 12px;
          font-size: 13px;
          margin-bottom: 24px;
          text-align: left;
        }
        .submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          border: none;
          border-radius: var(--radius-sm);
          color: white;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: opacity var(--transition-fast), transform var(--transition-fast);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
        }
        .submit-btn:hover {
          opacity: 0.95;
        }
        .submit-btn:active {
          transform: scale(0.98);
        }
        .submit-btn:disabled {
          background: #334155;
          color: #64748b;
          cursor: not-allowed;
          box-shadow: none;
          transform: none;
        }
        .demo-info {
          margin-top: 24px;
          font-size: 12px;
          color: #64748b;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          padding-top: 16px;
        }
      `}</style>
      <div className="login-card animate-scale-up">
        <div className="login-logo">
          <BookOpen size={30} />
        </div>
        <h1 className="login-title">Электронный журнал</h1>
        <p className="login-subtitle">Войдите в систему для доступа к успеваемости</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Логин</label>
            <div className="input-wrapper">
              <User size={16} className="input-icon" />
              <input
                type="text"
                className="form-input"
                placeholder="Например, student1 или teacher1"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: "28px" }}>
            <label className="form-label">Пароль</label>
            <div className="input-wrapper">
              <KeyRound size={16} className="input-icon" />
              <input
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                required
              />
            </div>
          </div>

          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? "Вход..." : "Войти"}
          </button>
        </form>

        <div className="demo-info">
          <div>Демо-аккаунты:</div>
          <div style={{ marginTop: "4px" }}>Преподаватель: <b>teacher1</b> / <b>password</b></div>
          <div>Студент: <b>student1</b> / <b>password</b></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
