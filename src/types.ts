export interface UserData {
  joinDate: string;
  points: number;
  wasWarned: boolean;
  nick: string;
}

export interface TrackedPlayer {
  trackedSince: string;
  assignedBy: string;
  warnedAfter7d: boolean;
  warnedAfter14d: boolean;
  lastPoints: number;
}
