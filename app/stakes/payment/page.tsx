"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function PaymentPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const stakeId = searchParams.get("stakeId");

  const [stake, setStake] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [proofUrl, setProofUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (stakeId) {
      fetchStake();
    }
  }, [stakeId]);

  const fetchStake = async () => {
    try {
      const response = await fetch(`/api/stakes/${stakeId}`);
      const data = await response.json();
      setStake(data.stake);
    } catch (error) {
      console.error("Error fetching stake:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaid = async () => {
    setSubmitting(true);
    try {
      const response = await fetch(`/api/stakes/${stakeId}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paid: true,
          proofUrl: proofUrl || null,
        }),
      });

      if (response.ok) {
        router.push("/mobile?message=Payment confirmed. Good on you for following through.");
      }
    } catch (error) {
      console.error("Error confirming payment:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheated = async () => {
    const confirmed = confirm(
      "Are you sure? Admitting you cheated means you didn't pay. This is logged forever."
    );

    if (!confirmed) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/stakes/${stakeId}/confirm-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paid: false,
          cheated: true,
        }),
      });

      if (response.ok) {
        router.push("/mobile?message=Cheated logged. You know what this means.");
      }
    } catch (error) {
      console.error("Error logging cheat:", error);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-4 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!stake) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 p-4 flex items-center justify-center">
        <p className="text-slate-400">Stake not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <h1 className="text-3xl font-serif uppercase tracking-widest text-blood mb-2">
          The Commitment Was Not Met
        </h1>
        <p className="text-slate-300 mb-8">
          You set this stake to become who you want to be. Now honor that choice.
        </p>

        {/* Amount Due */}
        <div className="scroll-card border border-blood/40 p-8 mb-6">
          <p className="text-slate-700 text-lg mb-2">Amount Due:</p>
          <p className="text-6xl font-bold text-blood mb-4">
            ${stake.amount}
          </p>
          <p className="text-slate-700 mb-4">Donate to:</p>
          <p className="text-slate-900 font-semibold text-xl mb-2">
            {stake.antiCharityName}
          </p>
          {stake.antiCharityUrl && (
            <a
              href={stake.antiCharityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-blood/20 text-blood border border-blood px-6 py-3 rounded-lg font-semibold transition-colors hover:bg-blood/30"
            >
              Open Donation Page →
            </a>
          )}
        </div>

        {/* Proof Upload */}
        <div className="scroll-card p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            Proof of Payment (Optional)
          </h3>
          <p className="text-slate-700 text-sm mb-4">
            Upload a screenshot or paste an image URL showing you made the
            donation.
          </p>
          <input
            type="url"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            placeholder="https://i.imgur.com/..."
            className="w-full bg-slate-900/10 border border-slate-900/20 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-mana/50 mb-4"
          />
          <p className="text-slate-700 text-xs">
            This is optional but recommended for accountability.
          </p>
        </div>

        {/* Confirm Actions */}
        <div className="space-y-4">
          <button
            onClick={handlePaid}
            disabled={submitting}
            className="w-full bg-gold-solid text-slate-950 font-bold font-serif uppercase tracking-wide py-4 rounded-lg transition-colors disabled:opacity-60"
          >
            {submitting ? "Confirming..." : "✓ I Paid the Donation"}
          </button>

          <button
            onClick={handleCheated}
            disabled={submitting}
            className="w-full bg-blood/20 text-blood border border-blood font-semibold py-4 rounded-lg transition-colors hover:bg-blood/30 disabled:opacity-60"
          >
            I Cheated (Didn't Pay)
          </button>
        </div>

        <div className="mt-8 scroll-card border border-gold/30 p-4">
          <p className="text-slate-700 text-sm">
            <strong>Why Honor This:</strong> You chose this commitment to forge yourself into who you want to become.
            No one enforces this but you. Paying this stake proves you take your word seriously—to yourself, not to the app.
            The system logs everything. You'll know. That's what matters.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-950 text-slate-200 p-4 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  );
}
