import { Match } from "./types";
import { mockValorantMatches } from "../matches/mockData";

/**
 * Valorant (VLR) 数据源连接器
 * 优先尝试从 VLR.gg 拉取，失败时 fallback 到 mock 数据
 */
export async function getValorantMatches(): Promise<Match[]> {
  try {
    // 尝试从 VLR.gg 获取数据
    const response = await fetch("https://www.vlr.gg/matches", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
    });

    if (!response.ok) {
      throw new Error(`VLR responded with ${response.status}`);
    }

    const html = await response.text();
    if (html && html.includes("match-item")) {
      const { parseVLRMatches } = await import("./vlrParser");
      const matches = parseVLRMatches(html);
      if (matches.length > 0) {
        console.log(`[VLR Connector] Parsed ${matches.length} matches from VLR.gg`);
        return matches;
      }
    }

    throw new Error("No matches found in VLR HTML");
  } catch (error) {
    console.warn("[VLR Connector] VLR fetch failed, using mock data:", (error as Error).message);
    return getVLRMockMatches();
  }
}

function getVLRMockMatches(): Match[] {
  const now = new Date();
  const futureMatches = mockValorantMatches
    .filter((m) => new Date(m.startTime) > now)
    .map((m) => ({ ...m, lastSyncedAt: now.toISOString() }));
  console.log(`[VLR Connector] Using ${futureMatches.length} mock valorant matches`);
  return futureMatches;
}
