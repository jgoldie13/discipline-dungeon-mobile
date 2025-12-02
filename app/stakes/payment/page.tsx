"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function PaymentPage() {
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!stake) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 flex items-center justify-center">
        <p className="text-slate-400">Stake not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <h1 className="text-3xl font-bold text-red-400 mb-2">You Failed</h1>
        <p className="text-slate-300 mb-8">
          Time to pay the price. No automation. Just honor.
        </p>

        {/* Amount Due */}
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-8 mb-6">
          <p className="text-slate-300 text-lg mb-2">Amount Due:</p>
          <p className="text-6xl font-bold text-red-400 mb-4">
            ${stake.amount}
          </p>
          <p className="text-slate-300 mb-4">Donate to:</p>
          <p className="text-white font-semibold text-xl mb-2">
            {stake.antiCharityName}
          </p>
          {stake.antiCharityUrl && (
            <a
              href={stake.antiCharityUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
            >
              Open Donation Page →
            </a>
          )}
        </div>

        {/* Proof Upload */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Proof of Payment (Optional)
          </h3>
          <p className="text-slate-400 text-sm mb-4">
            Upload a screenshot or paste an image URL showing you made the
            donation.
          </p>
          <input
            type="url"
            value={proofUrl}
            onChange={(e) => setProofUrl(e.target.value)}
            placeholder="https://i.imgur.com/..."
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4"
          />
          <p className="text-slate-500 text-xs">
            This is optional but recommended for accountability.
          </p>
        </div>

        {/* Confirm Actions */}
        <div className="space-y-4">
          <button
            onClick={handlePaid}
            disabled={submitting}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-600 text-white font-bold py-4 rounded-lg transition-colors"
          >
            {submitting ? "Confirming..." : "✓ I Paid the Donation"}
          </button>

          <button
            onClick={handleCheated}
            disabled={submitting}
            className="w-full bg-slate-700 hover:bg-slate-600 disabled:bg-slate-500 text-slate-300 font-medium py-4 rounded-lg transition-colors border border-slate-600"
          >
            I Cheated (Didn't Pay)
          </button>
        </div>

        <div className="mt-8 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
          <p className="text-amber-200 text-sm">
            <strong>Why This Matters:</strong> There's no automation here. No
            one is forcing you to pay. This is about honor and self-respect. If
            you cheat, you're only cheating yourself. The system logs
            everything. You'll know. And that's worse.
          </p>
        </div>
      </div>
    </div>
  );
}
