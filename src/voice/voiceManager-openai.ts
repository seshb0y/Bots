import {
  VoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  joinVoiceChannel,
  EndBehaviorType,
} from '@discordjs/voice';
import { VoiceChannel, GuildMember } from 'discord.js';
import { createReadStream, createWriteStream, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import * as prism from 'prism-media';
import { OpenAI } from 'openai';
import { info, warn, error } from '../utils/logger';

interface VoiceSession {
  connection: VoiceConnection;
  channel: VoiceChannel;
  isListening: boolean;
  audioStreams: Map<string, prism.opus.Decoder>;
}

export class VoiceManager {
  private sessions: Map<string, VoiceSession> = new Map();
  private openai: OpenAI;
  private tempDir: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });
    this.tempDir = join(__dirname, '../../temp');
    
    // Создаем папку для временных файлов
    if (!existsSync(this.tempDir)) {
      require('fs').mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Подключается к голосовому каналу
   */
  async joinChannel(channel: VoiceChannel): Promise<boolean> {
    try {
      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
        selfDeaf: false,
        selfMute: true,
      });

      const session: VoiceSession = {
        connection,
        channel,
        isListening: false,
        audioStreams: new Map(),
      };

      this.sessions.set(channel.id, session);

      connection.on(VoiceConnectionStatus.Ready, () => {
        info(`Подключился к голосовому каналу: ${channel.name}`);
      });

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        info(`Отключился от голосового канала: ${channel.name}`);
        this.cleanup(channel.id);
      });

      connection.on('error', (err) => {
        error(`Ошибка голосового соединения в канале ${channel.name}:`, err);
      });

      return true;
    } catch (err) {
      error(`Не удалось подключиться к каналу ${channel.name}:`, err);
      return false;
    }
  }

  /**
   * Отключается от голосового канала
   */
  async leaveChannel(channelId: string): Promise<void> {
    const session = this.sessions.get(channelId);
    if (session) {
      session.connection.destroy();
      this.cleanup(channelId);
    }
  }

  /**
   * Начинает прослушивание голосовых команд
   */
  async startListening(channelId: string): Promise<boolean> {
    const session = this.sessions.get(channelId);
    if (!session) {
      warn(`Попытка начать прослушивание в несуществующем канале: ${channelId}`);
      return false;
    }

    if (session.isListening) {
      warn(`Прослушивание уже активно в канале: ${session.channel.name}`);
      return false;
    }

    try {
      session.isListening = true;
      
      // Подписываемся на аудио от пользователей
      session.connection.receiver.speaking.on('start', (userId) => {
        info(`🎤 Пользователь ${userId} начал говорить в канале ${session.channel.name}`);
        this.handleUserSpeaking(session, userId);
      });

      session.connection.receiver.speaking.on('end', (userId) => {
        info(`🔇 Пользователь ${userId} перестал говорить в канале ${session.channel.name}`);
      });

      info(`Начато прослушивание в канале: ${session.channel.name}`);
      return true;
    } catch (err) {
      error(`Ошибка при запуске прослушивания в канале ${session.channel.name}:`, err);
      session.isListening = false;
      return false;
    }
  }

  /**
   * Останавливает прослушивание голосовых команд
   */
  async stopListening(channelId: string): Promise<void> {
    const session = this.sessions.get(channelId);
    if (session) {
      session.isListening = false;
      session.audioStreams.clear();
      info(`Остановлено прослушивание в канале: ${session.channel.name}`);
    }
  }

  /**
   * Обрабатывает речь пользователя
   */
  private async handleUserSpeaking(session: VoiceSession, userId: string): Promise<void> {
    if (!session.isListening) return;

    info(`🎙️ Начинаю обработку речи пользователя ${userId}`);

    try {
      const audioStream = session.connection.receiver.subscribe(userId, {
        end: {
          behavior: EndBehaviorType.AfterSilence,
          duration: 3000, // 3 секунды тишины
        },
      });

      const decoder = new prism.opus.Decoder({
        frameSize: 960,
        channels: 2,
        rate: 48000,
      });

      // Используем PCM формат вместо WAV для лучшей совместимости
      const fileName = `voice_${userId}_${Date.now()}.pcm`;
      const filePath = join(this.tempDir, fileName);
      const writeStream = createWriteStream(filePath);

      info(`🎵 Начинаю запись аудио: ${fileName}`);
      audioStream.pipe(decoder).pipe(writeStream);

      writeStream.on('finish', async () => {
        info(`📁 Аудиофайл записан: ${filePath}`);
        try {
          const transcription = await this.transcribeAudio(filePath);
          info(`📝 Транскрипция: "${transcription}"`);
          if (transcription && transcription.trim()) {
            await this.processVoiceCommand(session, userId, transcription);
          } else {
            info(`⚠️ Пустая транскрипция от пользователя ${userId}`);
          }
        } catch (err) {
          error(`Ошибка обработки голосовой команды от пользователя ${userId}:`, err);
        } finally {
          // Удаляем временный файл
          if (existsSync(filePath)) {
            unlinkSync(filePath);
            info(`🗑️ Временный файл удален: ${filePath}`);
          }
        }
      });

    } catch (err) {
      error(`Ошибка при обработке речи пользователя ${userId}:`, err);
    }
  }

  /**
   * Конвертирует PCM в WAV формат
   */
  private async convertPcmToWav(pcmPath: string): Promise<string> {
    const wavPath = pcmPath.replace('.pcm', '.wav');
    
    // Простая конвертация PCM в WAV с помощью ffmpeg
    const ffmpeg = require('@ffmpeg-installer/ffmpeg');
    const { spawn } = require('child_process');
    
    return new Promise((resolve, reject) => {
      const ffmpegProcess = spawn(ffmpeg.path, [
        '-f', 's16le',           // input format: signed 16-bit little endian
        '-ar', '48000',          // sample rate
        '-ac', '2',              // channels
        '-i', pcmPath,           // input file
        '-y',                    // overwrite output
        wavPath                  // output file
      ]);

      ffmpegProcess.on('close', (code: number) => {
        if (code === 0) {
          resolve(wavPath);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });

      ffmpegProcess.on('error', (err: Error) => {
        reject(err);
      });
    });
  }

  /**
   * Транскрибирует аудио с помощью OpenAI Whisper
   */
  private async transcribeAudio(filePath: string): Promise<string | null> {
    try {
      let audioFilePath = filePath;
      
      // Если файл PCM, конвертируем в WAV
      if (filePath.endsWith('.pcm')) {
        info(`🔄 Конвертирую PCM в WAV: ${filePath}`);
        audioFilePath = await this.convertPcmToWav(filePath);
        info(`✅ Конвертация завершена: ${audioFilePath}`);
      }
      
      const audioFile = createReadStream(audioFilePath);
      
      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'ru',
        response_format: 'text',
      });

      // Удаляем WAV файл если он был создан из PCM
      if (audioFilePath !== filePath && existsSync(audioFilePath)) {
        unlinkSync(audioFilePath);
      }

      return transcription as string;
    } catch (err) {
      error('Ошибка транскрипции аудио:', err);
      return null;
    }
  }

  /**
   * Обрабатывает голосовую команду
   */
  private async processVoiceCommand(session: VoiceSession, userId: string, command: string): Promise<void> {
    try {
      const member = session.channel.members.get(userId);
      if (!member) return;

      info(`Голосовая команда от ${member.displayName}: "${command}"`);

      // Определяем команду по ключевым словам
      const lowerCommand = command.toLowerCase();
      
      if (lowerCommand.includes('стоп') || lowerCommand.includes('остановись')) {
        await this.handleStopCommand(session, member);
      } else if (lowerCommand.includes('статистика') || lowerCommand.includes('стата')) {
        await this.handleStatsCommand(session, member);
      } else if (lowerCommand.includes('очередь') || lowerCommand.includes('кто в очереди')) {
        await this.handleQueueCommand(session, member);
      } else if (lowerCommand.includes('помощь') || lowerCommand.includes('команды')) {
        await this.handleHelpCommand(session, member);
      } else {
        // Если команда не распознана, используем OpenAI для интерпретации
        await this.handleUnknownCommand(session, member, command);
      }

    } catch (err) {
      error(`Ошибка обработки команды "${command}" от пользователя ${userId}:`, err);
    }
  }

  /**
   * Обрабатывает команду остановки
   */
  private async handleStopCommand(session: VoiceSession, member: GuildMember): Promise<void> {
    await this.stopListening(session.channel.id);
    await this.speakText(session, `${member.displayName}, прослушивание остановлено.`);
  }

  /**
   * Обрабатывает запрос статистики
   */
  private async handleStatsCommand(session: VoiceSession, member: GuildMember): Promise<void> {
    const channelCount = session.channel.members.filter(m => !m.user.bot).size;
    await this.speakText(session, `В канале сейчас ${channelCount} человек.`);
  }

  /**
   * Обрабатывает запрос очереди
   */
  private async handleQueueCommand(session: VoiceSession, member: GuildMember): Promise<void> {
    // Здесь можно интегрировать с существующей системой очереди
    await this.speakText(session, `${member.displayName}, информация об очереди пока недоступна через голос.`);
  }

  /**
   * Обрабатывает запрос помощи
   */
  private async handleHelpCommand(session: VoiceSession, member: GuildMember): Promise<void> {
    const helpText = "Доступные голосовые команды: стоп, статистика, очередь, помощь.";
    await this.speakText(session, helpText);
  }

  /**
   * Обрабатывает неизвестные команды с помощью OpenAI
   */
  private async handleUnknownCommand(session: VoiceSession, member: GuildMember, command: string): Promise<void> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `Ты помощник Discord бота. Пользователь сказал: "${command}". 
            Определи, что он хочет, и дай краткий ответ на русском языке (максимум 50 слов).
            Если это не связано с ботом или Discord, скажи что не понял команду.`
          },
          {
            role: 'user',
            content: command
          }
        ],
        max_tokens: 100,
        temperature: 0.7,
      });

      const aiResponse = response.choices[0]?.message?.content;
      if (aiResponse) {
        await this.speakText(session, aiResponse);
      } else {
        await this.speakText(session, `${member.displayName}, я не понял команду.`);
      }

    } catch (err) {
      error('Ошибка обработки команды через OpenAI:', err);
      await this.speakText(session, `${member.displayName}, произошла ошибка при обработке команды.`);
    }
  }

  /**
   * Воспроизводит текст голосом (заглушка для будущей реализации TTS)
   */
  private async speakText(session: VoiceSession, text: string): Promise<void> {
    // В будущем здесь можно добавить TTS (Text-to-Speech)
    // Пока просто логируем ответ
    info(`[Голосовой ответ в ${session.channel.name}]: ${text}`);
    
    // Отправляем текстовое сообщение в канал как альтернативу
    try {
      const textChannel = session.channel.guild.channels.cache
        .find(ch => ch.name.includes('общий') || ch.name.includes('general')) as any;
      
      if (textChannel && textChannel.isTextBased()) {
        await textChannel.send(`🎤 **Голосовой ответ:** ${text}`);
      }
    } catch (err) {
      warn('Не удалось отправить текстовое сообщение:', err);
    }
  }

  /**
   * Получает активные сессии
   */
  getActiveSessions(): Map<string, VoiceSession> {
    return new Map(this.sessions);
  }

  /**
   * Проверяет, активно ли прослушивание в канале
   */
  isListening(channelId: string): boolean {
    const session = this.sessions.get(channelId);
    return session ? session.isListening : false;
  }

  /**
   * Очищает ресурсы сессии
   */
  private cleanup(channelId: string): void {
    const session = this.sessions.get(channelId);
    if (session) {
      session.audioStreams.clear();
      this.sessions.delete(channelId);
    }
  }

  /**
   * Очищает все сессии при выключении бота
   */
  async cleanup_all(): Promise<void> {
    for (const [channelId, session] of this.sessions) {
      session.connection.destroy();
    }
    this.sessions.clear();
    info('Все голосовые сессии очищены');
  }
} 