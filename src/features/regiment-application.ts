import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  Client,
  EmbedBuilder,
  Guild,
  GuildMember,
  Message,
  ModalBuilder,
  ModalSubmitInteraction,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  InteractionResponseType,
  Routes,
} from "discord.js";
import {
  OFFICER_ROLE_IDS,
  REGIMENT_APPLICATION_LOG_CHANNEL_ID,
  REGIMENT_APPLICATION_STATE_PATH,
  REGIMENT_APPROVED_ROLE_ID,
  REGIMENT_NEWCOMER_ROLE_ID,
  REGIMENT_APPLICATION_APPROVER_ROLE_IDS,
  WELCOME_CHANNEL_ID,
} from "../constants";
import { loadJson, saveJson } from "../utils/json";
import { ensureDataDirectory } from "../utils/paths";
import { error, info, warn } from "../utils/logger";

const REGIMENT_APPLICATION_BUTTON_ID = "regiment_application_start";
const REGIMENT_APPLICATION_MODAL_ID = "regiment_application_modal";
const REGIMENT_APPLICATION_MODAL_BATTLES_ID = "regiment_application_modal_battles";
const REGIMENT_APPLICATION_DECISION_PREFIX = "regiment_application_decision";
const REGIMENT_APPLICATION_BATTLES_BUTTON_ID = "regiment_application_request_battles";
const REGIMENT_APPLICATION_APPROVE_MODAL_PREFIX = "regiment_application_approve_modal";
const REGIMENT_APPLICATION_REJECT_MODAL_PREFIX = "regiment_application_reject_modal";
const REGIMENT_APPLICATION_EDIT_BUTTON_ID = "regiment_application_edit";
const REGIMENT_APPLICATION_EDIT_MODAL_ID = "regiment_application_edit_modal";
const REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID = "regiment_application_edit_modal_battles";
const REGIMENT_APPLICATION_EDIT_BATTLES_BUTTON_ID = "regiment_application_edit_request_battles";

const WELCOME_GIF_URL = "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWl2ampxczlqbm9rdGZkeWxsOGp4aTU1a2t4OHhtY2g0cjYzOWp5cyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/VtDRXohjexcyCDlL6Z/giphy.gif";

const MAX_FIELD_LENGTH = 1024;
const APPLICATION_DRAFT_TTL_MS = 5 * 60 * 1000;

interface RegimentApplicationState {
  welcomeMessageId?: string;
}

interface RegimentApplicationDecisionPayload {
  action: "approve" | "reject";
  applicantId: string;
  submissionId: string;
  messageId?: string;
}

interface RegimentApplicationAnswers {
  nickname: string;
  realName: string;
  age: string;
  source: string;
  location: string;
  rulesAgreement: string;
  battles: string;
  lastRegiment?: string;
  leaveReason?: string;
  leaveDate?: string;
}

interface RegimentApplicationDraft {
  answers: Pick<RegimentApplicationAnswers, "nickname" | "realName" | "age" | "source" | "location">;
  createdAt: number;
}

interface RegimentApplicationEditContext {
  applicantId: string;
  submissionId: string;
  messageId: string;
  channelId: string;
  applicantTag: string;
  currentAnswers: RegimentApplicationAnswers;
  updatedAnswers: Partial<RegimentApplicationAnswers>;
  createdAt: number;
}

const DEFAULT_STATE: RegimentApplicationState = {};
const pendingApplications = new Map<string, RegimentApplicationDraft>();
const pendingEditApplications = new Map<string, RegimentApplicationEditContext>();

function cleanupExpiredDraft(userId: string): void {
  const draft = pendingApplications.get(userId);
  if (!draft) return;
  if (Date.now() - draft.createdAt > APPLICATION_DRAFT_TTL_MS) {
    pendingApplications.delete(userId);
  }
}

function cleanupExpiredEditDraft(userId: string): void {
  const context = pendingEditApplications.get(userId);
  if (!context) return;
  if (Date.now() - context.createdAt > APPLICATION_DRAFT_TTL_MS) {
    pendingEditApplications.delete(userId);
  }
}

function loadState(): RegimentApplicationState {
  try {
    const state = loadJson<RegimentApplicationState>(REGIMENT_APPLICATION_STATE_PATH);
    return { ...DEFAULT_STATE, ...state };
  } catch (err) {
    warn("Не удалось загрузить состояние приветственного сообщения заявок, использую значения по умолчанию", err);
    return { ...DEFAULT_STATE };
  }
}

function saveState(state: RegimentApplicationState): void {
  try {
    ensureDataDirectory();
    saveJson(REGIMENT_APPLICATION_STATE_PATH, state);
  } catch (err) {
    error("Не удалось сохранить состояние приветственного сообщения заявок", err);
  }
}

function buildWelcomeEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("Добро пожаловать в полк ALLIANCE")
    .setDescription(
      "Чтобы попасть в полк, жми кнопку ниже и заполняй заявку. Без этого тебя никто не пустит."
    )
    .setImage(WELCOME_GIF_URL)
    .setFooter({ text: "После модалки офицеры свяжутся. Жди." });
}

function buildWelcomeComponents(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(REGIMENT_APPLICATION_BUTTON_ID)
      .setLabel("Подать заявку в полк")
      .setEmoji("🛩️")
      .setStyle(ButtonStyle.Primary)
  );
}

function buildApplicationModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(REGIMENT_APPLICATION_MODAL_ID)
    .setTitle("Заявка в полк");

  const inputs: Array<{ id: string; label: string; placeholder?: string; style?: TextInputStyle; maxLength?: number }> = [
    {
      id: "nickname",
      label: "1️⃣ Никнейм",
      placeholder: "Укажи свой ник в игре",
      maxLength: 100,
    },
    {
      id: "real_name",
      label: "2️⃣ Имя",
      placeholder: "Например: Иван",
      maxLength: 100,
    },
    { id: "age", label: "3️⃣ Возраст", style: TextInputStyle.Short, maxLength: 50 },
    { id: "source", label: "4️⃣ Откуда узнал о полке?", style: TextInputStyle.Paragraph },
    { id: "location", label: "5️⃣ Место проживания", style: TextInputStyle.Paragraph },
  ];

  const rows = inputs.map(({ id, label, placeholder, style, maxLength }) =>
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(`${REGIMENT_APPLICATION_MODAL_ID}_${id}`)
        .setLabel(label)
        .setPlaceholder(placeholder ?? "")
        .setStyle(style ?? TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(maxLength ?? 512)
    )
  );

  modal.addComponents(...rows);
  return modal;
}

