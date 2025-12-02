"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface StakeData {
  stake: {
    id: string;
    amount: number;
    startDate: string;
    endDate: string;
    maxSocialMediaMin: number;
    minExposureTasks: number;
    minPhoneFreeBlocks: number;
    antiCharityName: string;
    antiCharityUrl: string;
    evaluated: boolean;
    outcome: string | null;
    paid: boolean;
    cheated: boolean;
  } | null;
  progress?: {
    daysOverLimit: number;
    exposureTasksCompleted: number;
    phoneFreeBlocksCompleted: number;
  };
}

export default function CurrentStakePage() {
  const router = useRouter();
  const [data, setData] = useState<StakeData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStake();
  }, []);

  const fetchStake = async () => {
    try {
      const response = await fetch("/api/stakes");
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching stake:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  if (!data?.stake) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
        <div className="max-w-2xl mx-auto pt-8">
          <button
            onClick={() => router.push("/mobile")}
            className="text-slate-400 hover:text-slate-200 mb-8"
          >
            ← Back to Dashboard
          </button>

          <div className="text-center py-12">
            <h1 className="text-3xl font-bold text-white mb-4">
              No Active Stake
            </h1>
            <p className="text-slate-400 mb-8">
              You don't have a stake commitment for this week.
            </p>
            <button
              onClick={() => router.push("/stakes/create")}
              className="bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-3 px-8 rounded-lg transition-colors"
            >
              Create Weekly Stake
            </button>
          </div>
        </div>
      </div>
    );
  }

  const { stake, progress } = data;
  const startDate = new Date(stake.startDate);
  const endDate = new Date(stake.endDate);
  const now = new Date();
  const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Determine pass/fail status
  const isOnTrack =
    (progress?.daysOverLimit || 0) === 0 &&
    (progress?.exposureTasksCompleted || 0) >= stake.minExposureTasks &&
    (progress?.phoneFreeBlocksCompleted || 0) >= stake.minPhoneFreeBlocks;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <button
          onClick={() => router.push("/mobile")}
          className="text-slate-400 hover:text-slate-200 mb-8"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-white mb-2">
          This Week's Stake
        </h1>
        <p className="text-slate-400 mb-6">
          {startDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
          {" → "}
          {endDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          })}
        </p>

        {/* Status Banner */}
        <div
          className={`rounded-lg p-6 mb-6 ${
            isOnTrack
              ? "bg-green-500/10 border border-green-500/30"
              : "bg-red-500/10 border border-red-500/30"
          }`}
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-4xl">{isOnTrack ? "✅" : "⚠️"}</span>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {isOnTrack ? "On Track" : "Failing"}
              </h2>
              <p className="text-slate-300">
                {daysLeft > 0 ? `${daysLeft} days left` : "Week ended"}
              </p>
            </div>
          </div>
          <p className="text-lg font-semibold text-white mt-4">
            ${stake.amount} at stake
          </p>
        </div>

        {/* Progress */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Progress</h3>

          <div className="space-y-4">
            {/* Social Media */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Social Media Limit</span>
                <span
                  className={`font-semibold ${
                    (progress?.daysOverLimit || 0) === 0
                      ? "text-green-400"
                      : "text-red-400"
                  }`}
                >
                  {progress?.daysOverLimit || 0} days over limit
                </span>
              </div>
              <p className="text-sm text-slate-400">
                Max: {stake.maxSocialMediaMin} min/day
              </p>
            </div>

            {/* Exposure Tasks */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Exposure Tasks</span>
                <span
                  className={`font-semibold ${
                    (progress?.exposureTasksCompleted || 0) >=
                    stake.minExposureTasks
                      ? "text-green-400"
                      : "text-amber-400"
                  }`}
                >
                  {progress?.exposureTasksCompleted || 0} / {stake.minExposureTasks}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      ((progress?.exposureTasksCompleted || 0) /
                        stake.minExposureTasks) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>

            {/* Phone-Free Blocks */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Phone-Free Blocks</span>
                <span
                  className={`font-semibold ${
                    (progress?.phoneFreeBlocksCompleted || 0) >=
                    stake.minPhoneFreeBlocks
                      ? "text-green-400"
                      : "text-amber-400"
                  }`}
                >
                  {progress?.phoneFreeBlocksCompleted || 0} /{" "}
                  {stake.minPhoneFreeBlocks}
                </span>
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      100,
                      ((progress?.phoneFreeBlocksCompleted || 0) /
                        stake.minPhoneFreeBlocks) *
                        100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Anti-Charity Warning */}
        {!isOnTrack && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-red-200 mb-2">
              If You Fail...
            </h3>
            <p className="text-slate-300 mb-3">
              You'll need to donate <span className="font-bold text-red-300">${stake.amount}</span> to:
            </p>
            <p className="text-white font-semibold mb-2">{stake.antiCharityName}</p>
            {stake.antiCharityUrl && (
              <a
                href={stake.antiCharityUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-red-400 hover:text-red-300 text-sm underline"
              >
                {stake.antiCharityUrl}
              </a>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/phone/log")}
            className="bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors"
          >
            Log Phone Usage
          </button>
          <button
            onClick={() => router.push("/tasks")}
            className="bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg transition-colors"
          >
            Add Exposure Task
          </button>
        </div>
      </div>
    </div>
  );
}
