import { ChannelType, EmbedBuilder } from "discord.js";
import * as fs from "fs";
import { ensureRegimentWelcomeMessage, isRegimentApplicationButton, tryParseRegimentDecision, __regimentApplicationTestUtils, REGIMENT_APPLICATION_BUTTON_ID } from "../features/regiment-application";
import { REGIMENT_APPLICATION_STATE_PATH, WELCOME_CHANNEL_ID } from "../constants";
import { TestResult } from "./testRunner";

const { sanitizeField, buildDecisionRow, deriveApprovedNickname } = __regimentApplicationTestUtils;

class MockMessagesManager {
  public fetchedIds: string[] = [];

  async fetch(_id: string): Promise<any> {
    this.fetchedIds.push(_id);
    throw new Error("Message not found");
  }
}

class MockTextChannel {
  public type = ChannelType.GuildText;
  public messages = new MockMessagesManager();
  public sendPayloads: any[] = [];

  constructor(private readonly messageId: string) {}

  async send(payload: any): Promise<{ id: string }> {
    this.sendPayloads.push(payload);
    return { id: this.messageId };
  }
}

class MockClient {
  constructor(private readonly channel: MockTextChannel) {}

  public channels = {
    fetch: async (id: string) => {
      if (id !== WELCOME_CHANNEL_ID) {
        throw new Error(`Unexpected channel id ${id}`);
      }
      return this.channel;
    },
  };
}

async function testSanitizeField(): Promise<TestResult> {
  const start = Date.now();
  const name = "Очистка полей заявки";

  try {
    const empty = sanitizeField("   ");
    const trimmed = sanitizeField("  текст  ");
    const cut = sanitizeField("x".repeat(2000));

    if (empty !== "—") {
      throw new Error(`Ожидалось "—" для пустого значения, получено "${empty}"`);
    }

    if (trimmed !== "текст") {
      throw new Error(`Ожидалось "текст" после тримминга, получено "${trimmed}"`);
    }

    if (cut.length !== 1024) {
      throw new Error(`Длина обрезанного значения должна быть 1024, получено ${cut.length}`);
    }

    return { name, success: true, duration: Date.now() - start };
  } catch (err: any) {
    return { name, success: false, error: `${err}`, duration: Date.now() - start };
  }
}

async function testDecisionParsing(): Promise<TestResult> {
  const start = Date.now();
  const name = "Парсинг решения заявки";

  try {
    const row = buildDecisionRow("123", "submission");
    const rowJson = row.toJSON();
    const approveId = (rowJson.components?.[0] as any)?.custom_id as string | undefined;
    const rejectId = (rowJson.components?.[1] as any)?.custom_id as string | undefined;

    if (!approveId || !rejectId) {
      throw new Error("Не удалось получить идентификаторы кнопок");
    }

    const approvePayload = tryParseRegimentDecision(approveId);
    if (!approvePayload || approvePayload.action !== "approve" || approvePayload.applicantId !== "123") {
      throw new Error("Некорректный парсинг approve");
    }

    const rejectPayload = tryParseRegimentDecision(rejectId);
    if (!rejectPayload || rejectPayload.action !== "reject" || rejectPayload.submissionId !== "submission") {
      throw new Error("Некорректный парсинг reject");
    }

    const invalid = tryParseRegimentDecision("invalid:id");
    if (invalid !== null) {
      throw new Error("Ожидалось null для неверного идентификатора");
    }

    if (!isRegimentApplicationButton(REGIMENT_APPLICATION_BUTTON_ID)) {
      throw new Error("Кнопка подачи заявки должна распознаваться");
    }

    return { name, success: true, duration: Date.now() - start };
  } catch (err: any) {
    return { name, success: false, error: `${err}`, duration: Date.now() - start };
  }
}

async function testEnsureWelcomeMessageCreatesState(): Promise<TestResult> {
  const start = Date.now();
  const name = "Создание приветствия и состояния";

  const statePath = REGIMENT_APPLICATION_STATE_PATH;
  let backup: string | null = null;

  try {
    if (fs.existsSync(statePath)) {
      backup = fs.readFileSync(statePath, "utf-8");
      fs.unlinkSync(statePath);
    }

    const channel = new MockTextChannel("test-message");
    const client = new MockClient(channel);

    await ensureRegimentWelcomeMessage(client as any);

    if (channel.sendPayloads.length !== 1) {
      throw new Error(`Ожидалась отправка одного сообщения, получено ${channel.sendPayloads.length}`);
    }

    if (!fs.existsSync(statePath)) {
      throw new Error("Файл состояния не был создан");
    }

    const stateData = JSON.parse(fs.readFileSync(statePath, "utf-8"));
    if (stateData.welcomeMessageId !== "test-message") {
      throw new Error(`ID сообщения не сохранён корректно: ${stateData.welcomeMessageId}`);
    }

    return { name, success: true, duration: Date.now() - start };
  } catch (err: any) {
    return { name, success: false, error: `${err}`, duration: Date.now() - start };
  } finally {
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
    if (backup !== null) {
      fs.writeFileSync(statePath, backup, "utf-8");
    }
  }
}

async function testApprovedNicknameDerivation(): Promise<TestResult> {
  const start = Date.now();
  const name = "Формирование ника после одобрения";

  try {
    const embed = new EmbedBuilder()
      .setTitle("Заявка")
      .addFields(
        { name: "1️⃣ Никнейм", value: "SuperLongNicknameForTesting", inline: false },
        { name: "2️⃣ Имя", value: "ОченьДлинноеИмяКотороеНужноСократить", inline: false }
      );

    const nickname = deriveApprovedNickname(embed);
    if (!nickname) {
      throw new Error("Ожидалось получить ник для переименования");
    }

    if (nickname.length > 32) {
      throw new Error(`Ник не должен превышать 32 символа, получено ${nickname.length}`);
    }

    if (!nickname.includes("(") || !nickname.includes(")")) {
      throw new Error(`Неверный формат ника: ${nickname}`);
    }

    return { name, success: true, duration: Date.now() - start };
  } catch (err: any) {
    return { name, success: false, error: `${err}`, duration: Date.now() - start };
  }
}

export const regimentApplicationTests = [
  testSanitizeField,
  testDecisionParsing,
  testEnsureWelcomeMessageCreatesState,
  testApprovedNicknameDerivation,
];