function buildBattlesModal(): ModalBuilder {
  const modal = new ModalBuilder()
    .setCustomId(REGIMENT_APPLICATION_MODAL_BATTLES_ID)
    .setTitle("Заявка в полк — завершение");

  const rulesInput = new TextInputBuilder()
    .setCustomId(`${REGIMENT_APPLICATION_MODAL_BATTLES_ID}_rules`)
    .setLabel("6️⃣ Ознакомился ли с правилами?")
    .setPlaceholder("Например: Да, прочитал полностью")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(200);

  const battlesInput = new TextInputBuilder()
    .setCustomId(`${REGIMENT_APPLICATION_MODAL_BATTLES_ID}_battles`)
    .setLabel("7️⃣ Количество боёв в реалистичном режиме")
    .setPlaceholder("Например: 350")
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const lastRegimentInput = new TextInputBuilder()
    .setCustomId(`${REGIMENT_APPLICATION_MODAL_BATTLES_ID}_last_regiment`)
    .setLabel("8️⃣ Наименование последнего полка")
    .setPlaceholder("Например: 3-й Гвардейский")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(200);

  const leaveReasonInput = new TextInputBuilder()
    .setCustomId(`${REGIMENT_APPLICATION_MODAL_BATTLES_ID}_leave_reason`)
    .setLabel("9️⃣ Причина ухода")
    .setPlaceholder("Например: Перешёл в активный состав")
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);

  const leaveDateInput = new TextInputBuilder()
    .setCustomId(`${REGIMENT_APPLICATION_MODAL_BATTLES_ID}_leave_date`)
    .setLabel("🔟 Дата ухода (примерная)")
    .setPlaceholder("Например: Июль 2024")
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setMaxLength(100);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(rulesInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(battlesInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(lastRegimentInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(leaveReasonInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(leaveDateInput)
  );
  return modal;
}

function buildBattlesButtonRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(REGIMENT_APPLICATION_BATTLES_BUTTON_ID)
      .setLabel("Указать количество боёв")
      .setStyle(ButtonStyle.Primary)
  );
}

function buildEditBattlesButtonRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(REGIMENT_APPLICATION_EDIT_BATTLES_BUTTON_ID)
      .setLabel("Редактировать остальные поля")
      .setStyle(ButtonStyle.Secondary)
  );
}

function sanitizeField(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "—";
  }
  return trimmed.slice(0, MAX_FIELD_LENGTH);
}

function sanitizeOptionalField(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }
  return sanitizeField(trimmed);
}

function buildDecisionRow(applicantId: string, submissionId: string, disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`${REGIMENT_APPLICATION_DECISION_PREFIX}:approve:${applicantId}:${submissionId}`)
      .setLabel("Одобрить")
      .setStyle(ButtonStyle.Success)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`${REGIMENT_APPLICATION_DECISION_PREFIX}:reject:${applicantId}:${submissionId}`)
      .setLabel("Отклонить")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(disabled),
    new ButtonBuilder()
      .setCustomId(`${REGIMENT_APPLICATION_EDIT_BUTTON_ID}:${applicantId}:${submissionId}`)
      .setLabel("Изменить")
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(disabled)
  );
}

function parseDecisionCustomId(customId: string): RegimentApplicationDecisionPayload | null {
  const parts = customId.split(":");
  if (parts.length !== 4) {
    return null;
  }

  const [prefix, action, applicantId, submissionId] = parts;
  if (prefix !== REGIMENT_APPLICATION_DECISION_PREFIX) {
    return null;
  }
  if (action !== "approve" && action !== "reject") {
    return null;
  }
  if (!applicantId || !submissionId) {
    return null;
  }

  return { action, applicantId, submissionId } as RegimentApplicationDecisionPayload;
}

function parseEditCustomId(customId: string): { applicantId: string; submissionId: string } | null {
  const parts = customId.split(":");
  if (parts.length !== 3) {
    return null;
  }
  const [prefix, applicantId, submissionId] = parts;
  if (prefix !== REGIMENT_APPLICATION_EDIT_BUTTON_ID) {
    return null;
  }
  if (!applicantId || !submissionId) {
    return null;
  }
  return { applicantId, submissionId };
}

function buildApplicationEmbed(
  applicantId: string,
  applicantTag: string,
  answers: RegimentApplicationAnswers,
  submissionId: string,
  member: GuildMember | null
): EmbedBuilder {
  const mention = `<@${applicantId}>`;
  const displayTag = member ? member.user.tag : applicantTag;

  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("Новая заявка в полк")
    .setDescription(`Заявка от ${mention} (${displayTag})`)
    .addFields(
      { name: "1️⃣ Никнейм", value: answers.nickname, inline: false },
      { name: "2️⃣ Имя", value: answers.realName, inline: false },
      { name: "3️⃣ Возраст", value: answers.age, inline: false },
      { name: "4️⃣ Откуда узнал", value: answers.source, inline: false },
      { name: "5️⃣ Место проживания", value: answers.location, inline: false },
      { name: "6️⃣ Правила", value: answers.rulesAgreement, inline: false },
      { name: "7️⃣ Количество боёв", value: answers.battles, inline: false },
      { name: "8️⃣ Последний полк", value: answers.lastRegiment ?? "—", inline: false },
      { name: "9️⃣ Причина ухода", value: answers.leaveReason ?? "—", inline: false },
      { name: "🔟 Дата ухода", value: answers.leaveDate ?? "—", inline: false },
      { name: "Статус", value: "⏳ На рассмотрении", inline: false }
    )
    .setTimestamp()
    .setFooter({ text: `ID заявки: ${submissionId}` });

  return embed;
}

