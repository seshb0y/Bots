import * as path from "path";

export const usersPath = path.join(__dirname, "..", "data", "users.json");
export const trackedPath = path.join(__dirname, "..", "data", "tracked.json");

export const OFFICER_ROLE_IDS = ["820326884071047219", "820326884071047220"];
export const ANNOUNCE_CHANNEL_ID = process.env.ANNOUNCE_CHANNEL_ID!;
export const VOICE_CHANNEL_IDS = ["763085196118851608", "885928590720524328"];
export const STATS_CHANNEL_ID = "763085196118851607";
