export interface RoadmapNode {
  id: string;
  title: string;
  description?: string;
  resources?: string[];
  children: RoadmapNode[];
}

export interface RoadmapContent {
  topic: string;
  title: string;
  summary?: string;
  nodes: RoadmapNode[];
}

export interface Roadmap {
  id: string;
  topic: string;
  title: string;
  content: RoadmapContent;
  createdAt: string;
  updatedAt: string;
  completedIds: string[];
  totalNodes: number;
}

export interface RoadmapSummary {
  id: string;
  topic: string;
  title: string;
  createdAt: string;
  totalNodes: number;
  completedCount: number;
}

export interface User {
  id: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
  createdAt: string;
}