function extractAnswersFromEmbed(embed: EmbedBuilder): RegimentApplicationAnswers {
  const data = embed.toJSON();
  const getValue = (label: string, required = true): string => {
    const field = data.fields?.find((f) => f.name === label);
    if (!field || !field.value) {
      if (required) {
        return "—";
      }
      return "—";
    }
    return field.value;
  };

  const optionalValue = (label: string): string | undefined => {
    const field = data.fields?.find((f) => f.name === label);
    if (!field) return undefined;
    const value = field.value?.trim();
    if (!value || value === "—") {
      return undefined;
    }
    return value;
  };

  return {
    nickname: getValue("1️⃣ Никнейм"),
    realName: getValue("2️⃣ Имя"),
    age: getValue("3️⃣ Возраст"),
    source: getValue("4️⃣ Откуда узнал"),
    location: getValue("5️⃣ Место проживания"),
    rulesAgreement: getValue("6️⃣ Правила"),
    battles: getValue("7️⃣ Количество боёв"),
    lastRegiment: optionalValue("8️⃣ Последний полк"),
    leaveReason: optionalValue("9️⃣ Причина ухода"),
    leaveDate: optionalValue("🔟 Дата ухода"),
  };
}

function buildEditModal(answers: RegimentApplicationAnswers): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(REGIMENT_APPLICATION_EDIT_MODAL_ID)
    .setTitle("Редактирование заявки — шаг 1")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`${REGIMENT_APPLICATION_EDIT_MODAL_ID}_nickname`)
          .setLabel("1️⃣ Никнейм")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(answers.nickname)
          .setMaxLength(200)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`${REGIMENT_APPLICATION_EDIT_MODAL_ID}_real_name`)
          .setLabel("2️⃣ Имя")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(answers.realName)
          .setMaxLength(200)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`${REGIMENT_APPLICATION_EDIT_MODAL_ID}_age`)
          .setLabel("3️⃣ Возраст")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(answers.age)
          .setMaxLength(50)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`${REGIMENT_APPLICATION_EDIT_MODAL_ID}_source`)
          .setLabel("4️⃣ Откуда узнал")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(answers.source)
          .setMaxLength(200)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`${REGIMENT_APPLICATION_EDIT_MODAL_ID}_location`)
          .setLabel("5️⃣ Место проживания")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setValue(answers.location)
          .setMaxLength(200)
      )
    );
}

function buildEditBattlesModal(answers: RegimentApplicationAnswers): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID)
    .setTitle("Редактирование заявки — завершение")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`${REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID}_rules`)
          .setLabel("6️⃣ Ознакомился ли с правилами?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(200)
          .setValue(answers.rulesAgreement)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`${REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID}_battles`)
          .setLabel("7️⃣ Количество боёв в реалистичном режиме")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setMaxLength(100)
          .setValue(answers.battles)
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`${REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID}_last_regiment`)
          .setLabel("8️⃣ Наименование последнего полка")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(200)
          .setValue(answers.lastRegiment ?? "")
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`${REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID}_leave_reason`)
          .setLabel("9️⃣ Причина ухода")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
          .setValue(answers.leaveReason ?? "")
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId(`${REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID}_leave_date`)
          .setLabel("🔟 Дата ухода (примерная)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setMaxLength(100)
          .setValue(answers.leaveDate ?? "")
      )
    );
}

function updateStatusOnEmbed(embed: EmbedBuilder, status: string): EmbedBuilder {
  const embedData = embed.toJSON();
  const fields = (embedData.fields ?? []).filter((field) => field.name !== "Статус");
  fields.push({ name: "Статус", value: status, inline: false });
  embed.setFields(fields);
  return embed;
}

function applyOfficerComment(embed: EmbedBuilder, comment: string | null): EmbedBuilder {
  const embedData = embed.toJSON();
  const fields = embedData.fields ?? [];
  const filtered = fields.filter((field) => field.name !== "Комментарий офицера");
  if (comment) {
    filtered.push({ name: "Комментарий офицера", value: comment, inline: false });
  }
  embed.setFields(filtered);
  return embed;
}

function officerHasPermission(member: GuildMember): boolean {
  const allowedRoleIds = new Set([
    ...OFFICER_ROLE_IDS,
    ...REGIMENT_APPLICATION_APPROVER_ROLE_IDS,
  ]);
  return Array.from(allowedRoleIds).some((roleId) => member.roles.cache.has(roleId));
}

