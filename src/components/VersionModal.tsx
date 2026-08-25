import React from "react";
import { X, Sparkles, ShieldCheck, Tag, CheckCircle2, Calendar, GitCommit } from "lucide-react";
import { APP_VERSION_HISTORY, CURRENT_APP_VERSION, CURRENT_APP_BUILD } from "../data/versionHistory";

interface VersionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionModal({ isOpen, onClose }: VersionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-elegant-card border border-elegant-border w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-amber-950/80 via-neutral-900 to-black border-b border-elegant-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-white">Novedades & Registro de Versiones</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500 text-black">
                  {CURRENT_APP_VERSION}
                </span>
              </div>
              <p className="text-xs text-elegant-text-muted mt-0.5">
                Plataforma SyncBarber SaaS • Build <span className="font-mono text-amber-300">{CURRENT_APP_BUILD}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-xl bg-elegant-sub hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Body - Version History */}
        <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-neutral-800">
          
          {APP_VERSION_HISTORY.map((release) => (
            <div
              key={release.version}
              className={`p-5 rounded-2xl border transition-all ${
                release.isCurrent
                  ? "bg-gradient-to-b from-amber-950/30 via-neutral-900/90 to-black border-amber-500/40 shadow-lg"
                  : "bg-neutral-900/50 border-neutral-800/80"
              }`}
            >
              {/* Release Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className={`px-2.5 py-1 rounded-xl font-mono text-xs font-black ${
                    release.isCurrent
                      ? "bg-amber-500 text-black shadow-xs"
                      : "bg-neutral-800 text-neutral-300"
                  }`}>
                    {release.version}
                  </span>
                  <h3 className="text-sm font-extrabold text-white">{release.name}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-neutral-500" />
                    {release.releaseDate}
                  </span>
                  {release.isCurrent && (
                    <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full text-[9px] font-extrabold flex items-center gap-1">
                      <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400" />
                      ACTIVA
                    </span>
                  )}
                </div>
              </div>

              {/* Highlights */}
              <div className="mt-3.5 space-y-2">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  <span>Lo nuevo en esta actualización:</span>
                </h4>
                <ul className="grid grid-cols-1 gap-1.5 pl-1">
                  {release.highlights.map((item, idx) => (
                    <li key={idx} className="text-xs text-neutral-200 flex items-start gap-2">
                      <span className="text-amber-400 font-bold shrink-0">✦</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Details Breakdown */}
              {release.details && release.details.length > 0 && (
                <div className="mt-4 pt-3 border-t border-neutral-800/60 space-y-3">
                  {release.details.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-1">
                      <span className="text-[9.5px] font-bold text-neutral-400 uppercase tracking-wide block">
                        {group.category}:
                      </span>
                      <ul className="space-y-1 pl-2">
                        {group.items.map((detail, dIdx) => (
                          <li key={dIdx} className="text-[11px] text-neutral-400 flex items-center gap-2">
                            <GitCommit className="h-3 w-3 text-neutral-600 shrink-0" />
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

        </div>

        {/* Footer */}
        <div className="p-4 bg-neutral-950 border-t border-elegant-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-neutral-400">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>SyncBarber SaaS Platform • Sistema Operativo Actualizado</span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs rounded-xl transition-all cursor-pointer shadow-md"
          >
            Entendido
          </button>
        </div>

      </div>
    </div>
  );
}
