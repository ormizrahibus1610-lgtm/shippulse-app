import type {
  ChangelogEntry,
  FeatureItem,
  ShipPulseStore,
  VoteResult,
} from "../../shared/types.ts";

export function createStore(env: NodeJS.ProcessEnv = process.env): ShipPulseStore {
  const mode: "local" | "supabase" = env.SUPABASE_URL?.trim() ? "supabase" : "local";

  const features: FeatureItem[] = [
    {
      id: "feat-1",
      title: "Live Terminal Stream",
      status: "in_progress",
      votes: 42,
      authorId: "seed",
    },
    {
      id: "feat-2",
      title: "Automated RLS Checks",
      status: "shipped",
      votes: 19,
      authorId: "seed",
    },
  ];

  const changelogs: ChangelogEntry[] = [
    {
      id: "log-1",
      title: "v1.0.0 - Automated RLS Checks",
      body: "Shipped automated Row Level Security verification across ShipPulse tables.",
      featureId: "feat-2",
      publishedAt: "2026-01-15T00:00:00.000Z",
    },
  ];

  const votesByUser = new Set<string>();
  let nextFeatureNumber = features.length + 1;
  let nextChangelogNumber = changelogs.length + 1;

  return {
    mode,

    listFeatures(): FeatureItem[] {
      return features.map((item) => ({ ...item }));
    },

    createFeature(title: string, authorId: string): FeatureItem {
      const item: FeatureItem = {
        id: `feat-${nextFeatureNumber++}`,
        title: title.trim(),
        status: "planned",
        votes: 1,
        authorId,
      };
      features.push(item);
      return { ...item };
    },

    toggleUpvote(featureId: string, userId: string): VoteResult | null {
      const feature = features.find((item) => item.id === featureId);
      if (!feature) return null;

      const key = `${featureId}:${userId}`;
      if (votesByUser.has(key)) {
        votesByUser.delete(key);
        feature.votes = Math.max(0, feature.votes - 1);
        return { feature: { ...feature }, voted: false };
      }

      votesByUser.add(key);
      feature.votes += 1;
      return { feature: { ...feature }, voted: true };
    },

    listChangelogs(): ChangelogEntry[] {
      return changelogs.map((entry) => ({ ...entry }));
    },

    publishChangelog(title: string, body: string, featureId: string): ChangelogEntry {
      const entry: ChangelogEntry = {
        id: `log-${nextChangelogNumber++}`,
        title: title.trim(),
        body: body.trim(),
        featureId,
        publishedAt: new Date().toISOString(),
      };
      changelogs.push(entry);
      return { ...entry };
    },
  };
}