function buildApprovalModal(payload: RegimentApplicationDecisionPayload, messageId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${REGIMENT_APPLICATION_APPROVE_MODAL_PREFIX}:${payload.applicantId}:${payload.submissionId}:${messageId}`)
    .setTitle("Одобрение заявки")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("approval_comment")
          .setLabel("Комментарий (необязательно)")
          .setPlaceholder("Например: Принят в основу")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
      )
    );
}

function buildRejectionModal(payload: RegimentApplicationDecisionPayload, messageId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`${REGIMENT_APPLICATION_REJECT_MODAL_PREFIX}:${payload.applicantId}:${payload.submissionId}:${messageId}`)
    .setTitle("Отклонение заявки")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("rejection_comment")
          .setLabel("Комментарий (необязательно)")
          .setPlaceholder("Например: Не подходит по требованиям")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setMaxLength(500)
      )
    );
}

async function finalizeRegimentDecision(options: {
  guild: Guild;
  message: Message;
  payload: RegimentApplicationDecisionPayload;
  officer: GuildMember;
  comment: string | null;
  action: "approve" | "reject";
}): Promise<{ followUpMessage: string; comment?: string | null; applicant?: GuildMember | null; renameStatus?: "success" | "failed" | "skipped"; renamedNickname?: string | null }>
{
  const { guild, message, payload, officer, comment, action } = options;

  let applicant: GuildMember | null = null;
  try {
    applicant = await guild.members.fetch(payload.applicantId);
  } catch (err) {
    warn(`Не удалось найти участника ${payload.applicantId} при рассмотрении заявки`, err);
  }

  let renameStatus: "success" | "failed" | "skipped" = "skipped";
  let renamedNickname: string | null = null;

  const baseEmbed = message.embeds[0]
    ? EmbedBuilder.from(message.embeds[0])
    : new EmbedBuilder().setTitle("Заявка");

  if (action === "approve" && applicant) {
    await applyApprovalRoles(applicant);

    const targetNickname = deriveApprovedNickname(baseEmbed);
    if (targetNickname) {
      try {
        await applicant.setNickname(targetNickname, "Одобрена заявка в полк");
        renameStatus = "success";
        renamedNickname = targetNickname;
      } catch (err) {
        renameStatus = "failed";
        renamedNickname = targetNickname;
        warn(`Не удалось переименовать участника ${applicant.id} в "${targetNickname}"`, err);
      }
    }
  }

  const statusText = action === "approve"
    ? `✅ Одобрено ${officer}`
    : `❌ Отклонено ${officer}`;
  const color = action === "approve" ? 0x2ecc71 : 0xe74c3c;
  const updatedEmbed = updateStatusOnEmbed(baseEmbed.setColor(color), statusText)
    .setTimestamp(new Date())
    .setFooter({ text: `${action === "approve" ? "Одобрено" : "Отклонено"} ${officer.user.tag}` });

  applyOfficerComment(updatedEmbed, comment);

  const components = [buildDecisionRow(payload.applicantId, payload.submissionId, true)];
  await message.edit({ embeds: [updatedEmbed], components });

  const followUpMessageParts: string[] = [];
  if (action === "approve") {
    if (applicant) {
      followUpMessageParts.push(comment ? `✅ Заявка одобрена. Комментарий: ${comment}` : "✅ Заявка одобрена. Роли выданы.");
      if (renameStatus === "success" && renamedNickname) {
        followUpMessageParts.push(`📝 Ник обновлён на "${renamedNickname}".`);
      } else if (renameStatus === "failed" && renamedNickname) {
        followUpMessageParts.push(`⚠️ Не удалось установить ник "${renamedNickname}". Проверь права бота.`);
      }
    } else {
      followUpMessageParts.push("✅ Одобрено, но участник не найден для выдачи роли");
    }
  } else {
    followUpMessageParts.push("❌ Заявка отклонена.");
    if (comment) {
      followUpMessageParts.push(`💬 Комментарий: ${comment}`);
    }
  }

  const followUpMessage = followUpMessageParts.join("\n");

  if (action === "approve") {
    const logLines = [
      `✅ Заявка одобрена: <@${payload.applicantId}>`,
      `👮 Офицер: ${officer}`,
    ];
    if (renamedNickname) {
      logLines.push(
        renameStatus === "success"
          ? `📝 Новый ник: ${renamedNickname}`
          : `⚠️ Не удалось установить ник: ${renamedNickname}`
      );
    }
    if (comment) {
      logLines.push(`💬 Комментарий: ${comment}`);
    }
    if ("send" in message.channel) {
      await (message.channel as TextChannel).send(logLines.join("\n"));
    }
  } else {
    const logLines = [
      `❌ Заявка отклонена: <@${payload.applicantId}>`,
      `👮 Офицер: ${officer}`,
    ];
    if (comment) {
      logLines.push(`💬 Комментарий: ${comment}`);
    }
    if ("send" in message.channel) {
      await (message.channel as TextChannel).send(logLines.join("\n"));
    }
  }

  return { followUpMessage, comment, applicant, renameStatus, renamedNickname };
}

async function applyApprovalRoles(applicant: GuildMember): Promise<void> {
  const reason = "Заявка в полк одобрена";
  if (!applicant.roles.cache.has(REGIMENT_APPROVED_ROLE_ID)) {
    await applicant.roles.add(REGIMENT_APPROVED_ROLE_ID, reason);
  }
  if (applicant.roles.cache.has(REGIMENT_NEWCOMER_ROLE_ID)) {
    await applicant.roles.remove(REGIMENT_NEWCOMER_ROLE_ID, reason);
  }
}

export async function ensureRegimentWelcomeMessage(client: Client): Promise<void> {
  try {
    const state = loadState();
    const channel = await client.channels.fetch(WELCOME_CHANNEL_ID);

    if (!channel || channel.type !== ChannelType.GuildText) {
      warn(`Приветственный канал ${WELCOME_CHANNEL_ID} недоступен или неверного типа`);
      return;
    }

    const textChannel = channel as TextChannel;
    const embed = buildWelcomeEmbed();
    const components = [buildWelcomeComponents()];

    if (state.welcomeMessageId) {
      try {
        const message = await textChannel.messages.fetch(state.welcomeMessageId);
        await message.edit({ embeds: [embed], components });
        info("Приветственное сообщение заявок обновлено без дублирования");
        return;
      } catch (err) {
        warn("Старое приветственное сообщение не найдено, создаю новое", err);
      }
    }

    const newMessage = await textChannel.send({ embeds: [embed], components });
    state.welcomeMessageId = newMessage.id;
    saveState(state);
    info("Приветственное сообщение заявок создано и сохранено");
  } catch (err) {
    error("Не удалось инициализировать приветственное сообщение заявок", err);
  }
}

function extractApplicantTag(description?: string | null): string | undefined {
  if (!description) return undefined;
  const tagMatch = description.match(/\(([^)]+)\)$/);
  return tagMatch ? tagMatch[1] : undefined;
}

export function isRegimentApplicationButton(customId: string): boolean {
  return customId === REGIMENT_APPLICATION_BUTTON_ID;
}

export function isRegimentApplicationContinueButton(customId: string): boolean {
  return customId === REGIMENT_APPLICATION_BATTLES_BUTTON_ID;
}

export function isRegimentApplicationEditButton(customId: string): boolean {
  return customId.startsWith(`${REGIMENT_APPLICATION_EDIT_BUTTON_ID}:`);
}

export function isRegimentApplicationEditContinueButton(customId: string): boolean {
  return customId === REGIMENT_APPLICATION_EDIT_BATTLES_BUTTON_ID;
}

export function tryParseRegimentDecision(customId: string): RegimentApplicationDecisionPayload | null {
  return parseDecisionCustomId(customId);
}

export async function handleRegimentApplicationButton(interaction: ButtonInteraction): Promise<void> {
  try {
    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: "❌ Эта кнопка работает только на сервере.", flags: 64 });
      return;
    }

    const member = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!member) {
      await interaction.reply({ content: "❌ Не удалось проверить права. Попробуй позже или свяжись с офицером.", flags: 64 });
      return;
    }

    if (!member.roles.cache.has(REGIMENT_NEWCOMER_ROLE_ID)) {
      await interaction.reply({ content: "❌ Кнопка доступна только призывникам. Если нужна помощь — напиши офицерам.", flags: 64 });
      return;
    }

    cleanupExpiredDraft(interaction.user.id);
    pendingApplications.delete(interaction.user.id);
    await interaction.showModal(buildApplicationModal());
  } catch (err) {
    error("Не удалось показать модалку заявки", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Не получилось открыть форму. Попробуй ещё раз позже.", flags: 64 });
    }
  }
}

export async function handleRegimentApplicationContinueButton(interaction: ButtonInteraction): Promise<void> {
  try {
    cleanupExpiredDraft(interaction.user.id);
    const draft = pendingApplications.get(interaction.user.id);
    if (!draft) {
      await interaction.reply({
        content: "❌ Черновик заявки не найден или устарел. Заполни форму заново.",
        flags: 64,
      });
      return;
    }

    info(`[REGIMENT] ${interaction.user.tag} вручную открывает модалку боёв`);
    try {
      await interaction.showModal(buildBattlesModal());
    } catch (err) {
      error("Не удалось открыть модалку боёв по кнопке", err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: "❌ Не смог открыть форму боёв. Попробуй позже.", flags: 64 });
      }
    }
  } catch (err) {

  }
}

export async function handleRegimentApplicationModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (interaction.customId === REGIMENT_APPLICATION_MODAL_ID) {
    const getValue = (id: string): string => interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_MODAL_ID}_${id}`);
    const answers = {
      nickname: sanitizeField(getValue("nickname")),
      realName: sanitizeField(getValue("real_name")),
      age: sanitizeField(getValue("age")),
      source: sanitizeField(getValue("source")),
      location: sanitizeField(getValue("location")),
    } as RegimentApplicationDraft["answers"];

    pendingApplications.set(interaction.user.id, {
      answers,
      createdAt: Date.now(),
    });

    info(`[REGIMENT] Черновик сохранён, ожидаю количество боёв от ${interaction.user.tag}`);

    await interaction.reply({
      content: "Теперь укажи количество боёв и подтвердите ознакомление с правилами.",
      components: [buildBattlesButtonRow()],
      flags: 64,
    });
    return;
  }

  if (interaction.customId !== REGIMENT_APPLICATION_MODAL_BATTLES_ID) {
    return;
  }

  cleanupExpiredDraft(interaction.user.id);
  const draft = pendingApplications.get(interaction.user.id);
  if (!draft) {
    await interaction.reply({ content: "❌ Черновик заявки не найден или устарел. Заполни форму заново.", flags: 64 });
    return;
  }

  const battlesValue = sanitizeField(
    interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_MODAL_BATTLES_ID}_battles`)
  );
  const rulesValue = sanitizeField(
    interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_MODAL_BATTLES_ID}_rules`)
  );
  const lastRegimentValue = sanitizeOptionalField(
    interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_MODAL_BATTLES_ID}_last_regiment`)
  );
  const leaveReasonValue = sanitizeOptionalField(
    interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_MODAL_BATTLES_ID}_leave_reason`)
  );
  const leaveDateValue = sanitizeOptionalField(
    interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_MODAL_BATTLES_ID}_leave_date`)
  );

  const submissionId = interaction.id;

  try {
    const logChannel = await interaction.client.channels.fetch(REGIMENT_APPLICATION_LOG_CHANNEL_ID);

    if (!logChannel || !logChannel.isTextBased()) {
      error(`Канал логирования заявок ${REGIMENT_APPLICATION_LOG_CHANNEL_ID} недоступен или не текстовый`);
      await interaction.reply({ content: "❌ Не удалось отправить заявку. Сообщи офицеру.", flags: 64 });
      return;
    }

    const guild = interaction.guild ?? (logChannel instanceof TextChannel ? logChannel.guild : null);
    let applicantMember: GuildMember | null = null;
    if (guild) {
      try {
        applicantMember = await guild.members.fetch(interaction.user.id);
      } catch (fetchErr) {
        warn(`Не удалось получить участника ${interaction.user.id} при отправке заявки`, fetchErr);
      }
    }

    const answers: RegimentApplicationAnswers = {
      nickname: draft.answers.nickname,
      realName: draft.answers.realName,
      age: draft.answers.age,
      source: draft.answers.source,
      location: draft.answers.location,
      rulesAgreement: rulesValue,
      battles: battlesValue,
      lastRegiment: lastRegimentValue,
      leaveReason: leaveReasonValue,
      leaveDate: leaveDateValue,
    };

    const embed = buildApplicationEmbed(interaction.user.id, interaction.user.tag, answers, submissionId, applicantMember);
    const uniqueRoleIds = Array.from(new Set(OFFICER_ROLE_IDS));
    const officerMentions = uniqueRoleIds.length ? uniqueRoleIds.map((roleId) => `<@&${roleId}>`).join(" ") : "";
    const content = officerMentions
      ? `${officerMentions} Новая заявка от <@${interaction.user.id}>`
      : `Новая заявка от <@${interaction.user.id}>`;

    await (logChannel as TextChannel).send({
      content,
      embeds: [embed],
      components: [buildDecisionRow(interaction.user.id, submissionId)],
    });

    pendingApplications.delete(interaction.user.id);

    info(`Заявка в полк отправлена от ${interaction.user.tag}`);
    await interaction.reply({
      content: "✅ Заявка отправлена офицерам. Жди решения.",
      flags: 64,
    });
  } catch (err) {
    error("Ошибка при обработке заявки в полк", err);
    pendingApplications.delete(interaction.user.id);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Не удалось отправить заявку. Попробуй позже.", flags: 64 });
    }
  }
}

export async function handleRegimentApplicationEditButton(interaction: ButtonInteraction): Promise<void> {
  try {
    cleanupExpiredEditDraft(interaction.user.id);

    if (!interaction.inGuild() || !interaction.guild) {
      await interaction.reply({ content: "❌ Эта кнопка доступна только внутри сервера.", flags: 64 });
      return;
    }

    const officer = await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
    if (!officer || !officerHasPermission(officer)) {
      await interaction.reply({ content: "❌ У тебя нет прав редактировать заявки.", flags: 64 });
      return;
    }

    const message = interaction.message;
    if (!message || !("embeds" in message) || !message.embeds.length) {
      await interaction.reply({ content: "❌ Не удалось найти данные заявки.", flags: 64 });
      return;
    }

    const embed = EmbedBuilder.from(message.embeds[0]);
    const statusField = embed.toJSON().fields?.find((f) => f.name === "Статус");
    if (statusField && /✅|❌/u.test(statusField.value ?? "")) {
      await interaction.reply({ content: "❌ Нельзя редактировать уже рассмотренную заявку.", flags: 64 });
      return;
    }

    const parsed = parseEditCustomId(interaction.customId);
    if (!parsed) {
      await interaction.reply({ content: "❌ Некорректный формат кнопки.", flags: 64 });
      return;
    }

    const { applicantId, submissionId } = parsed;

    const footerId = embed.toJSON().footer?.text?.replace("ID заявки: ", "");
    if (footerId && footerId !== submissionId) {
      await interaction.reply({ content: "❌ Данные заявки не совпадают. Обнови сообщение и попробуй ещё раз.", flags: 64 });
      return;
    }

    const answers = extractAnswersFromEmbed(embed);
    const applicantTagFromDesc = extractApplicantTag(embed.toJSON().description);

    let applicantMember: GuildMember | null = null;
    try {
      applicantMember = await interaction.guild.members.fetch(applicantId);
    } catch (err) {
      warn(`Не удалось получить участника ${applicantId} при редактировании заявки`, err);
    }

    const context: RegimentApplicationEditContext = {
      applicantId,
      submissionId,
      messageId: message.id,
      channelId: interaction.channelId,
      applicantTag: applicantMember ? applicantMember.user.tag : applicantTagFromDesc ?? interaction.guild.name,
      currentAnswers: answers,
      updatedAnswers: {},
      createdAt: Date.now(),
    };

    pendingEditApplications.set(interaction.user.id, context);

    await interaction.showModal(buildEditModal(answers));
  } catch (err) {
    error("Ошибка при попытке редактировать заявку", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Не удалось открыть форму редактирования.", flags: 64 });
    }
  }
}

export async function handleRegimentApplicationEditContinueButton(interaction: ButtonInteraction): Promise<void> {
  try {
    cleanupExpiredEditDraft(interaction.user.id);
    const context = pendingEditApplications.get(interaction.user.id);
    if (!context) {
      await interaction.reply({ content: "❌ Черновик редактирования не найден или устарел.", flags: 64 });
      return;
    }

    const combinedAnswers: RegimentApplicationAnswers = {
      nickname: (context.updatedAnswers.nickname as string) ?? context.currentAnswers.nickname,
      realName: (context.updatedAnswers.realName as string) ?? context.currentAnswers.realName,
      age: (context.updatedAnswers.age as string) ?? context.currentAnswers.age,
      source: (context.updatedAnswers.source as string) ?? context.currentAnswers.source,
      location: (context.updatedAnswers.location as string) ?? context.currentAnswers.location,
      rulesAgreement: (context.updatedAnswers.rulesAgreement as string) ?? context.currentAnswers.rulesAgreement,
      battles: (context.updatedAnswers.battles as string) ?? context.currentAnswers.battles,
      lastRegiment: (context.updatedAnswers.lastRegiment as string | undefined) ?? context.currentAnswers.lastRegiment,
      leaveReason: (context.updatedAnswers.leaveReason as string | undefined) ?? context.currentAnswers.leaveReason,
      leaveDate: (context.updatedAnswers.leaveDate as string | undefined) ?? context.currentAnswers.leaveDate,
    };

    await interaction.showModal(buildEditBattlesModal(combinedAnswers));
  } catch (err) {
    error("Ошибка при открытии второй формы редактирования", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Не удалось открыть форму. Попробуй позже.", flags: 64 });
    }
  }
}

export async function handleRegimentApplicationDecision(
  interaction: ButtonInteraction,
  payload: RegimentApplicationDecisionPayload
): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: "❌ Это решение доступно только внутри сервера.", flags: 64 });
    return;
  }

  try {
    const officer = await interaction.guild.members.fetch(interaction.user.id);
    if (!officerHasPermission(officer)) {
      await interaction.reply({ content: "❌ У тебя нет прав решать заявки.", flags: 64 });
      return;
    }

    const messageId = interaction.message?.id;
    if (!messageId) {
      await interaction.reply({ content: "❌ Не удалось найти сообщение заявки.", flags: 64 });
      return;
    }

    if (payload.action === "approve") {
      const modal = buildApprovalModal(payload, messageId);
      await interaction.showModal(modal);
      return;
    }

    if (payload.action === "reject") {
      const modal = buildRejectionModal(payload, messageId);
      await interaction.showModal(modal);
      return;
    }
  } catch (err) {
    error("Ошибка при обработке решения по заявке", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Что-то пошло не так. Попробуй ещё раз.", flags: 64 });
    }
  }
}

export async function handleRegimentApprovalModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: "❌ Это решение доступно только внутри сервера.", flags: 64 });
    return;
  }

  try {
    const [prefix, applicantId, submissionId, messageId] = interaction.customId.split(":");
    if (prefix !== REGIMENT_APPLICATION_APPROVE_MODAL_PREFIX || !applicantId || !submissionId || !messageId) {
      await interaction.reply({ content: "❌ Некорректная форма комментария.", flags: 64 });
      return;
    }

    const payload: RegimentApplicationDecisionPayload = {
      action: "approve",
      applicantId,
      submissionId,
      messageId,
    };

    const officer = await interaction.guild.members.fetch(interaction.user.id);
    if (!officerHasPermission(officer)) {
      await interaction.reply({ content: "❌ У тебя нет прав решать заявки.", flags: 64 });
      return;
    }

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ content: "❌ Не удалось найти канал заявки.", flags: 64 });
      return;
    }

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      await interaction.reply({ content: "❌ Сообщение заявки не найдено.", flags: 64 });
      return;
    }

    const rawComment = interaction.fields.getTextInputValue("approval_comment") ?? "";
    const trimmed = rawComment.trim();
    const comment = trimmed.length > 0 ? sanitizeField(trimmed) : null;

    await interaction.deferReply({ flags: 64 });
    const result = await finalizeRegimentDecision({
      guild: interaction.guild,
      message,
      payload,
      officer,
      comment,
      action: "approve",
    });

    await interaction.editReply({ content: result.followUpMessage });
  } catch (err) {
    error("Ошибка при обработке комментария одобрения", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Что-то пошло не так. Попробуй ещё раз.", flags: 64 });
    }
  }
}

export async function handleRegimentRejectionModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: "❌ Это решение доступно только внутри сервера.", flags: 64 });
    return;
  }

  try {
    const [prefix, applicantId, submissionId, messageId] = interaction.customId.split(":");
    if (prefix !== REGIMENT_APPLICATION_REJECT_MODAL_PREFIX || !applicantId || !submissionId || !messageId) {
      await interaction.reply({ content: "❌ Некорректная форма комментария.", flags: 64 });
      return;
    }

    const payload: RegimentApplicationDecisionPayload = {
      action: "reject",
      applicantId,
      submissionId,
      messageId,
    };

    const officer = await interaction.guild.members.fetch(interaction.user.id);
    if (!officerHasPermission(officer)) {
      await interaction.reply({ content: "❌ У тебя нет прав решать заявки.", flags: 64 });
      return;
    }

    const channel = interaction.channel;
    if (!channel || !channel.isTextBased()) {
      await interaction.reply({ content: "❌ Не удалось найти канал заявки.", flags: 64 });
      return;
    }

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) {
      await interaction.reply({ content: "❌ Сообщение заявки не найдено.", flags: 64 });
      return;
    }

    const rawComment = interaction.fields.getTextInputValue("rejection_comment") ?? "";
    const trimmed = rawComment.trim();
    const comment = trimmed.length > 0 ? sanitizeField(trimmed) : null;

    await interaction.deferReply({ flags: 64 });
    const result = await finalizeRegimentDecision({
      guild: interaction.guild,
      message,
      payload,
      officer,
      comment,
      action: "reject",
    });

    await interaction.editReply({ content: result.followUpMessage });
  } catch (err) {
    error("Ошибка при обработке комментария отказа", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Что-то пошло не так. Попробуй ещё раз.", flags: 64 });
    }
  }
}

export async function handleRegimentEditModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: "❌ Эта форма доступна только внутри сервера.", flags: 64 });
    return;
  }

  try {
    if (interaction.customId !== REGIMENT_APPLICATION_EDIT_MODAL_ID) {
      return;
    }

    cleanupExpiredEditDraft(interaction.user.id);
    const context = pendingEditApplications.get(interaction.user.id);
    if (!context) {
      await interaction.reply({ content: "❌ Черновик редактирования не найден или устарел.", flags: 64 });
      return;
    }

    context.updatedAnswers.nickname = sanitizeField(interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_EDIT_MODAL_ID}_nickname`));
    context.updatedAnswers.realName = sanitizeField(interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_EDIT_MODAL_ID}_real_name`));
    context.updatedAnswers.age = sanitizeField(interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_EDIT_MODAL_ID}_age`));
    context.updatedAnswers.source = sanitizeField(interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_EDIT_MODAL_ID}_source`));
    context.updatedAnswers.location = sanitizeField(interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_EDIT_MODAL_ID}_location`));
    context.createdAt = Date.now();

    pendingEditApplications.set(interaction.user.id, context);

    await interaction.reply({
      content: "Шаг 1 сохранён. Нажми кнопку ниже, чтобы отредактировать оставшиеся поля.",
      components: [buildEditBattlesButtonRow()],
      flags: 64,
    });
  } catch (err) {
    error("Ошибка при обработке первой формы редактирования", err);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Не удалось обработать форму. Попробуй позже.", flags: 64 });
    }
  }
}

