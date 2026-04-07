"use client";

import { useState, useEffect, useCallback, memo } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import type { SubscriptionPlan } from "@/types";

const BILLING_PERIOD_OPTIONS = [
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

function formatPrice(plan: SubscriptionPlan) {
  const period = plan.billing_period === "monthly" ? "/mo" : "/yr";
  return `$${plan.price.toFixed(2)}${period}`;
}

async function fetchPlansList(signal?: AbortSignal): Promise<SubscriptionPlan[]> {
  const res = await fetch("/api/plans", { signal });
  if (!res.ok) return [];
  const data = await res.json();
  return data.plans ?? [];
}

type PlanCardProps = {
  plan: SubscriptionPlan;
  onEdit: (plan: SubscriptionPlan) => void;
};

const PlanCard = memo(function PlanCard({ plan, onEdit }: PlanCardProps) {
  return (
    <Card className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-white">{plan.name}</h3>
          <p className="mt-1 text-2xl font-bold text-red-400">{formatPrice(plan)}</p>
          {plan.description && (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{plan.description}</p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => onEdit(plan)}>
          Edit
        </Button>
      </div>
    </Card>
  );
});

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    billing_period: "monthly" as "monthly" | "yearly",
    description: "",
  });

  useEffect(() => {
    const ac = new AbortController();
    setIsLoading(true);
    fetchPlansList(ac.signal)
      .then((list) => {
        if (!ac.signal.aborted) setPlans(list);
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        if (!ac.signal.aborted) setPlans([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setIsLoading(false);
      });
    return () => ac.abort();
  }, []);

  const handleOpenAdd = useCallback(() => {
    setEditingPlan(null);
    setForm({ name: "", price: "", billing_period: "monthly", description: "" });
    setSaveError(null);
    setShowModal(true);
  }, []);

  const handleEditPlan = useCallback((plan: SubscriptionPlan) => {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      price: plan.price.toString(),
      billing_period: plan.billing_period,
      description: plan.description ?? "",
    });
    setSaveError(null);
    setShowModal(true);
  }, []);

  const handleSave = async () => {
    setSaveError(null);
    setIsSaving(true);
    const editingId = editingPlan?.id ?? null;
    try {
      const payload = {
        name: form.name.trim(),
        price: parseFloat(form.price) || 0,
        billing_period: form.billing_period,
        description: form.description.trim() || null,
        currency: "USD",
      };
      const url = editingPlan ? `/api/plans/${editingPlan.id}` : "/api/plans";
      const method = editingPlan ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSaveError(data.error || "Failed to save plan");
        return;
      }
      const saved = data.plan as SubscriptionPlan | undefined;
      if (saved) {
        setPlans((prev) => {
          if (editingId) {
            return prev.map((p) => (p.id === saved.id ? saved : p));
          }
          return [saved, ...prev];
        });
      } else {
        const list = await fetchPlansList();
        setPlans(list);
      }
      setShowModal(false);
    } catch {
      setSaveError("Failed to save plan");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Subscription Plans</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Manage plans for series access. Users need a subscription to watch series.
          </p>
        </div>
        <Button onClick={handleOpenAdd}>Add Plan</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onEdit={handleEditPlan} />
        ))}
      </div>

      {plans.length === 0 && (
        <Card className="text-center py-12">
          <p className="text-slate-600 dark:text-slate-500">No subscription plans yet.</p>
          <p className="text-sm text-slate-600 mt-1">
            Add a plan so users can subscribe to watch series.
          </p>
          <Button className="mt-4" onClick={handleOpenAdd}>
            Add Plan
          </Button>
        </Card>
      )}

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingPlan ? "Edit Plan" : "Add Plan"}
      >
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
          <Input
            label="Plan Name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Monthly Premium"
            required
          />
          <Input
            label="Price (USD)"
            type="number"
            step="0.01"
            min="0"
            value={form.price}
            onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
            placeholder="9.99"
            required
          />
          <Select
            label="Billing Period"
            options={BILLING_PERIOD_OPTIONS}
            value={form.billing_period}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                billing_period: e.target.value as "monthly" | "yearly",
              }))
            }
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Full access to all series..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500"
            />
          </div>
          {saveError && (
            <p className="text-sm text-red-500">{saveError}</p>
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving…" : "Save"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={isSaving}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
