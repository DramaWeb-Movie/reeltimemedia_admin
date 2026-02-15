"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";
import type { SubscriptionPlan } from "@/types";

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState({
    name: "",
    price: "",
    billing_period: "monthly" as "monthly" | "yearly",
    description: "",
  });

  useEffect(() => {
    fetch("/api/plans")
      .then((res) => (res.ok ? res.json() : { plans: [] }))
      .then((data) => setPlans(data.plans ?? []))
      .catch(() => setPlans([]))
      .finally(() => setIsLoading(false));
  }, []);

  const handleOpenAdd = () => {
    setEditingPlan(null);
    setForm({ name: "", price: "", billing_period: "monthly", description: "" });
    setShowModal(true);
  };

  const handleSave = async () => {
    // TODO: POST to API
    setShowModal(false);
  };

  const formatPrice = (plan: SubscriptionPlan) => {
    const period = plan.billing_period === "monthly" ? "/mo" : "/yr";
    return `$${plan.price.toFixed(2)}${period}`;
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
          <Card key={plan.id} className="hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white">{plan.name}</h3>
                <p className="mt-1 text-2xl font-bold text-red-400">
                  {formatPrice(plan)}
                </p>
                {plan.description && (
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{plan.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditingPlan(plan);
                  setForm({
                    name: plan.name,
                    price: plan.price.toString(),
                    billing_period: plan.billing_period,
                    description: plan.description ?? "",
                  });
                  setShowModal(true);
                }}
              >
                Edit
              </Button>
            </div>
          </Card>
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
            options={[
              { value: "monthly", label: "Monthly" },
              { value: "yearly", label: "Yearly" },
            ]}
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
          <div className="flex gap-3 pt-2">
            <Button type="submit">Save</Button>
            <Button type="button" variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
