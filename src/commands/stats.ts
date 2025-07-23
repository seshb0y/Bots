import { ChatInputCommandInteraction, TextChannel } from "discord.js";
import { STATS_CHANNEL_ID } from "../constants";
import { loadPrevAndCurrMembers } from "../utils/clan";
import { normalize } from "../utils/normalize";

export async function statsCommand(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });
  const [prev, curr] = loadPrevAndCurrMembers();

  // Сопоставим по нормализованному нику
  const prevMap = new Map<string, { nick: string; points: number }>();
  for (const p of prev) prevMap.set(normalize(p.nick), p);
  const currMap = new Map<string, { nick: string; points: number }>();
  for (const c of curr) currMap.set(normalize(c.nick), c);

  let totalDelta = 0;
  const changes: { nick: string; delta: number }[] = [];

  for (const [nickNorm, currPlayer] of currMap.entries()) {
    const prevPlayer = prevMap.get(nickNorm);
    if (prevPlayer) {
      const delta = currPlayer.points - prevPlayer.points;
      if (delta !== 0) {
        changes.push({ nick: currPlayer.nick, delta });
        totalDelta += delta;
      }
    }
  }

  if (changes.length === 0) {
    await interaction.editReply(
      "За сутки не было изменений очков ни у одного игрока."
    );
    return;
  }

  let msg = `\uD83D\uDCCA **Статистика за сутки:**\n`;
  msg += `Полк всего: ${totalDelta >= 0 ? "+" : ""}${totalDelta} очков\n`;
  msg += `\nИзменения по игрокам:\n`;
  for (const { nick, delta } of changes.sort((a, b) => b.delta - a.delta)) {
    msg += `• ${nick}: ${delta >= 0 ? "+" : ""}${delta}\n`;
  }

  // Отправляем в канал статистики
  const channel = await interaction.client.channels.fetch(STATS_CHANNEL_ID);
  if (channel && channel.isTextBased()) {
    await (channel as TextChannel).send(msg);
    await interaction.editReply("Статистика отправлена в канал.");
  } else {
    await interaction.editReply(
      "Не удалось найти текстовый канал для статистики."
    );
  }
}
