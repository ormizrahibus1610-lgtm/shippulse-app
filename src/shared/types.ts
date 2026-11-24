export type RoadmapStatus = "planned" | "in_progress" | "shipped";
export interface FeatureItem {
  id: string; title: string; status: RoadmapStatus;
  votes: number; authorId: string;
}
export interface ChangelogEntry {
  id: string; title: string; body: string;
  featureId: string; publishedAt: string;
}
export interface SessionUser {
  id: string; email: string; role: "user" | "admin";
}
export interface VoteResult { feature: FeatureItem; voted: boolean; }
export interface ShipPulseStore {
  mode: "local" | "supabase";
  listFeatures(): FeatureItem[];
  createFeature(title: string, authorId: string): FeatureItem;
  toggleUpvote(featureId: string, userId: string): VoteResult | null;
  listChangelogs(): ChangelogEntry[];
  publishChangelog(title: string, body: string, featureId: string): ChangelogEntry;
}
