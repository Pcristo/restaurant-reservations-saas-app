import React, { useState, useEffect } from 'react';
import { 
  getMarketingWebsiteSettings, 
  getPublicPlans, 
  submitPublicContactForm, 
  DEFAULT_MARKETING_SETTINGS 
} from '../services/marketingWebsiteService';
import { MarketingWebsiteSettings, Plan } from '../types';
import { 
  Sparkles, Check, ArrowRight, Shield, Calendar, Users, 
  Globe, Star, Phone, Mail, Clock, LayoutGrid, 
  CalendarCheck, MessageSquare, Percent, Menu, X,
  Utensils, ChevronRight, AlertCircle, Languages
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { MarketingSEOHead } from '../components/MarketingSEOHead';
import { useLanguage } from '../hooks/useLanguage';
import { cn } from '../lib/utils';

interface MarketingLandingPageProps {
  settings?: MarketingWebsiteSettings;
  initialSection?: string;
}

export default function MarketingLandingPage({ settings: initialSettings, initialSection }: MarketingLandingPageProps) {
  const { language, setLanguage } = useLanguage();
  const isPt = language === 'pt';

  const [settings, setSettings] = useState<MarketingWebsiteSettings>(initialSettings || DEFAULT_MARKETING_SETTINGS);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);

  // Contact form state
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    restaurantName: '',
    phone: '',
    message: '',
    hp: '' // honeypot
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  useEffect(() => {
    // Load fresh settings if not provided
    if (!initialSettings) {
      getMarketingWebsiteSettings().then(setSettings);
    }

    // Load existing SaaS plans & entitlements as single source of truth
    getPublicPlans().then((loadedPlans) => {
      setPlans(loadedPlans);
      setIsLoadingPlans(false);
    }).catch(() => {
      setIsLoadingPlans(false);
    });
  }, [initialSettings]);

  // Scroll to initial section if provided in route
  useEffect(() => {
    if (initialSection) {
      const timer = setTimeout(() => {
        const el = document.getElementById(initialSection);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialSection]);

  // Set document title and SEO meta
  useEffect(() => {
    const siteTitle = settings.general?.siteName || 'DineMaster Pro';
    if (initialSection === 'about') {
      document.title = isPt ? `Como Funciona | ${siteTitle}` : `About Us | ${siteTitle}`;
    } else if (initialSection === 'pricing') {
      document.title = isPt ? `Planos & Preços | ${siteTitle}` : `Pricing & Plans | ${siteTitle}`;
    } else if (initialSection === 'contact') {
      document.title = isPt ? `Fale Connosco | ${siteTitle}` : `Contact Us | ${siteTitle}`;
    } else if (initialSection === 'features') {
      document.title = isPt ? `Funcionalidades & Operações | ${siteTitle}` : `Features & Operations | ${siteTitle}`;
    } else if (initialSection === 'reviews') {
      document.title = isPt ? `Avaliações & Prova Social | ${siteTitle}` : `Customer Reviews | ${siteTitle}`;
    } else {
      const tagline = isPt 
        ? 'Gestão Moderna de Reservas e Mesas para Restaurantes'
        : (settings.general?.tagline || 'Restaurant Reservation & Table Management SaaS');
      document.title = `${siteTitle} — ${tagline}`;
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const defaultDesc = isPt 
        ? 'Faça a gestão de mesas, reservas, disponibilidade em tempo real e clientes com zero comissões. O sistema operacional inteligente para restaurantes modernos.'
        : 'Manage tables, reservations, live availability, and guest relationships with zero cover fees. One intelligent operating system built for modern restaurants.';
      metaDesc.setAttribute('content', isPt ? defaultDesc : (settings.hero?.description || settings.footer?.description || defaultDesc));
    }
  }, [settings, initialSection, isPt]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactError(null);

    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.restaurantName.trim() || !contactForm.message.trim()) {
      setContactError(
        isPt ? 'Por favor, preencha todos os campos obrigatórios.' : 'Please complete all required fields.'
      );
      return;
    }

    setIsSubmittingContact(true);
    try {
      const res = await submitPublicContactForm(contactForm);
      setContactSuccess(true);
      toast.success(
        isPt ? 'Pedido enviado com sucesso! Entraremos em contacto brevemente.' : res.message
      );
      setContactForm({
        name: '',
        email: '',
        restaurantName: '',
        phone: '',
        message: '',
        hp: ''
      });
    } catch (err: any) {
      const msg = isPt
        ? 'Não foi possível enviar a mensagem. Por favor, tente novamente ou envie email direto.'
        : (err?.message || 'Failed to submit inquiry. Please try again or email us directly.');
      setContactError(msg);
      toast.error(msg);
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const activeReviews = (settings.reviews?.items || []).filter(r => r.isActive !== false);
  const showReviewsSection = settings.reviews?.showReviews !== false && activeReviews.length > 0;
  const showPricingSection = settings.pricing?.showPricing !== false;

  // Portuguese translations for default features
  const defaultPtFeatures = [
    {
      title: 'Plantas de Sala Visuais & Gestão de Mesas',
      description: 'Desenhe layouts multi-sala para interiores, esplanadas e balcão. Atribuição de lugares em tempo real, controlo de capacidade e estado das mesas.',
      icon: 'LayoutGrid'
    },
    {
      title: 'Disponibilidade em Tempo Real & Sem Sobreposições',
      description: 'Deteção inteligente de conflitos para prevenir reservas duplicadas nos turnos de almoço e jantar. Reservas online instantâneas e confirmadas.',
      icon: 'CalendarCheck'
    },
    {
      title: 'Confirmações Automáticas por SMS & WhatsApp',
      description: 'Envie confirmações imediatas de reserva, lembretes automáticos com 24h de antecedência e links diretos de cancelamento por WhatsApp e SMS.',
      icon: 'MessageSquare'
    },
    {
      title: 'Zero Comissões & Relação Direta com os Clientes',
      description: 'Elimine os 2€ a 5€ por cliente cobrados por intermediários. Cada cliente é seu cliente direto, com histórico de visitas, notas e preferências.',
      icon: 'Percent'
    },
    {
      title: 'Domínios Personalizados & Marca Própria',
      description: 'Conecte o seu domínio próprio ou use um endereço exclusivo. Logótipo, cores da marca e menus integrados com certificado SSL automático.',
      icon: 'Globe'
    },
    {
      title: 'Gestão de Lista de Espera & Clientes Sem Reserva',
      description: 'Registe e organize com facilidade os clientes que chegam sem reserva nas horas de ponta. Calcule tempos de espera e notifique por telemóvel.',
      icon: 'Clock'
    }
  ];

  // Portuguese translations for reviews
  const getReviewText = (revId: string, fallback: string) => {
    if (!isPt) return fallback;
    if (revId === 'rev-1') {
      return 'O DineMaster Pro transformou as nossas noites mais movimentadas. Eliminámos completamente as reservas duplicadas e aumentámos a rotação de mesas em 22% nos primeiros dois meses, sem pagar um único cêntimo de comissões.';
    }
    if (revId === 'rev-2') {
      return 'A planta interativa e a disponibilidade em tempo real são inigualáveis. A nossa equipa de receção adora a rapidez e facilidade em atribuir mesas. A formação dos funcionários demorou menos de dez minutos.';
    }
    if (revId === 'rev-3') {
      return 'Mudar dos cadernos de papel e de plataformas intermediárias caras foi a melhor decisão para o nosso negócio. Os lembretes automáticos por WhatsApp reduziram os no-shows de fim de semana a quase zero.';
    }
    return fallback;
  };

  const getReviewRole = (role?: string) => {
    if (!isPt || !role) return role;
    if (role.includes('Owner')) return 'Proprietário & Chef Executivo';
    if (role.includes('General Manager')) return 'Diretora Geral';
    if (role.includes('Managing Partner')) return 'Sócio-Gerente';
    return role;
  };

  const getPlanName = (p: Plan) => {
    if (!isPt) return p.name;
    const lowerId = (p.id || '').toLowerCase();
    const lowerName = (p.name || '').toLowerCase();
    if (lowerId === 'starter' || lowerName.includes('starter')) return 'Iniciante';
    if (lowerId === 'professional' || lowerName.includes('professional')) return 'Profissional';
    if (lowerId === 'business' || lowerName.includes('business')) return 'Empresarial';
    if (lowerId === 'enterprise' || lowerName.includes('enterprise')) return 'Enterprise';
    return p.name;
  };

  const getPlanDescription = (p: Plan) => {
    if (!isPt) return p.description;
    const lowerId = (p.id || '').toLowerCase();
    const lowerName = (p.name || '').toLowerCase();
    if (lowerId === 'starter' || lowerName.includes('starter')) {
      return 'Ideal para pequenos bistrôs que iniciam reservas online com mesas essenciais.';
    }
    if (lowerId === 'professional' || lowerName.includes('professional')) {
      return 'Para restaurantes em crescimento com turnos movimentados e lembretes automáticos por SMS.';
    }
    if (lowerId === 'business' || lowerName.includes('business')) {
      return 'Operação avançada com domínios personalizados, integração WhatsApp e mesas ilimitadas.';
    }
    if (lowerId === 'enterprise' || lowerName.includes('enterprise')) {
      return 'Grupos hoteleiros e múltiplos espaços com suporte prioritário 24/7 e SLA dedicado.';
    }
    return p.description;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      <MarketingSEOHead settings={settings} plans={plans} />

      {/* ============================================================== */}
      {/* 1. Header & Navigation                                         */}
      {/* ============================================================== */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            {settings.general?.logoUrl ? (
              <img 
                src={settings.general.logoUrl} 
                alt={settings.general?.siteName || 'Logo'} 
                className="w-10 h-10 object-contain rounded-xl shadow-md group-hover:scale-105 transition-transform"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-amber-400 rounded-xl flex items-center justify-center text-slate-950 font-bold text-xl shadow-md group-hover:scale-105 transition-transform">
                {settings.general?.siteName ? settings.general.siteName.charAt(0) : 'D'}
              </div>
            )}
            <div>
              <span className="text-xl font-bold tracking-tight text-white block">
                {settings.general?.siteName || 'DineMaster Pro'}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 block -mt-0.5">
                {isPt ? 'Motor de Restauração' : 'Hospitality Engine'}
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-300">
            {settings.about?.enabled !== false && (
              <a href="#about" className="hover:text-amber-400 transition-colors">
                {isPt ? 'Como Funciona' : 'How It Works'}
              </a>
            )}
            <a href="#features" className="hover:text-amber-400 transition-colors">
              {isPt ? 'Funcionalidades' : 'Features'}
            </a>
            {showReviewsSection && (
              <a href="#reviews" className="hover:text-amber-400 transition-colors">
                {isPt ? 'Avaliações' : 'Reviews'}
              </a>
            )}
            {showPricingSection && (
              <a href="#pricing" className="hover:text-amber-400 transition-colors">
                {isPt ? 'Preços' : 'Pricing'}
              </a>
            )}
            {settings.contact?.enabled !== false && (
              <a href="#contact" className="hover:text-amber-400 transition-colors">
                {isPt ? 'Contacto' : 'Contact'}
              </a>
            )}
          </nav>

          {/* Right Action Buttons with Language Toggler */}
          <div className="hidden sm:flex items-center gap-3">
            {/* Language Switcher Toggler in Navbar */}
            <div className="flex items-center rounded-xl p-1 bg-slate-900 border border-slate-800 shadow-inner gap-1">
              <div className="pl-1.5 pr-0.5 text-slate-400 flex items-center">
                <Globe size={13} className="text-amber-400" />
              </div>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  language === 'en'
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="English"
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('pt')}
                className={cn(
                  "px-2.5 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                  language === 'pt'
                    ? "bg-amber-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:text-white"
                )}
                title="Português"
              >
                PT
              </button>
            </div>

            <Link
              to="/login"
              className="px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
            >
              {isPt ? 'Entrar' : 'Login'}
            </Link>

            <a
              href={settings.general?.primaryCtaUrl || '#pricing'}
              className="px-4 py-2.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{isPt ? 'Começar Grátis' : (settings.general?.primaryCtaText || 'Start Free Trial')}</span>
              <ArrowRight size={14} />
            </a>
          </div>

          {/* Mobile Header Bar */}
          <div className="sm:hidden flex items-center gap-2">
            {/* Quick Mobile Language Toggler */}
            <div className="flex items-center rounded-lg p-0.5 bg-slate-900 border border-slate-800 gap-0.5">
              <div className="pl-1 pr-0.5 text-slate-400 flex items-center">
                <Globe size={11} className="text-amber-400" />
              </div>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer",
                  language === 'en' ? "bg-amber-500 text-slate-950" : "text-slate-400"
                )}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('pt')}
                className={cn(
                  "px-2 py-0.5 text-[11px] font-bold rounded cursor-pointer",
                  language === 'pt' ? "bg-amber-500 text-slate-950" : "text-slate-400"
                )}
              >
                PT
              </button>
            </div>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-400 hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-slate-800 bg-slate-950 px-4 pt-3 pb-6 space-y-3">
            {settings.about?.enabled !== false && (
              <a 
                href="#about" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-slate-300 hover:text-white"
              >
                {isPt ? 'Como Funciona' : 'How It Works'}
              </a>
            )}
            <a 
              href="#features" 
              onClick={() => setMobileMenuOpen(false)}
              className="block py-2 text-sm text-slate-300 hover:text-white"
            >
              {isPt ? 'Funcionalidades' : 'Features'}
            </a>
            {showReviewsSection && (
              <a 
                href="#reviews" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-slate-300 hover:text-white"
              >
                {isPt ? 'Avaliações' : 'Reviews'}
              </a>
            )}
            {showPricingSection && (
              <a 
                href="#pricing" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-slate-300 hover:text-white"
              >
                {isPt ? 'Preços' : 'Pricing'}
              </a>
            )}
            {settings.contact?.enabled !== false && (
              <a 
                href="#contact" 
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-slate-300 hover:text-white"
              >
                {isPt ? 'Contacto' : 'Contact'}
              </a>
            )}

            {/* Mobile Language Switcher Row */}
            <div className="flex items-center justify-between py-2 border-t border-slate-800/80">
              <span className="text-xs text-slate-400 font-medium">
                {isPt ? 'Idioma da Plataforma' : 'Platform Language'}
              </span>
              <div className="flex items-center rounded-lg p-0.5 bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                    language === 'en'
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('pt')}
                  className={cn(
                    "px-3 py-1 text-xs font-bold rounded-md transition-all",
                    language === 'pt'
                      ? "bg-amber-500 text-slate-950 font-bold"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  Português
                </button>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-xs font-semibold bg-slate-900 text-white rounded-lg border border-slate-800 hover:bg-slate-800 transition-colors"
              >
                {isPt ? 'Iniciar Sessão' : 'Login'}
              </Link>
              <a
                href={settings.general?.primaryCtaUrl || '#pricing'}
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 text-center text-xs font-bold bg-amber-500 text-slate-950 rounded-lg shadow"
              >
                {isPt ? 'Começar Grátis' : (settings.general?.primaryCtaText || 'Start Free Trial')}
              </a>
            </div>
          </div>
        )}
      </header>

      {/* ============================================================== */}
      {/* 2. Hero Section                                                */}
      {/* ============================================================== */}
      {settings.hero?.enabled !== false && (
        <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden border-b border-slate-800/60">
          {/* Subtle background glow */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-amber-500/30 text-amber-400 text-xs font-medium mb-8 shadow-sm">
              <Sparkles size={14} className="text-amber-400" />
              <span>
                {isPt 
                  ? 'Plataforma de Gestão de Restauração de Próxima Geração' 
                  : (settings.hero?.badgeText || 'Next-Gen Restaurant Hospitality Engine')}
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-[1.12]">
              {isPt 
                ? 'Gestão Poderosa de Reservas, Descomplicada.'
                : (settings.hero?.headline || 'Powerful Restaurant Reservations, Simplified.')}
            </h1>

            {/* Description */}
            <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              {isPt 
                ? 'Gerencie mesas, plantas de sala, disponibilidade em tempo real e clientes com zero comissões por reserva. O sistema operacional inteligente construído para restaurantes modernos.'
                : (settings.hero?.description || 'Manage tables, floor plans, real-time availability, and diners with zero cover commissions. One intelligent operating system built for modern restaurants.')}
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <a
                href={settings.hero?.primaryCtaUrl || '#pricing'}
                className="px-7 py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/20 hover:shadow-amber-500/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>{isPt ? 'Começar Teste Grátis' : (settings.hero?.primaryCtaText || 'Start Free Trial')}</span>
                <ArrowRight size={16} />
              </a>

              <a
                href={settings.hero?.secondaryCtaUrl || '#about'}
                className="px-7 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-slate-700 font-semibold text-sm transition-all cursor-pointer"
              >
                {isPt ? 'Ver Como Funciona' : (settings.hero?.secondaryCtaText || 'See How It Works')}
              </a>
            </div>

            {/* Trust statement */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-400" /> {isPt ? '0% Comissões por Cliente' : '0% Cover Fees'}
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-400" /> {isPt ? 'Planta de Sala em Tempo Real' : 'Real-Time Floor Plan'}
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-400" /> {isPt ? 'Notificações WhatsApp & SMS' : 'WhatsApp & SMS Notifications'}
              </span>
              <span className="flex items-center gap-1.5">
                <Check size={14} className="text-emerald-400" /> {isPt ? '14 Dias de Teste Grátis' : '14-Day Full Free Trial'}
              </span>
            </div>

            {/* Dashboard / Floor Plan Mockup Showcase */}
            <div className="mt-14 max-w-5xl mx-auto rounded-2xl border border-slate-800 bg-slate-900/90 p-2 sm:p-4 shadow-2xl shadow-black/80">
              <div className="rounded-xl overflow-hidden border border-slate-800/80 bg-slate-950">
                {/* Mock Browser Header */}
                <div className="h-9 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 bg-slate-950 px-6 py-0.5 rounded border border-slate-800/80">
                    app.dinemasterpro.com/admin/live
                  </div>
                  <div className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isPt ? 'Serviço em Direto' : 'Live Service'}</span>
                  </div>
                </div>

                {/* Mock Live Service Floor Grid */}
                <div className="p-6 md:p-8 bg-slate-950 text-left grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Live Service Shift Stats */}
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
                      <div className="text-xs text-slate-400">
                        {isPt ? 'Turno de Jantar de Hoje' : "Tonight's Dinner Shift"}
                      </div>
                      <div className="text-2xl font-bold text-white mt-1">
                        48 / 60 {isPt ? 'Clientes' : 'Covers'}
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full mt-3 overflow-hidden">
                        <div className="bg-amber-500 h-full rounded-full w-[80%]" />
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400 mt-2">
                        <span>{isPt ? '80% Capacidade Ocupada' : '80% Seated Capacity'}</span>
                        <span className="text-amber-400 font-semibold">
                          {isPt ? '12 Lugares Livres' : '12 Covers Open'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                      <div className="text-xs font-semibold text-slate-300">
                        {isPt ? 'Próximas Chegadas' : 'Upcoming Arrivals'}
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-white">Oliver Vance (4p)</div>
                          <div className="text-[11px] text-slate-400">
                            {isPt ? 'Mesa 4 • Esplanada' : 'Table 4 • Patio Room'}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                          19:30
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-semibold text-white">Elena Rostova (2p)</div>
                          <div className="text-[11px] text-slate-400">
                            {isPt ? 'Mesa 1 • Sala Principal' : 'Table 1 • Main Dining'}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[10px] font-bold">
                          19:45
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle & Right: Interactive Floor Layout */}
                  <div className="md:col-span-2 p-5 rounded-xl bg-slate-900/40 border border-slate-800/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                        <div className="text-xs font-bold text-white flex items-center gap-2">
                          <LayoutGrid size={14} className="text-amber-400" />
                          <span>{isPt ? 'Sala Principal & Esplanada (Tempo Real)' : 'Main Dining Room & Terrace (Live Status)'}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" /> {isPt ? 'Disponível' : 'Available'}
                          </span>
                          <span className="flex items-center gap-1 text-amber-400">
                            <span className="w-2 h-2 rounded-full bg-amber-400" /> {isPt ? 'Reservada' : 'Reserved'}
                          </span>
                          <span className="flex items-center gap-1 text-rose-400">
                            <span className="w-2 h-2 rounded-full bg-rose-400" /> {isPt ? 'Ocupada' : 'Seated'}
                          </span>
                        </div>
                      </div>

                      {/* Mock Table Layout */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-center">
                          <div className="text-[10px] font-mono text-emerald-400 font-bold">T-01 (2p)</div>
                          <div className="text-xs text-white font-semibold mt-1">{isPt ? 'Disponível' : 'Available'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{isPt ? 'Vista Janela' : 'Window View'}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/40 text-center">
                          <div className="text-[10px] font-mono text-rose-400 font-bold">T-02 (4p)</div>
                          <div className="text-xs text-white font-semibold mt-1">{isPt ? 'Ocupada • 42m' : 'Seated • 42m'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">M. Rossi (4)</div>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/40 text-center">
                          <div className="text-[10px] font-mono text-amber-400 font-bold">T-03 (6p)</div>
                          <div className="text-xs text-white font-semibold mt-1">{isPt ? 'Reservada' : 'Reserved'}</div>
                          <div className="text-[10px] text-amber-300 mt-0.5">{isPt ? 'Chega em 15m' : 'Due in 15m'}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/40 text-center">
                          <div className="text-[10px] font-mono text-rose-400 font-bold">T-04 (2p)</div>
                          <div className="text-xs text-white font-semibold mt-1">{isPt ? 'Ocupada • 18m' : 'Seated • 18m'}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Mesa VIP</div>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-center">
                          <div className="text-[10px] font-mono text-emerald-400 font-bold">T-05 (4p)</div>
                          <div className="text-xs text-white font-semibold mt-1">{isPt ? 'Disponível' : 'Available'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{isPt ? 'Sala Central' : 'Main Floor'}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-center">
                          <div className="text-[10px] font-mono text-emerald-400 font-bold">T-06 (4p)</div>
                          <div className="text-xs text-white font-semibold mt-1">{isPt ? 'Disponível' : 'Available'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{isPt ? 'Sala Central' : 'Main Floor'}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/40 text-center">
                          <div className="text-[10px] font-mono text-amber-400 font-bold">T-07 (8p)</div>
                          <div className="text-xs text-white font-semibold mt-1">{isPt ? 'Reservada' : 'Reserved'}</div>
                          <div className="text-[10px] text-amber-300 mt-0.5">{isPt ? 'Às 20:00' : 'Due at 20:00'}</div>
                        </div>
                        <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-center">
                          <div className="text-[10px] font-mono text-emerald-400 font-bold">T-08 (2p)</div>
                          <div className="text-xs text-white font-semibold mt-1">{isPt ? 'Disponível' : 'Available'}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5">{isPt ? 'Canto Calmo' : 'Quiet Corner'}</div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <span>{isPt ? 'Sincronização offline ativa' : 'Offline-first database sync active'}</span>
                      <span className="text-amber-400 font-mono font-medium">
                        {isPt ? 'Sincronizado há < 1s' : 'Synced < 1s ago'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 3. Value Metrics & Trust Strip                                 */}
      {/* ============================================================== */}
      <section className="border-b border-slate-800 bg-slate-900/40 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-400">0%</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                {isPt ? 'Comissões por Reserva' : 'Cover Commissions'}
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white">+25%</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                {isPt ? 'Rotação de Mesas' : 'Table Turn Rate'}
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-amber-400">&lt;1s</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                {isPt ? 'Sincronização em Tempo Real' : 'Real-Time Floor Sync'}
              </div>
            </div>
            <div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white">99.9%</div>
              <div className="text-xs sm:text-sm text-slate-400 mt-1 font-medium">
                {isPt ? 'Disponibilidade na Nuvem' : 'Cloud Availability'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* 4. About & Core Capabilities                                   */}
      {/* ============================================================== */}
      {settings.about?.enabled !== false && (
        <section id="about" className="py-20 md:py-28 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                {isPt ? 'Visão Geral da Plataforma' : 'Hospitality Platform Overview'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
                {isPt 
                  ? 'Tudo o que o Seu Restaurante Precisa para Funcionar na Perfeição'
                  : (settings.about?.title || 'Everything Your Restaurant Needs to Run Smoothly')}
              </h2>
              <p className="text-base text-slate-400 mt-4 leading-relaxed">
                {isPt
                  ? 'Desenvolvido para bistrôs independentes, salas de grande volume e grupos hoteleiros com múltiplos restaurantes.'
                  : (settings.about?.subtitle || 'Built for independent bistros, high-volume dining rooms, and multi-location hospitality groups.')}
              </p>
            </div>

            {/* Feature Grid */}
            <div id="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
              {(isPt ? defaultPtFeatures : (settings.about?.features || DEFAULT_MARKETING_SETTINGS.about.features || [])).map((feat, idx) => (
                <div 
                  key={idx}
                  className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 hover:border-amber-500/40 transition-all hover:shadow-xl hover:shadow-amber-500/5 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                    {idx === 0 && <LayoutGrid size={20} />}
                    {idx === 1 && <CalendarCheck size={20} />}
                    {idx === 2 && <MessageSquare size={20} />}
                    {idx === 3 && <Percent size={20} />}
                    {idx === 4 && <Globe size={20} />}
                    {idx === 5 && <Clock size={20} />}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feat.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{feat.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 5. Customer Testimonials (Conditional)                         */}
      {/* ============================================================== */}
      {showReviewsSection && (
        <section id="reviews" className="py-20 md:py-28 border-b border-slate-800 bg-slate-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                {isPt ? 'Testemunhos da Restauração' : 'Hospitality Proof'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
                {isPt 
                  ? 'A Escolha de Proprietários e Diretores de Restaurantes'
                  : (settings.reviews?.title || 'Trusted by Restaurateurs & General Managers')}
              </h2>
              <p className="text-base text-slate-400 mt-4 leading-relaxed">
                {isPt
                  ? 'Veja como os profissionais de restauração aumentam a rotação de mesas e otimizam o serviço diário.'
                  : (settings.reviews?.subtitle || 'See how hospitality professionals increase table turn rates and streamline daily service.')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activeReviews.map((rev) => (
                <div 
                  key={rev.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-lg"
                >
                  <div>
                    {/* Stars */}
                    <div className="flex items-center gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          size={14} 
                          className={i < (rev.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-slate-800'} 
                        />
                      ))}
                    </div>

                    <p className="text-sm text-slate-300 italic leading-relaxed">
                      "{getReviewText(rev.id, rev.text)}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3 mt-6 pt-5 border-t border-slate-900">
                    {rev.avatarUrl ? (
                      <img 
                        src={rev.avatarUrl} 
                        alt={rev.name} 
                        className="w-10 h-10 rounded-full object-cover border border-slate-800" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                        {rev.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-white text-sm">{rev.name}</div>
                      <div className="text-xs text-slate-400">
                        {rev.role ? `${getReviewRole(rev.role)} • ` : ''}{rev.restaurantName}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 6. Pricing Section                                             */}
      {/* ============================================================== */}
      {showPricingSection && (
        <section id="pricing" className="py-20 md:py-28 border-b border-slate-800 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                {isPt ? 'Subscrição Fixa e Transparente' : 'Flat Subscription Pricing'}
              </span>
              <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
                {isPt 
                  ? 'Preços Claros e Previsíveis. Zero Comissões por Cliente.'
                  : (settings.pricing?.title || 'Predictable Flat Pricing. Zero Cover Fees.')}
              </h2>
              <p className="text-base text-slate-400 mt-4 leading-relaxed">
                {isPt 
                  ? 'Escolha o plano ideal para o seu restaurante. Todos os planos incluem a operação completa de mesas sem qualquer comissão por reserva.'
                  : (settings.pricing?.subtitle || 'Choose the right tier for your restaurant. Every plan includes core table operations with zero per-diner booking commissions.')}
              </p>
            </div>

            {isLoadingPlans ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
                {plans.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-2xl p-6 flex flex-col justify-between transition-all relative ${
                      p.isPopular 
                        ? 'bg-slate-900 border-2 border-amber-500 shadow-xl shadow-amber-500/10' 
                        : 'bg-slate-950 border border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {p.isPopular && (
                      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 px-3 py-1 rounded-full shadow">
                        <Sparkles size={11} />
                        <span>{isPt ? 'Mais Popular' : 'Most Popular'}</span>
                      </div>
                    )}

                    <div>
                      <h3 className="text-xl font-bold text-white">{getPlanName(p)}</h3>
                      <p className="text-xs text-slate-400 mt-1 min-h-[36px]">{getPlanDescription(p)}</p>

                      <div className="mt-5 mb-6">
                        <span className="text-3xl sm:text-4xl font-extrabold text-white">€{p.priceMonthly}</span>
                        <span className="text-xs text-slate-400">{isPt ? ' / mês' : ' / month'}</span>
                      </div>

                      {/* Entitlements List */}
                      <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Calendar size={13} className="text-slate-500" />
                            {isPt ? 'Reservas Mensais' : 'Monthly Bookings'}
                          </span>
                          <span className="font-semibold text-white">
                            {p.entitlements.maxReservations >= 99999 
                              ? (isPt ? 'Ilimitado' : 'Unlimited') 
                              : p.entitlements.maxReservations}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Users size={13} className="text-slate-500" />
                            {isPt ? 'Contas de Staff' : 'Staff Accounts'}
                          </span>
                          <span className="font-semibold text-white">
                            {p.entitlements.maxStaffUsers >= 900 
                              ? (isPt ? 'Ilimitado' : 'Unlimited') 
                              : p.entitlements.maxStaffUsers}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Utensils size={13} className="text-slate-500" />
                            {isPt ? 'Mesas de Refeição' : 'Max Dining Tables'}
                          </span>
                          <span className="font-semibold text-white">
                            {p.entitlements.maxTables >= 900 
                              ? (isPt ? 'Ilimitado' : 'Unlimited') 
                              : p.entitlements.maxTables}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <Globe size={13} className="text-slate-500" />
                            {isPt ? 'Domínio / Subdomínio' : 'Custom Subdomain/Domain'}
                          </span>
                          <span className={p.entitlements.customDomain ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                            {p.entitlements.customDomain ? (isPt ? 'Incluído' : 'Included') : '—'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <MessageSquare size={13} className="text-slate-500" />
                            {isPt ? 'Ações WhatsApp' : 'WhatsApp Action'}
                          </span>
                          <span className={p.entitlements.whatsapp ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                            {p.entitlements.whatsapp ? (isPt ? 'Incluído' : 'Included') : '—'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{isPt ? 'Lembretes SMS' : 'SMS Reminders'}</span>
                          <span className={p.entitlements.sms ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                            {p.entitlements.sms ? (isPt ? 'Incluído' : 'Included') : '—'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{isPt ? 'SEO Avançado' : 'Advanced SEO'}</span>
                          <span className={p.entitlements.advancedSEO ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                            {p.entitlements.advancedSEO ? (isPt ? 'Incluído' : 'Included') : '—'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">{isPt ? 'Lista de Espera' : 'Waitlist Management'}</span>
                          <span className={p.entitlements.waitlist ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                            {p.entitlements.waitlist ? (isPt ? 'Incluído' : 'Included') : '—'}
                          </span>
                        </div>

                        {/* Custom Features */}
                        {p.customFeatures && p.customFeatures.filter(f => f.enabled !== false).map(cf => (
                          <div key={cf.id} className="flex items-center justify-between" title={cf.description}>
                            <span className="text-slate-400 truncate max-w-[170px]">{cf.title}</span>
                            <span className="text-emerald-400 font-semibold">{isPt ? 'Incluído' : 'Included'}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-8 pt-4">
                      <a
                        href="#contact"
                        className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                          p.isPopular
                            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md'
                            : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800'
                        }`}
                      >
                        <span>
                          {p.priceMonthly === 0 
                            ? (isPt ? 'Começar Grátis' : 'Start Free Trial') 
                            : (isPt ? `Selecionar ${getPlanName(p)}` : `Select ${p.name}`)}
                        </span>
                        <ChevronRight size={14} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 7. Public Contact Form Section                                 */}
      {/* ============================================================== */}
      {settings.contact?.enabled !== false && (
        <section id="contact" className="py-20 md:py-28 border-b border-slate-800 bg-slate-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
              {/* Left Column: Heading & Value */}
              <div>
                <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-bold">
                  {isPt ? 'Entre em Contacto' : 'Get in Touch'}
                </span>
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mt-2">
                  {isPt 
                    ? 'Pronto para Transformar as Reservas do Seu Restaurante?'
                    : (settings.contact?.title || 'Ready to Transform Your Restaurant Reservations?')}
                </h2>
                <p className="text-base text-slate-400 mt-4 leading-relaxed">
                  {isPt 
                    ? 'Tem dúvidas, precisa de uma demonstração personalizada ou procura apoio para a implementação em várias localizações? Fale com os nossos especialistas em restauração.'
                    : (settings.contact?.description || 'Have questions, need a personalized demo, or want custom multi-location rollout assistance? Get in touch with our restaurant specialists.')}
                </p>

                <div className="mt-8 space-y-4 text-sm text-slate-300">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400">
                      <Mail size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase font-mono">
                        {isPt ? 'Suporte por Email' : 'Email Support'}
                      </div>
                      <a href={`mailto:${settings.contact?.destinationEmail || 'hello@dinemasterpro.com'}`} className="hover:text-amber-400 transition-colors font-medium">
                        {settings.contact?.destinationEmail || 'hello@dinemasterpro.com'}
                      </a>
                    </div>
                  </div>

                  {settings.contact?.phone && (
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400">
                        <Phone size={16} />
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 uppercase font-mono">
                          {isPt ? 'Telefone Direto' : 'Direct Phone'}
                        </div>
                        <a href={`tel:${settings.contact.phone}`} className="hover:text-amber-400 transition-colors font-medium">
                          {settings.contact.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400">
                      <Shield size={16} />
                    </div>
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase font-mono">
                        {isPt ? 'Soberania de Dados' : 'Data Sovereignty'}
                      </div>
                      <div className="font-medium text-slate-300">
                        {isPt ? 'Em Conformidade com o RGPD • Sem Revenda de Dados' : 'GDPR Compliant • Zero Diner Reselling'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Contact Form */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
                {contactSuccess ? (
                  <div className="text-center py-10 space-y-4">
                    <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                      <Check size={28} />
                    </div>
                    <h3 className="text-xl font-bold text-white">
                      {isPt ? 'Mensagem Recebida!' : 'Inquiry Received!'}
                    </h3>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto">
                      {isPt 
                        ? 'Obrigado por contactar o DineMaster Pro. Um dos nossos especialistas entrará em contacto nas próximas 24 horas.'
                        : 'Thank you for contacting DineMaster Pro. One of our hospitality specialists will review your details and reach out within 24 hours.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setContactSuccess(false)}
                      className="px-5 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      {isPt ? 'Enviar Outra Mensagem' : 'Send Another Message'}
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleContactSubmit} className="space-y-4 text-xs">
                    {contactError && (
                      <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                        <AlertCircle size={15} className="flex-shrink-0" />
                        <span>{contactError}</span>
                      </div>
                    )}

                    {/* Honeypot field (hidden from real users) */}
                    <input
                      type="text"
                      name="hp"
                      value={contactForm.hp}
                      onChange={(e) => setContactForm({ ...contactForm, hp: e.target.value })}
                      className="hidden"
                      tabIndex={-1}
                      autoComplete="off"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          {isPt ? 'O Seu Nome *' : 'Your Name *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          placeholder={isPt ? 'ex: Marco Rossi' : 'e.g. Marco Rossi'}
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          {isPt ? 'Email Profissional *' : 'Business Email *'}
                        </label>
                        <input
                          type="email"
                          required
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          placeholder={isPt ? 'marco@restaurante.com' : 'marco@bellavista.com'}
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          {isPt ? 'Nome do Restaurante / Espaço *' : 'Restaurant / Venue Name *'}
                        </label>
                        <input
                          type="text"
                          required
                          value={contactForm.restaurantName}
                          onChange={(e) => setContactForm({ ...contactForm, restaurantName: e.target.value })}
                          placeholder={isPt ? 'ex: Trattoria Bella Vista' : 'e.g. Bella Vista Trattoria'}
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 font-medium mb-1">
                          {isPt ? 'Telefone de Contacto (Opcional)' : 'Phone Number (Optional)'}
                        </label>
                        <input
                          type="tel"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                          placeholder={isPt ? '+351 912 345 678' : '+353 87 123 4567'}
                          className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 font-medium mb-1">
                        {isPt ? 'Mensagem / Pedido de Informação *' : 'Inquiry / Message *'}
                      </label>
                      <textarea
                        rows={4}
                        required
                        value={contactForm.message}
                        onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                        placeholder={isPt 
                          ? 'Conte-nos sobre o seu restaurante: número de mesas, média semanal de clientes ou dúvidas sobre migração...'
                          : 'Tell us about your restaurant: table count, average weekly covers, or questions about migration...'}
                        className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-500 text-xs leading-relaxed"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingContact}
                      className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSubmittingContact ? (
                        <span>{isPt ? 'A enviar mensagem...' : 'Sending message...'}</span>
                      ) : (
                        <>
                          <span>{isPt ? 'Enviar Pedido de Informação' : 'Submit Inquiry'}</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-slate-500 text-center">
                      {isPt 
                        ? 'Nunca partilhamos nem vendemos os seus dados. Informação protegida por rigorosas políticas de privacidade.'
                        : 'We never share or sell your details. Your data is protected by strict privacy policies.'}
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 8. Footer                                                      */}
      {/* ============================================================== */}
      <footer className="bg-slate-950 border-t border-slate-800 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="md:col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                {settings.general?.logoUrl ? (
                  <img 
                    src={settings.general.logoUrl} 
                    alt={settings.general?.siteName || 'Logo'} 
                    className="w-8 h-8 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gradient-to-tr from-amber-500 to-amber-400 rounded-lg flex items-center justify-center text-slate-950 font-bold text-base">
                    {settings.general?.siteName ? settings.general.siteName.charAt(0) : 'D'}
                  </div>
                )}
                <span className="text-lg font-bold text-white">
                  {settings.general?.siteName || 'DineMaster Pro'}
                </span>
              </div>
              <p className="text-xs text-slate-400 max-w-sm leading-relaxed">
                {isPt 
                  ? 'O DineMaster Pro é um sistema operacional inteligente de reservas e gestão de mesas desenhado para restaurantes, bistrôs e grupos hoteleiros em todo o mundo.'
                  : (settings.footer?.description || 'DineMaster Pro is an intelligent multi-tenant reservation and table management operating system designed for restaurants, bistros, and hospitality groups worldwide.')}
              </p>
            </div>

            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                {isPt ? 'Produto' : 'Product'}
              </div>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <a href="#about" className="hover:text-white transition-colors">
                    {isPt ? 'Como Funciona' : 'How It Works'}
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    {isPt ? 'Plantas & Mesas' : 'Floor Plans & Tables'}
                  </a>
                </li>
                {showPricingSection && (
                  <li>
                    <a href="#pricing" className="hover:text-white transition-colors">
                      {isPt ? 'Planos & Preços' : 'Plans & Pricing'}
                    </a>
                  </li>
                )}
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    {isPt ? 'Entrar no Painel' : 'Sign In to Dashboard'}
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider mb-3">
                {isPt ? 'Legal & Confiança' : 'Legal & Trust'}
              </div>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>
                  <Link to="/privacy" className="hover:text-white transition-colors">
                    {isPt ? 'Política de Privacidade' : 'Privacy Policy'}
                  </Link>
                </li>
                <li>
                  <Link to="/terms" className="hover:text-white transition-colors">
                    {isPt ? 'Termos & Condições' : 'Terms & Conditions'}
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="hover:text-white transition-colors">
                    {isPt ? 'Política de Cookies' : 'Cookie Policy'}
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-900 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <div>
              {isPt 
                ? `© ${new Date().getFullYear()} DineMaster Pro. Todos os direitos reservados.`
                : (settings.footer?.copyright || `© ${new Date().getFullYear()} DineMaster Pro. All rights reserved.`)}
            </div>

            <div className="flex items-center gap-4">
              {settings.footer?.socialLinks?.instagram && (
                <a href={settings.footer.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
                  Instagram
                </a>
              )}
              {settings.footer?.socialLinks?.linkedin && (
                <a href={settings.footer.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
                  LinkedIn
                </a>
              )}
              {settings.footer?.socialLinks?.x && (
                <a href={settings.footer.socialLinks.x} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 transition-colors">
                  X / Twitter
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
