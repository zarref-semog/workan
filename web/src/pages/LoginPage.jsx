import { ErrorToast } from "../components/ui/ErrorToast";
import { WorkanLogo } from "../components/assets/WorkanLogo";
import { hasCustomBranding } from "../hooks/useBranding";
import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from "lucide-react";
import { api } from "../services/api";

export function LoginPage({ branding, onLogin }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      onLogin(await api.login(form));
    } catch (loginError) {
      setError(loginError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-panel">
        <div className={hasCustomBranding(branding) ? "login-brand" : "login-brand default-brand"}>
          {!hasCustomBranding(branding) ? <WorkanLogo /> : <>
            {branding?.logoUrl && <span className="brandmark"><img src={branding.logoUrl} alt="" /></span>}
            <div>
              {branding?.appName && <strong>{branding.appName}</strong>}
              {branding?.tagline && <small>{branding.tagline}</small>}
            </div>
          </>}
        </div>
        <header>
          <h1>Bem-vindo</h1>
          <p>Entre com seu e-mail e senha para acessar o espaço de trabalho.</p>
        </header>
        <form onSubmit={submit}>
          <label className="login-field">
            <span>E-mail</span>
            <div><Mail size={18} /><input type="email" autoComplete="email" placeholder="nome@empresa.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required autoFocus /></div>
          </label>
          <label className="login-field">
            <span>Senha</span>
            <div><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Digite sua senha" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /><button type="button" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          </label>
          {error && <ErrorToast message={error} />}
          <button className="login-submit" type="submit" disabled={loading}>{loading ? "Entrando..." : <><LogIn size={18} /> Entrar</>}</button>
        </form>
      </section>
      <aside className="login-visual">
        <div><span>Organize. Acompanhe. Entregue.</span><h2>Seus fluxos de trabalho em um só lugar.</h2><p>Gerencie equipes, quadros e atividades com clareza do início ao fim.</p></div>
      </aside>
    </main>
  );
}