export async function handleRegimentEditBattlesModal(interaction: ModalSubmitInteraction): Promise<void> {
  if (!interaction.inGuild() || !interaction.guild) {
    await interaction.reply({ content: "❌ Эта форма доступна только внутри сервера.", flags: 64 });
    return;
  }

  try {
    if (interaction.customId !== REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID) {
      return;
    }

    cleanupExpiredEditDraft(interaction.user.id);
    const context = pendingEditApplications.get(interaction.user.id);
    if (!context) {
      await interaction.reply({ content: "❌ Черновик редактирования не найден или устарел.", flags: 64 });
      return;
    }

    context.updatedAnswers.rulesAgreement = sanitizeField(interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID}_rules`));
    context.updatedAnswers.battles = sanitizeField(interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID}_battles`));
    context.updatedAnswers.lastRegiment = sanitizeOptionalField(interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID}_last_regiment`));
    context.updatedAnswers.leaveReason = sanitizeOptionalField(interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID}_leave_reason`));
    context.updatedAnswers.leaveDate = sanitizeOptionalField(interaction.fields.getTextInputValue(`${REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID}_leave_date`));

    const guild = interaction.guild;
    const channel = interaction.channel && interaction.channel.isTextBased()
      ? interaction.channel
      : await guild.channels.fetch(context.channelId).catch(() => null);

    if (!channel || !channel.isTextBased()) {
      pendingEditApplications.delete(interaction.user.id);
      await interaction.reply({ content: "❌ Канал заявки недоступен.", flags: 64 });
      return;
    }

    const message = await channel.messages.fetch(context.messageId).catch(() => null);
    if (!message) {
      pendingEditApplications.delete(interaction.user.id);
      await interaction.reply({ content: "❌ Сообщение заявки не найдено.", flags: 64 });
      return;
    }

    const existingEmbed = message.embeds[0];
    if (!existingEmbed) {
      pendingEditApplications.delete(interaction.user.id);
      await interaction.reply({ content: "❌ Эмбед заявки отсутствует.", flags: 64 });
      return;
    }

    let applicantMember: GuildMember | null = null;
    try {
      applicantMember = await guild.members.fetch(context.applicantId);
    } catch (err) {
      warn(`Не удалось обновить данные участника ${context.applicantId} при редактировании заявки`, err);
    }

    const finalAnswers: RegimentApplicationAnswers = {
      nickname: (context.updatedAnswers.nickname as string) ?? context.currentAnswers.nickname,
      realName: (context.updatedAnswers.realName as string) ?? context.currentAnswers.realName,
      age: (context.updatedAnswers.age as string) ?? context.currentAnswers.age,
      source: (context.updatedAnswers.source as string) ?? context.currentAnswers.source,
      location: (context.updatedAnswers.location as string) ?? context.currentAnswers.location,
      rulesAgreement: (context.updatedAnswers.rulesAgreement as string) ?? context.currentAnswers.rulesAgreement,
      battles: (context.updatedAnswers.battles as string) ?? context.currentAnswers.battles,
      lastRegiment: (context.updatedAnswers.lastRegiment as string | undefined) ?? context.currentAnswers.lastRegiment,
      leaveReason: (context.updatedAnswers.leaveReason as string | undefined) ?? context.currentAnswers.leaveReason,
      leaveDate: (context.updatedAnswers.leaveDate as string | undefined) ?? context.currentAnswers.leaveDate,
    };

    const originalEmbedData = EmbedBuilder.from(existingEmbed).toJSON();
    const originalStatus = originalEmbedData.fields?.find((f) => f.name === "Статус")?.value ?? "⏳ На рассмотрении";
    const originalComment = originalEmbedData.fields?.find((f) => f.name === "Комментарий офицера")?.value ?? null;
    const originalColor = existingEmbed.color ?? 0xf1c40f;

    const newEmbed = buildApplicationEmbed(
      context.applicantId,
      context.applicantTag,
      finalAnswers,
      context.submissionId,
      applicantMember
    ).setColor(originalColor);

    updateStatusOnEmbed(newEmbed, originalStatus);
    if (originalComment) {
      applyOfficerComment(newEmbed, originalComment);
    }

    await message.edit({ embeds: [newEmbed], components: [buildDecisionRow(context.applicantId, context.submissionId)] });

    const logLines = [
      `✏️ Заявка обновлена: <@${context.applicantId}>`,
      `👮 Офицер: <@${interaction.user.id}>`,
    ];
    if ("send" in channel) {
      await (channel as TextChannel).send(logLines.join("\n"));
    }

    pendingEditApplications.delete(interaction.user.id);

    await interaction.reply({ content: "✏️ Заявка обновлена.", flags: 64 });
  } catch (err) {
    error("Ошибка при завершении редактирования заявки", err);
    pendingEditApplications.delete(interaction.user.id);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: "❌ Не удалось обновить заявку. Попробуй позже.", flags: 64 });
    }
  }
}

