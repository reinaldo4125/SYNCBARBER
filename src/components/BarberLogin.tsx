import React, { useState } from "react";
import { Scissors, Lock, User, AlertCircle, ArrowLeft } from "lucide-react";
import SyncBarberLogo from "./SyncBarberLogo";

interface BarberLoginProps {
  onLogin: (username: string, password: string) => Promise<any>;
  onCancel: () => void;
}

export default function BarberLogin({ onLogin, onCancel }: BarberLoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!username || !password) {
      setError("Por favor completa todos los campos.");
      return;
    }

    setLoading(true);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err.message || "Usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-8 p-6 md:p-8 bg-elegant-card border border-elegant-border rounded-3xl shadow-lg space-y-6 animate-scaleUp" id="barber-login">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <SyncBarberLogo size={76} showText={true} showTagline={true} />
        </div>
        <div className="border-t border-elegant-border/50 pt-3">
          <h2 className="text-base font-extrabold text-white">Ingreso de Personal</h2>
          <p className="text-xs text-elegant-text-muted mt-1">
            Inicia sesión para administrar la agenda de turnos, comisiones o configurar el salón.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/50 text-rose-300 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-elegant-text-muted block">
            Usuario
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-elegant-text-muted">
              <User className="h-4 w-4" />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold focus:ring-1 focus:ring-elegant-gold transition-all placeholder:text-neutral-600"
              placeholder="Ej: carlos"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold uppercase tracking-wider text-elegant-text-muted block">
            Contraseña
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-elegant-text-muted">
              <Lock className="h-4 w-4" />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-elegant-sub border border-elegant-border text-white text-xs rounded-xl focus:outline-none focus:border-elegant-gold focus:ring-1 focus:ring-elegant-gold transition-all placeholder:text-neutral-600"
              placeholder="••••••••"
              required
            />
          </div>
        </div>

        <div className="pt-2 flex flex-col gap-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-elegant-gold hover:bg-amber-500 text-elegant-bg font-bold text-xs rounded-xl cursor-pointer transition-colors active:scale-98 flex items-center justify-center gap-1.5"
          >
            {loading ? "Verificando..." : "Iniciar Sesión"}
          </button>
          
          <button
            type="button"
            onClick={onCancel}
            className="w-full py-2.5 border border-elegant-border bg-transparent hover:bg-elegant-sub text-elegant-text text-xs rounded-xl cursor-pointer transition-colors flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver a la Vista Cliente</span>
          </button>
        </div>
      </form>

      <div className="border-t border-elegant-border/60 pt-4 text-center">
        <p className="text-[10px] text-elegant-text-muted">
          Pistas de prueba: Administrador (<strong>admin</strong> / <strong>admin</strong>) | Barberos (<strong>carlos</strong> o <strong>mateo</strong> o <strong>andres</strong> / <strong>123</strong>)
        </p>
      </div>
    </div>
  );
}
