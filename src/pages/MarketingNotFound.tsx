import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Home, LogIn, Sparkles, Compass, Shield } from 'lucide-react';
import { APP_CONFIG } from '../data/appConfig';
import { useLanguage } from '../hooks/useLanguage';

export default function MarketingNotFound() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const isPt = language === 'pt';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between font-sans selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-amber-500/10 via-amber-600/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-6 pb-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            {APP_CONFIG.appName.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight text-white group-hover:text-amber-400 transition-colors">
              {APP_CONFIG.appName}
            </span>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400">
              Hospitality Engine
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <Link
            to="/pricing"
            className="hidden sm:inline-flex text-xs font-semibold text-slate-300 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
          >
            {isPt ? 'Planos & Preços' : 'Pricing & Plans'}
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <LogIn size={13} />
            <span>{isPt ? 'Iniciar Sessão' : 'Sign In'}</span>
          </Link>
        </div>
      </header>

      {/* Main 404 Container */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg text-center"
        >
          {/* Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl">
            {/* Visual Icon */}
            <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-6">
              <Compass size={40} className="animate-spin" style={{ animationDuration: '24s' }} />
            </div>

            {/* Badge */}
            <div className="mb-3">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25">
                404 • {isPt ? 'Página Não Encontrada' : 'Page Not Found'}
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
              {isPt ? 'Esta página não existe' : "We can't find that page"}
            </h1>

            {/* Description */}
            <p className="text-sm text-slate-400 leading-relaxed mb-8 max-w-md mx-auto">
              {isPt
                ? 'O endereço que introduziu não corresponde a nenhuma página do DineMaster Pro. Regresse à página inicial ou inicie sessão no seu painel de administração.'
                : 'The URL you followed does not exist on the DineMaster Pro platform. Return to our homepage or sign in to your administration dashboard.'}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <Home size={15} />
                <span>{isPt ? 'Página Inicial DineMaster Pro' : 'DineMaster Pro Home'}</span>
              </Link>

              <Link
                to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <LogIn size={15} />
                <span>{isPt ? 'Aceder ao Login' : 'Go to Login'}</span>
              </Link>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="inline-flex items-center gap-1.5 hover:text-slate-300 transition-colors cursor-pointer"
              >
                <ArrowLeft size={13} />
                <span>{isPt ? 'Voltar à página anterior' : 'Back to previous page'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 text-center text-xs text-slate-500 border-t border-slate-900">
        <p>© {new Date().getFullYear()} {APP_CONFIG.appName}. All rights reserved.</p>
      </footer>
    </div>
  );
}
