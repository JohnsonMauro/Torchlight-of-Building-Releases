// Synthetic UE_game.log text for the "Import from game" tests: Unreal log lines around GetPlayerData dumps in the
// printer's "+path [value]" tree format (src/game-log/game-log-import.js scanGameLog). Only the player section is
// written, so an import is a hero at a level and every other section reads as missing from the log.
const LOG_OPEN = "Log file open, 10/19/26 11:59:00";
const line = (stamp, text) => `[${stamp}][  1]LogTemp: Display: ${text}`;

/** One login: `stamp` as the log writes it ("2026.10.19-13.30.00:000"), the character's id, hero purchase id and level. */
export function login({ stamp, player, hero, level }) {
  return [
    `[${stamp}][  1]GameLog: Display: ----Socket RecvMessage STT----GetPlayerData----`,
    `+player+PlayerId [${player}]`,
    "+player+UserId [user-1]",
    `+player+HeroPurchaseId [${hero}]`,
    `+player+HeroId [${hero}]`,
    `+player+Level [${level}]`,
  ];
}

/** A log with these logins, a line after each one, and a last line (the reader drops a live log's last line). */
export function gameLogText(logins, { open = true, end = true } = {}) {
  const lines = open ? [LOG_OPEN] : [];
  for (const entry of logins) lines.push(...login(entry), line(entry.stamp, "after login"));
  if (end) lines.push(line("2026.10.19-23.59.00:000", "end"), "");
  return lines.join("\n");
}

/** Carino (Ranger of Glory) Lv 60 at 13:30 and Rehan (Anger) Lv 80 at 12:00, UTC. */
export const TWO_LOGINS = [
  { stamp: "2026.10.19-12.00.00:000", player: "p-rehan", hero: "1001", level: "80" },
  { stamp: "2026.10.19-13.30.00:000", player: "p-carino", hero: "2001", level: "60" },
];
