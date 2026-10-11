import React, { useState, useEffect } from 'react';
import { Plan, PlanEntitlements, PlanCustomFeature } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { 
  listAllPlans, 
  savePlan, 
  togglePlanVisibility, 
  deletePlan, 
  resetPlansToDefault 
} from '../../services/planService';
import { 
  CreditCard, 
  Check, 
  Sparkles, 
  Shield, 
  Users, 
  Calendar, 
  Globe, 
  MessageCircle, 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  X, 
  Smartphone, 
  BarChart3, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Sliders
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export const SuperAdminPlans: React.FC = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'visible' | 'hidden'>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isNewPlan, setIsNewPlan] = useState(false);

  // Form state
  const [formData, setFormData] = useState<{
    id: string;
    name: string;
    description: string;
    priceMonthly: number;
    currency: string;
    isPopular: boolean;
    isVisible: boolean;
    entitlements: PlanEntitlements;
    customFeatures: PlanCustomFeature[];
  }>({
    id: '',
    name: '',
    description: '',
    priceMonthly: 0,
    currency: 'EUR',
    isPopular: false,
    isVisible: true,
    entitlements: {
      maxStaffUsers: 5,
      maxTables: 25,
      maxReservations: 500,
      customDomain: false,
      advancedAnalytics: false,
      whatsapp: false,
      sms: false,
      advancedSEO: false,
      waitlist: false,
      apiAccess: false,
    },
    customFeatures: [],
  });

  const loadPlans = async () => {
    setLoading(true);
    try {
      const data = await listAllPlans();
      setPlans(data);
    } catch (err) {
      console.error('Error loading plans:', err);
      toast.error('Failed to load plans from database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  const handleOpenEdit = (plan: Plan) => {
    setIsNewPlan(false);
    setEditingPlan(plan);
    setFormData({
      id: plan.id,
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      currency: plan.currency || 'EUR',
      isPopular: Boolean(plan.isPopular),
      isVisible: plan.isActive !== false && plan.isPublic !== false,
      entitlements: { ...plan.entitlements },
      customFeatures: Array.isArray(plan.customFeatures)
        ? plan.customFeatures.map(f => ({ ...f }))
        : [],
    });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setIsNewPlan(true);
    setEditingPlan(null);
    const newId = `tier-${Date.now().toString(36)}`;
    setFormData({
      id: newId,
      name: '',
      description: '',
      priceMonthly: 39,
      currency: 'EUR',
      isPopular: false,
      isVisible: true,
      entitlements: {
        maxStaffUsers: 5,
        maxTables: 30,
        maxReservations: 500,
        customDomain: true,
        advancedAnalytics: true,
        whatsapp: true,
        sms: true,
        advancedSEO: true,
        waitlist: true,
        apiAccess: false,
      },
      customFeatures: [],
    });
    setIsModalOpen(true);
  };

  const handleAddCustomFeature = () => {
    const newFeat: PlanCustomFeature = {
      id: `feat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      title: '',
      description: '',
      enabled: true,
    };
    setFormData(prev => ({
      ...prev,
      customFeatures: [...prev.customFeatures, newFeat],
    }));
  };

  const handleUpdateCustomFeature = (index: number, field: keyof PlanCustomFeature, value: any) => {
    setFormData(prev => {
      const updated = [...prev.customFeatures];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return {
        ...prev,
        customFeatures: updated,
      };
    });
  };

  const handleRemoveCustomFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      customFeatures: prev.customFeatures.filter((_, i) => i !== index),
    }));
  };

  const handleToggleVisibility = async (plan: Plan) => {
    const currentVisibility = plan.isActive !== false && plan.isPublic !== false;
    const newVisibility = !currentVisibility;

    // Optimistic update
    setPlans(prev => prev.map(p => {
      if (p.id === plan.id) {
        return { ...p, isActive: newVisibility, isPublic: newVisibility };
      }
      return p;
    }));

    try {
      await togglePlanVisibility(plan.id, newVisibility, user);
      toast.success(
        newVisibility
          ? `Plan "${plan.name}" is now visible on the public website.`
          : `Plan "${plan.name}" is now hidden from the public website.`
      );
    } catch (err) {
      console.error('Error toggling plan visibility:', err);
      toast.error('Failed to update plan visibility.');
      loadPlans();
    }
  };

  const handleDeletePlan = async (plan: Plan) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${plan.name}"? Restaurants currently subscribed may be affected.`)) {
      return;
    }

    try {
      await deletePlan(plan.id, user);
      toast.success(`Plan "${plan.name}" deleted.`);
      setPlans(prev => prev.filter(p => p.id !== plan.id));
    } catch (err) {
      console.error('Error deleting plan:', err);
      toast.error('Failed to delete plan.');
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Reset all plans to standard platform defaults? Any custom modifications will be overwritten.')) {
      return;
    }

    setLoading(true);
    try {
      const reset = await resetPlansToDefault(user);
      setPlans(reset);
      toast.success('Plans reset to platform defaults.');
    } catch (err) {
      console.error('Error resetting plans:', err);
      toast.error('Failed to reset plans.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Please enter a plan name.');
      return;
    }

    setIsSaving(true);
    try {
      const planToSave: Plan = {
        id: formData.id,
        name: formData.name.trim(),
        description: formData.description.trim(),
        priceMonthly: Number(formData.priceMonthly),
        currency: formData.currency,
        isPopular: formData.isPopular,
        isActive: formData.isVisible,
        isPublic: formData.isVisible,
        entitlements: {
          maxStaffUsers: Number(formData.entitlements.maxStaffUsers),
          maxTables: Number(formData.entitlements.maxTables),
          maxReservations: Number(formData.entitlements.maxReservations),
          customDomain: Boolean(formData.entitlements.customDomain),
          advancedAnalytics: Boolean(formData.entitlements.advancedAnalytics),
          whatsapp: Boolean(formData.entitlements.whatsapp),
          sms: Boolean(formData.entitlements.sms),
          advancedSEO: Boolean(formData.entitlements.advancedSEO),
          waitlist: Boolean(formData.entitlements.waitlist),
          apiAccess: Boolean(formData.entitlements.apiAccess),
        },
        customFeatures: (formData.customFeatures || [])
          .map(f => ({
            id: f.id || `feat-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
            title: f.title.trim(),
            description: f.description.trim(),
            enabled: f.enabled !== false,
          }))
          .filter(f => Boolean(f.title)),
      };

      const saved = await savePlan(planToSave, user);
      toast.success(`Plan "${saved.name}" saved successfully.`);
      setIsModalOpen(false);
      await loadPlans();
    } catch (err: any) {
      console.error('Error saving plan:', err);
      toast.error(err?.message || 'Failed to save plan.');
    } finally {
      setIsSaving(false);
    }
  };

  const visiblePlansCount = plans.filter(p => p.isActive !== false && p.isPublic !== false).length;
  const hiddenPlansCount = plans.length - visiblePlansCount;

  const filteredPlans = plans.filter(p => {
    const isVisible = p.isActive !== false && p.isPublic !== false;
    if (filter === 'visible') return isVisible;
    if (filter === 'hidden') return !isVisible;
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
            <CreditCard className="text-amber-400" size={24} />
            <span>SaaS Plans & Entitlements</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure subscription pricing, feature gating, quotas, and toggle which plans appear on the marketing website.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Reset plans to default platform definitions"
          >
            <RotateCcw size={13} />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={15} />
            <span>Add New Plan</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filter === 'all'
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Plans ({plans.length})
          </button>

          <button
            onClick={() => setFilter('visible')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'visible'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Eye size={13} />
            <span>Visible on Website ({visiblePlansCount})</span>
          </button>

          <button
            onClick={() => setFilter('hidden')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
              filter === 'hidden'
                ? 'bg-slate-800 text-slate-200 border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <EyeOff size={13} />
            <span>Hidden ({hiddenPlansCount})</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          Changes take effect immediately on public registration and pricing.
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-950 border border-slate-800/80 rounded-2xl">
          <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mb-3" />
          <span className="text-xs text-slate-400">Loading SaaS plans and entitlements...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {filteredPlans.map((p) => {
            const isVisible = p.isActive !== false && p.isPublic !== false;

            return (
              <div 
                key={p.id}
                className={`bg-slate-950 border rounded-2xl p-6 flex flex-col justify-between transition-all relative ${
                  !isVisible 
                    ? 'border-slate-800/60 opacity-80' 
                    : p.isPopular 
                      ? 'border-amber-500/80 shadow-xl shadow-amber-500/10' 
                      : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Top Badges */}
                <div>
                  <div className="flex items-center justify-between mb-3 gap-2">
                    {p.isPopular ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full shadow-sm">
                        <Sparkles size={10} />
                        Most Popular
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                        Tier: {p.id}
                      </span>
                    )}

                    {/* Visibility Badge */}
                    <span 
                      className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                        isVisible 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {isVisible ? <Eye size={10} /> : <EyeOff size={10} />}
                      <span>{isVisible ? 'Visible' : 'Hidden'}</span>
                    </span>
                  </div>

                  <h2 className="text-xl font-bold text-white">{p.name}</h2>
                  <p className="text-xs text-slate-400 mt-1 min-h-[36px] line-clamp-2 leading-relaxed">
                    {p.description}
                  </p>

                  <div className="mt-4 mb-6">
                    <span className="text-3xl font-extrabold text-white">
                      {p.priceMonthly === 0 ? 'Free' : `€${p.priceMonthly}`}
                    </span>
                    {p.priceMonthly > 0 && <span className="text-xs text-slate-400"> / month</span>}
                  </div>

                  {/* Entitlements Breakdown */}
                  <div className="space-y-2.5 text-xs text-slate-300 border-t border-slate-800/80 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar size={13} />
                        Monthly Bookings
                      </span>
                      <span className="font-semibold text-white">
                        {p.entitlements.maxReservations >= 99999 ? 'Unlimited' : p.entitlements.maxReservations}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Users size={13} />
                        Staff Accounts
                      </span>
                      <span className="font-semibold text-white">
                        {p.entitlements.maxStaffUsers >= 900 ? 'Unlimited' : p.entitlements.maxStaffUsers}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Shield size={13} />
                        Max Tables
                      </span>
                      <span className="font-semibold text-white">
                        {p.entitlements.maxTables >= 900 ? 'Unlimited' : p.entitlements.maxTables}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Globe size={13} />
                        Custom Domain
                      </span>
                      <span className={p.entitlements.customDomain ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                        {p.entitlements.customDomain ? 'Included' : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <MessageCircle size={13} />
                        WhatsApp Action
                      </span>
                      <span className={p.entitlements.whatsapp ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                        {p.entitlements.whatsapp ? 'Included' : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Smartphone size={13} />
                        SMS Reminders
                      </span>
                      <span className={p.entitlements.sms ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                        {p.entitlements.sms ? 'Included' : '—'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <BarChart3 size={13} />
                        Analytics & SEO
                      </span>
                      <span className={p.entitlements.advancedAnalytics || p.entitlements.advancedSEO ? 'text-emerald-400 font-semibold' : 'text-slate-600'}>
                        {p.entitlements.advancedAnalytics && p.entitlements.advancedSEO ? 'Included' : p.entitlements.advancedAnalytics ? 'Analytics' : p.entitlements.advancedSEO ? 'SEO' : '—'}
                      </span>
                    </div>

                    {/* Custom Features preview on card */}
                    {p.customFeatures && p.customFeatures.length > 0 && (
                      <div className="pt-2.5 mt-2 border-t border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] text-amber-400 font-semibold">
                          <span className="flex items-center gap-1">
                            <Sparkles size={11} />
                            <span>Additional Features</span>
                          </span>
                          <span className="font-mono text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {p.customFeatures.filter(f => f.enabled !== false).length} active
                          </span>
                        </div>
                        {p.customFeatures.slice(0, 3).map((cf) => (
                          <div key={cf.id} className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-300 truncate max-w-[170px]" title={cf.description || cf.title}>
                              {cf.title}
                            </span>
                            <span className={cf.enabled !== false ? 'text-emerald-400 font-medium' : 'text-slate-600'}>
                              {cf.enabled !== false ? 'Included' : 'Off'}
                            </span>
                          </div>
                        ))}
                        {p.customFeatures.length > 3 && (
                          <span className="text-[10px] text-slate-500 block">
                            +{p.customFeatures.length - 3} more feature{p.customFeatures.length - 3 > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions & Visibility Toggle */}
                <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
                  {/* One-click Visibility Toggle Button */}
                  <button
                    type="button"
                    onClick={() => handleToggleVisibility(p)}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer border ${
                      isVisible 
                        ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800' 
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    {isVisible ? (
                      <>
                        <EyeOff size={13} className="text-slate-400" />
                        <span>Hide from Pricing Page</span>
                      </>
                    ) : (
                      <>
                        <Eye size={13} className="text-emerald-400" />
                        <span>Show on Pricing Page</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 size={13} />
                      <span>Edit Plan</span>
                    </button>

                    <button
                      onClick={() => handleDeletePlan(p)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-900/40 rounded-lg transition-colors cursor-pointer"
                      title="Delete Plan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Plan Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div 
            className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl relative my-8 overflow-hidden text-left"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60 sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sliders size={16} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {isNewPlan ? 'Create New SaaS Plan' : `Edit Plan: ${editingPlan?.name}`}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Define pricing, quotas, and feature entitlements.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* 1. General & Pricing */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold mb-3 flex items-center gap-1.5">
                  <CreditCard size={14} />
                  <span>General Information & Pricing</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Plan Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Professional Plus"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Plan ID / Slug *
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!isNewPlan}
                      value={formData.id}
                      onChange={(e) => setFormData({ ...formData, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })}
                      placeholder="e.g. professional-plus"
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 disabled:opacity-60 disabled:cursor-not-allowed font-mono text-xs"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Description
                    </label>
                    <textarea
                      rows={2}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Short summary displayed on pricing cards..."
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Monthly Price (€)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      required
                      value={formData.priceMonthly}
                      onChange={(e) => setFormData({ ...formData, priceMonthly: Math.max(0, Number(e.target.value)) })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-bold"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">Enter 0 for Free Trial</span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>
                  </div>
                </div>

                {/* Visibility and Popular Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                  {/* Show/Hide Boolean Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVisible}
                      onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Show Plan on Marketing & Registration
                      </span>
                      <span className="text-[11px] text-slate-400 block leading-tight">
                        When checked, this tier is displayed publicly on the website pricing page.
                      </span>
                    </div>
                  </label>

                  {/* Most Popular Toggle */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Highlight as "Most Popular"
                      </span>
                      <span className="text-[11px] text-slate-400 block leading-tight">
                        Displays an amber badge and emphasis border on public pricing cards.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. Quotas & Limits */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold mb-3 flex items-center gap-1.5">
                  <Shield size={14} />
                  <span>Quotas & Limits</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Max Reservations / Mo
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.entitlements.maxReservations}
                      onChange={(e) => setFormData({
                        ...formData,
                        entitlements: {
                          ...formData.entitlements,
                          maxReservations: Number(e.target.value),
                        }
                      })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    <label className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.entitlements.maxReservations >= 999999}
                        onChange={(e) => setFormData({
                          ...formData,
                          entitlements: {
                            ...formData.entitlements,
                            maxReservations: e.target.checked ? 999999 : 500,
                          }
                        })}
                      />
                      <span>Unlimited Bookings</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Max Staff Accounts
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.entitlements.maxStaffUsers}
                      onChange={(e) => setFormData({
                        ...formData,
                        entitlements: {
                          ...formData.entitlements,
                          maxStaffUsers: Number(e.target.value),
                        }
                      })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    <label className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.entitlements.maxStaffUsers >= 999}
                        onChange={(e) => setFormData({
                          ...formData,
                          entitlements: {
                            ...formData.entitlements,
                            maxStaffUsers: e.target.checked ? 999 : 5,
                          }
                        })}
                      />
                      <span>Unlimited Staff</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Max Tables Allowed
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={formData.entitlements.maxTables}
                      onChange={(e) => setFormData({
                        ...formData,
                        entitlements: {
                          ...formData.entitlements,
                          maxTables: Number(e.target.value),
                        }
                      })}
                      className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    <label className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.entitlements.maxTables >= 999}
                        onChange={(e) => setFormData({
                          ...formData,
                          entitlements: {
                            ...formData.entitlements,
                            maxTables: e.target.checked ? 999 : 30,
                          }
                        })}
                      />
                      <span>Unlimited Tables</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* 3. Feature Entitlements & Toggles */}
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold mb-3 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  <span>Feature Entitlements</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'customDomain', label: 'Custom Domain Mapping', desc: 'Allows restaurants to link apex & CNAME domains' },
                    { key: 'whatsapp', label: 'WhatsApp Action Integration', desc: 'One-click WhatsApp notifications to guests' },
                    { key: 'sms', label: 'SMS Reminders', desc: 'Automated 2-hour pre-arrival booking SMS notifications' },
                    { key: 'advancedAnalytics', label: 'Advanced Analytics', desc: 'Shift analytics, covers per hour, revenue reporting' },
                    { key: 'advancedSEO', label: 'Advanced SEO & Schema.org', desc: 'Rich Google search result snippets & OpenGraph tags' },
                    { key: 'waitlist', label: 'Digital Waitlist Queue', desc: 'Walk-in guest queueing when restaurant is fully booked' },
                    { key: 'apiAccess', label: 'REST API & Webhooks Access', desc: 'POS integration and external API synchronization' },
                  ].map((feat) => {
                    const isChecked = Boolean(formData.entitlements[feat.key as keyof PlanEntitlements]);

                    return (
                      <label 
                        key={feat.key}
                        className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition-colors ${
                          isChecked 
                            ? 'bg-amber-500/5 border-amber-500/30' 
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => setFormData({
                            ...formData,
                            entitlements: {
                              ...formData.entitlements,
                              [feat.key]: e.target.checked,
                            }
                          })}
                          className="mt-0.5 w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                        />
                        <div>
                          <span className={`text-xs font-semibold block ${isChecked ? 'text-white' : 'text-slate-300'}`}>
                            {feat.label}
                          </span>
                          <span className="text-[11px] text-slate-400 block leading-tight mt-0.5">
                            {feat.desc}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* Custom Features Section (User defined title & description) */}
                <div className="mt-5 pt-4 border-t border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                          <Sparkles size={13} className="text-amber-400" />
                          <span>Custom Feature Entitlements</span>
                        </h5>
                        {formData.customFeatures.length > 0 && (
                          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono">
                            {formData.customFeatures.length} {formData.customFeatures.length === 1 ? 'Feature' : 'Features'}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Add and configure brand-new features with custom titles and descriptions for this plan.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCustomFeature}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-semibold transition-all cursor-pointer shadow-sm w-fit"
                    >
                      <Plus size={14} />
                      <span>Add Feature</span>
                    </button>
                  </div>

                  {formData.customFeatures.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-slate-800 bg-slate-950/40 text-center">
                      <p className="text-xs text-slate-400">
                        No custom features added yet. Click <span className="text-amber-400 font-semibold cursor-pointer" onClick={handleAddCustomFeature}>+ Add Feature</span> to write a title and description for new features available on this plan.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.customFeatures.map((feat, index) => (
                        <div 
                          key={feat.id || index}
                          className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 hover:border-slate-700 transition-colors space-y-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={feat.enabled !== false}
                                onChange={(e) => handleUpdateCustomFeature(index, 'enabled', e.target.checked)}
                                className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500"
                              />
                              <span className="text-[11px] font-mono uppercase tracking-wider">
                                {feat.enabled !== false ? (
                                  <span className="text-emerald-400 font-semibold">Enabled in Plan</span>
                                ) : (
                                  <span className="text-slate-500 font-medium">Disabled</span>
                                )}
                              </span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleRemoveCustomFeature(index)}
                              className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-900/40"
                              title="Delete feature"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-1">
                              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                Feature Title *
                              </label>
                              <input
                                type="text"
                                value={feat.title}
                                onChange={(e) => handleUpdateCustomFeature(index, 'title', e.target.value)}
                                placeholder="e.g. VIP Concierge"
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                              />
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-1">
                                Feature Description *
                              </label>
                              <input
                                type="text"
                                value={feat.description}
                                onChange={(e) => handleUpdateCustomFeature(index, 'description', e.target.value)}
                                placeholder="e.g. Dedicated concierge service and priority VIP guest handling"
                                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full" />
                      <span>Saving Plan...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>Save Plan & Entitlements</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
