"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function CreateStakePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    amount: 100,
    maxSocialMediaMin: 30,
    minExposureTasks: 3,
    minPhoneFreeBlocks: 5,
    antiCharityName: "Trump 2024 Campaign",
    antiCharityUrl: "https://www.winred.com/save-america-joint-fundraising-committee/donate",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Calculate next Monday and Sunday
  const getNextWeekRange = () => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek; // Next Monday

    const startDate = new Date(now);
    startDate.setDate(now.getDate() + daysUntilMonday);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6); // Sunday
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  };

  const { startDate, endDate } = getNextWeekRange();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stakes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create stake");
      }

      router.push("/stakes/current");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent text-dd-text">
      {/* Header */}
      <header className="glass-panel rounded-none p-4">
        <Link href="/mobile" className="text-dd-muted hover:text-dd-text mb-4 inline-block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-serif uppercase tracking-widest text-mana mb-2">
          Create Weekly Stake
        </h1>
        <p className="text-dd-muted">
          You choose this commitment to become who you want to be. Make it count.
        </p>
      </header>

      <div className="p-4 space-y-4">
        {/* Week Range Display */}
        <Card className="scroll-card border border-gold/30">
          <div className="flex items-center gap-2 text-gold mb-2">
            <span className="text-2xl">⚠️</span>
            <span className="font-semibold">This Week's Commitment</span>
          </div>
          <p className="text-dd-text">
            {startDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric"
            })}
            {" → "}
            {endDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "short",
              day: "numeric"
            })}
          </p>
        </Card>

        {error && (
          <Card className="scroll-card border border-blood/40">
            <p className="text-blood">{error}</p>
          </Card>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Amount */}
          <Card className="scroll-card">
            <label className="block text-sm font-medium text-dd-muted mb-2">
              Stake Amount ($)
            </label>
            <input
              type="number"
              min="1"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: parseInt(e.target.value) })
              }
              className="w-full bg-dd-surface/60 border border-dd-border/60 rounded-[--radius-lg] px-4 py-3 text-dd-text text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-mana/50 tabular-nums"
              required
            />
            <p className="text-dd-muted text-sm mt-2">
              This is what you'll donate if you fail.
            </p>
          </Card>

          {/* Success Criteria */}
          <Card className="scroll-card">
            <h3 className="text-lg font-serif uppercase tracking-widest text-dd-text mb-4">
              Success Criteria
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dd-muted mb-2">
                  Max Social Media (minutes/day)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.maxSocialMediaMin}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxSocialMediaMin: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-dd-surface/60 border border-dd-border/60 rounded-[--radius-lg] px-4 py-2 text-dd-text focus:outline-none focus:ring-2 focus:ring-mana/50 tabular-nums"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dd-muted mb-2">
                  Min Exposure Tasks (for the week)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minExposureTasks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minExposureTasks: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-dd-surface/60 border border-dd-border/60 rounded-[--radius-lg] px-4 py-2 text-dd-text focus:outline-none focus:ring-2 focus:ring-mana/50 tabular-nums"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dd-muted mb-2">
                  Min Phone-Free Blocks (for the week)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.minPhoneFreeBlocks}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      minPhoneFreeBlocks: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-dd-surface/60 border border-dd-border/60 rounded-[--radius-lg] px-4 py-2 text-dd-text focus:outline-none focus:ring-2 focus:ring-mana/50 tabular-nums"
                  required
                />
              </div>
            </div>
          </Card>

          {/* Anti-Charity */}
          <Card className="scroll-card border border-blood/40">
            <h3 className="text-lg font-serif uppercase tracking-widest text-blood mb-4">
              Where Your Money Goes (If You Fail)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dd-muted mb-2">
                  Anti-Charity Name
                </label>
                <input
                  type="text"
                  value={formData.antiCharityName}
                  onChange={(e) =>
                    setFormData({ ...formData, antiCharityName: e.target.value })
                  }
                  className="w-full bg-dd-surface/60 border border-dd-border/60 rounded-[--radius-lg] px-4 py-2 text-dd-text focus:outline-none focus:ring-2 focus:ring-blood/40"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-dd-muted mb-2">
                  Donation URL (optional)
                </label>
                <input
                  type="url"
                  value={formData.antiCharityUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, antiCharityUrl: e.target.value })
                  }
                  className="w-full bg-dd-surface/60 border border-dd-border/60 rounded-[--radius-lg] px-4 py-2 text-dd-text focus:outline-none focus:ring-2 focus:ring-blood/40"
                  placeholder="https://..."
                />
                <p className="text-dd-muted text-sm mt-2">
                  Choose something you genuinely don't want to support.
                </p>
              </div>
            </div>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating Commitment..." : `Commit $${formData.amount} for This Week`}
          </Button>

          <p className="text-center text-dd-muted text-sm">
            This stake is a weapon you choose to wield against distraction.
            <br />
            Honor this commitment to honor yourself. No one else will enforce it.
          </p>
        </form>
      </div>
    </div>
  );
}