function extractFieldValue(embed: EmbedBuilder, fieldLabel: string): string | null {
  const data = embed.toJSON();
  const field = data.fields?.find((f) => f.name === fieldLabel);
  if (!field) {
    return null;
  }
  const value = field.value?.trim();
  if (!value || value === "—") {
    return null;
  }
  return value;
}

function shortenForNickname(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  if (maxLength <= 3) {
    return value.slice(0, maxLength);
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function deriveApprovedNickname(embed: EmbedBuilder): string | null {
  const nickname = extractFieldValue(embed, "1️⃣ Никнейм");
  const realName = extractFieldValue(embed, "2️⃣ Имя");

  if (!nickname || !realName) {
    return null;
  }

  const maxLength = 32;
  const separatorLength = 3; // " (" и ")"
  const available = maxLength - separatorLength;
  if (available <= 0) {
    return null;
  }

  let nickPart = nickname;
  let realPart = realName;

  const initialNickLimit = Math.max(1, Math.min(nickPart.length, Math.ceil(available * 0.6)));
  nickPart = shortenForNickname(nickPart, initialNickLimit);
  const remainingForReal = Math.max(1, available - nickPart.length);
  realPart = shortenForNickname(realPart, remainingForReal);

  let formatted = `${nickPart} (${realPart})`;
  while (formatted.length > maxLength) {
    if (realPart.length > nickPart.length && realPart.length > 1) {
      realPart = shortenForNickname(realPart, realPart.length - 1);
    } else if (nickPart.length > 1) {
      nickPart = shortenForNickname(nickPart, nickPart.length - 1);
    } else {
      formatted = formatted.slice(0, maxLength);
      return formatted;
    }
    formatted = `${nickPart} (${realPart})`;
  }

  return formatted;
}

export const __regimentApplicationTestUtils = {
  sanitizeField,
  buildDecisionRow,
  REGIMENT_APPLICATION_APPROVE_MODAL_PREFIX,
  deriveApprovedNickname,
};

export {
  REGIMENT_APPLICATION_BUTTON_ID,
  REGIMENT_APPLICATION_MODAL_ID,
  REGIMENT_APPLICATION_MODAL_BATTLES_ID,
  REGIMENT_APPLICATION_BATTLES_BUTTON_ID,
  REGIMENT_APPLICATION_APPROVE_MODAL_PREFIX,
  REGIMENT_APPLICATION_REJECT_MODAL_PREFIX,
  REGIMENT_APPLICATION_EDIT_BUTTON_ID,
  REGIMENT_APPLICATION_EDIT_MODAL_ID,
  REGIMENT_APPLICATION_EDIT_MODAL_BATTLES_ID,
  REGIMENT_APPLICATION_EDIT_BATTLES_BUTTON_ID,
  REGIMENT_APPLICATION_DECISION_PREFIX,
  RegimentApplicationDecisionPayload,
};
