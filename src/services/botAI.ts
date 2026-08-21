import { Player, NightActionRecord, RoleType } from '../types';

export interface BotChatMessageQueueItem {
  botId: string;
  botName: string;
  content: string;
  delayMs: number;
}

/**
 * Smart Seer Target Selection:
 * Avoids inspecting the same player night after night.
 * Prioritizes alive players who have never been inspected.
 */
export function getSmartSeerTarget(
  bot: Player,
  alivePlayers: Player[],
  actions: NightActionRecord[]
): Player | null {
  const pastInspectedIds = new Set(
    actions
      .filter((a) => a.actorId === bot.id && a.actionType === 'seer_inspect')
      .map((a) => a.targetId)
      .filter(Boolean)
  );

  const otherAlive = alivePlayers.filter((p) => p.id !== bot.id);
  if (otherAlive.length === 0) return null;

  // Filter uninspected players
  const uninspected = otherAlive.filter((p) => !pastInspectedIds.has(p.id));

  if (uninspected.length > 0) {
    // Pick randomly from uninspected players
    return uninspected[Math.floor(Math.random() * uninspected.length)];
  }

  // Fallback: If everyone has already been inspected, pick any alive other player
  return otherAlive[Math.floor(Math.random() * otherAlive.length)];
}

/**
 * Smart Werewolf Target Selection:
 * Wolf pack coordination: all werewolf bots align on the same victim target.
 */
export function getSmartWerewolfTarget(
  bot: Player,
  alivePlayers: Player[],
  actions: NightActionRecord[],
  dayNumber: number
): Player | null {
  const aliveNonWolves = alivePlayers.filter(
    (p) => p.team !== 'werewolves' && !p.role.includes('wolf')
  );
  if (aliveNonWolves.length === 0) return null;

  // Check if another wolf has already picked a target tonight
  const existingWolfBite = actions.find(
    (a) =>
      (a.actorRole?.includes('wolf') || a.actionType === 'wolf_bite') &&
      a.dayNumber === dayNumber &&
      a.targetId
  );

  if (existingWolfBite && aliveNonWolves.some((p) => p.id === existingWolfBite.targetId)) {
    return aliveNonWolves.find((p) => p.id === existingWolfBite.targetId) || null;
  }

  // Otherwise pick random alive non-wolf
  return aliveNonWolves[Math.floor(Math.random() * aliveNonWolves.length)];
}

/**
 * Smart Guard Target Selection:
 * Cannot protect the same target 2 nights in a row.
 */
export function getSmartGuardTarget(
  bot: Player,
  alivePlayers: Player[],
  actions: NightActionRecord[],
  dayNumber: number
): Player | null {
  const lastGuardAction = actions.find(
    (a) => a.actionType === 'guard_protect' && a.dayNumber === dayNumber - 1
  );
  const prevTargetId = lastGuardAction?.targetId;
  const validTargets = alivePlayers.filter((p) => p.id !== prevTargetId);
  const pool = validTargets.length > 0 ? validTargets : alivePlayers;
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

/**
 * Identifies wolves discovered by a Seer bot up to the current moment.
 */
export function getSeerKnowledge(
  seerBotId: string,
  players: Player[],
  actions: NightActionRecord[]
) {
  const inspectedActions = actions.filter(
    (a) => a.actorId === seerBotId && a.actionType === 'seer_inspect' && a.targetId
  );

  const foundWolves: Player[] = [];
  const foundVillagers: Player[] = [];

  inspectedActions.forEach((a) => {
    const target = players.find((p) => p.id === a.targetId);
    if (!target) return;
    if (target.team === 'werewolves' || target.role.includes('wolf') || target.role === 'wolf_man') {
      if (!foundWolves.some((w) => w.id === target.id)) {
        foundWolves.push(target);
      }
    } else {
      if (!foundVillagers.some((v) => v.id === target.id)) {
        foundVillagers.push(target);
      }
    }
  });

  return { foundWolves, foundVillagers };
}

/**
 * Generate rich, realistic conversational chats for Bots during Day Discussion.
 * Implements subtle Seer reveals, Wolf counter-arguments, and Village chatter.
 */
export function generateBotDayDiscussionDialogues(
  players: Player[],
  actions: NightActionRecord[],
  dayNumber: number,
  lastNightVictimIds?: string[]
): BotChatMessageQueueItem[] {
  const queue: BotChatMessageQueueItem[] = [];
  const aliveBots = players.filter((p) => p.isBot && p.isAlive);
  if (aliveBots.length === 0) return queue;

  const seerBot = aliveBots.find((p) => p.role === 'seer');
  let targetedWolfBySeer: Player | null = null;

  // 1. Seer Bot Intelligence
  if (seerBot) {
    const { foundWolves, foundVillagers } = getSeerKnowledge(seerBot.id, players, actions);
    const aliveFoundWolves = foundWolves.filter((w) => w.isAlive);
    const aliveFoundVillagers = foundVillagers.filter((v) => v.isAlive);

    if (aliveFoundWolves.length > 0) {
      // Pick the discovered wolf to point out
      targetedWolfBySeer = aliveFoundWolves[0];
      const subtleAccusations = [
        `Đêm qua tôi có một linh cảm vô cùng bất an... ${targetedWolfBySeer.name} toát ra mùi hôi của Ma Sói rất nồng. Mọi người hãy cẩn thận xem xét người này!`,
        `Linh tính mách bảo tôi ${targetedWolfBySeer.name} không phải là người làng lương thiện. Hôm nay chúng ta phải tập trung nghi vấn vào đây!`,
        `Tôi đã thấy điềm báo đen tối xung quanh ${targetedWolfBySeer.name}. Làng đừng để bị đánh lừa, hãy dồn phiếu vào người này nhé!`,
        `Theo quan sát đặc biệt tối qua của tôi, ${targetedWolfBySeer.name} có hành tung rất đáng ngờ của loài Sói!`,
        `Tôi linh cảm được sát khí từ ${targetedWolfBySeer.name}. Anh em dân làng hãy đồng lòng bỏ phiếu để trừ họa!`,
      ];
      queue.push({
        botId: seerBot.id,
        botName: seerBot.name,
        content: subtleAccusations[Math.floor(Math.random() * subtleAccusations.length)],
        delayMs: 2500 + Math.floor(Math.random() * 2000),
      });
    } else if (aliveFoundVillagers.length > 0 && Math.random() < 0.7) {
      // Point out a verified good villager
      const goodP = aliveFoundVillagers[Math.floor(Math.random() * aliveFoundVillagers.length)];
      const goodEndorsements = [
        `Đêm qua tôi thấy ${goodP.name} có tâm hồn hoàn toàn trong sạch, chúng ta không nên nghi ngờ oan cho người tốt nhé!`,
        `Điềm báo cho thấy ${goodP.name} là người làng lương thiện, mọi người hãy tin tưởng họ.`,
        `Linh cảm của tôi cho thấy ${goodP.name} đứng về phe Dân Làng, hãy cùng nhau bảo vệ người này!`,
      ];
      queue.push({
        botId: seerBot.id,
        botName: seerBot.name,
        content: goodEndorsements[Math.floor(Math.random() * goodEndorsements.length)],
        delayMs: 3000 + Math.floor(Math.random() * 2000),
      });
    }
  }

  // 2. Wolf Bot Defense / Deflection if accused
  if (targetedWolfBySeer && targetedWolfBySeer.isBot && targetedWolfBySeer.isAlive) {
    const wolfDefenses = [
      `Ơ kìa sao lại vu oan cho tôi thế? Tôi là dân làng chăm chỉ mà! Đừng để bị dắt mũi!`,
      `Mọi người đừng nghe lời xúi giục, tôi thề tôi là phe Làng 100%! Có khi người tố cáo mới là Sói giả danh!`,
      `Đêm qua tôi ngủ ngoan ở nhà, sao cứ nhắm vào tôi vậy? Hãy nhìn những người ít nói kìa!`,
      `Tôi mà là Sói thì tôi nhận luôn rồi! Đừng để phe Sói thật giật dây chia rẽ làng!`,
    ];
    queue.push({
      botId: targetedWolfBySeer.id,
      botName: targetedWolfBySeer.name,
      content: wolfDefenses[Math.floor(Math.random() * wolfDefenses.length)],
      delayMs: 7000 + Math.floor(Math.random() * 2000),
    });

    // Fellow wolf might deflect
    const otherWolfBot = aliveBots.find(
      (p) =>
        p.id !== targetedWolfBySeer?.id &&
        (p.team === 'werewolves' || p.role.includes('wolf'))
    );
    if (otherWolfBot && Math.random() < 0.6) {
      const aliveNonWolves = players.filter(
        (p) => p.isAlive && p.team !== 'werewolves' && !p.role.includes('wolf')
      );
      const scapegoatCandidate = aliveNonWolves[Math.floor(Math.random() * aliveNonWolves.length)];
      const deflections = [
        `Tôi thấy ${targetedWolfBySeer.name} nói có lý đấy, đừng vội kết tội khi chưa có bằng chứng xác thực.`,
        scapegoatCandidate
          ? `Tôi lại thấy ${scapegoatCandidate.name} có vẻ đáng ngờ hơn nhiều, cứ im im từ đầu tới giờ!`
          : `Mọi người bình tĩnh đã, vội vàng dồn phiếu là trúng bẫy của Sói đấy!`,
      ];
      queue.push({
        botId: otherWolfBot.id,
        botName: otherWolfBot.name,
        content: deflections[Math.floor(Math.random() * deflections.length)],
        delayMs: 11000 + Math.floor(Math.random() * 2500),
      });
    }
  }

  // 3. Other alive bots chime in with natural comments
  const otherBots = aliveBots.filter(
    (p) => p.id !== seerBot?.id && p.id !== targetedWolfBySeer?.id
  );

  if (otherBots.length > 0) {
    const randomBot = otherBots[Math.floor(Math.random() * otherBots.length)];

    if (targetedWolfBySeer && randomBot.team === 'villagers' && Math.random() < 0.75) {
      const agreeMessages = [
        `Nếu đã có linh cảm rõ ràng thế này thì làng mình nên dồn phiếu thử xem sao!`,
        `Tôi cũng thấy ${targetedWolfBySeer.name} hôm nay có vẻ bất an, đồng ý dồn phiếu!`,
        `Tin tưởng vào trực giác của dân làng, hôm nay quyết tâm diệt Sói!`,
      ];
      queue.push({
        botId: randomBot.id,
        botName: randomBot.name,
        content: agreeMessages[Math.floor(Math.random() * agreeMessages.length)],
        delayMs: 10000 + Math.floor(Math.random() * 3000),
      });
    } else {
      // General ambient discussion
      const generalMessages = [
        `Hôm nay chúng ta cần thảo luận thật kỹ, đừng để phí mất lá phiếu quý giá!`,
        `Đêm qua thật kinh hoàng... Lũ Sói ngày càng lộng hành rồi!`,
        `Mọi người hãy lên tiếng đi, ai im lặng nhất thường là Sói ẩn mình đấy!`,
        `Phe Làng chúng ta cần đoàn kết lại, không được để nội bộ nghi kị lẫn nhau!`,
      ];
      if (lastNightVictimIds && lastNightVictimIds.length > 0) {
        generalMessages.unshift(
          `Thương tiếc cho người vừa ngã xuống đêm qua... Hôm nay nhất định phải tìm ra thủ phạm!`
        );
      }
      queue.push({
        botId: randomBot.id,
        botName: randomBot.name,
        content: generalMessages[Math.floor(Math.random() * generalMessages.length)],
        delayMs: 5000 + Math.floor(Math.random() * 4000),
      });
    }
  }

  // Sort queue by delayMs
  return queue.sort((a, b) => a.delayMs - b.delayMs);
}

/**
 * Smart Nomination Voting for Bots during Day Voting:
 */
export function getSmartBotNominationTarget(
  bot: Player,
  alivePlayers: Player[],
  actions: NightActionRecord[],
  players: Player[]
): Player | null {
  const eligibleCandidates = alivePlayers.filter((p) => p.id !== bot.id && !p.idiotSaved);
  if (eligibleCandidates.length === 0) return null;

  // 1. Seer Bot: If inspected an alive wolf -> 100% vote for that wolf!
  if (bot.role === 'seer') {
    const { foundWolves } = getSeerKnowledge(bot.id, players, actions);
    const aliveWolf = foundWolves.find((w) => w.isAlive && !w.idiotSaved);
    if (aliveWolf) {
      return aliveWolf;
    }
  }

  // 2. Werewolf Bot: Never vote for fellow wolves, vote for accusers or non-wolves
  if (bot.team === 'werewolves' || bot.role.includes('wolf')) {
    const nonWolves = eligibleCandidates.filter(
      (p) => p.team !== 'werewolves' && !p.role.includes('wolf')
    );
    if (nonWolves.length > 0) {
      // Check if a Seer has inspected them
      const seerPlayer = alivePlayers.find((p) => p.role === 'seer');
      if (seerPlayer && nonWolves.some((p) => p.id === seerPlayer.id)) {
        // Vote against the Seer
        return seerPlayer;
      }
      return nonWolves[Math.floor(Math.random() * nonWolves.length)];
    }
  }

  // 3. Good Villager Bots: Follow Seer's lead if any Seer revealed a wolf in knowledge
  const aliveSeers = alivePlayers.filter((p) => p.role === 'seer');
  for (const s of aliveSeers) {
    const { foundWolves } = getSeerKnowledge(s.id, players, actions);
    const targetWolf = foundWolves.find((w) => w.isAlive && !w.idiotSaved);
    if (targetWolf && Math.random() < 0.8) {
      return targetWolf;
    }
  }

  // Default random from eligible
  return eligibleCandidates[Math.floor(Math.random() * eligibleCandidates.length)];
}

/**
 * Smart Verdict Voting for Bots (Execute vs Pardon)
 */
export function getSmartBotVerdictChoice(
  bot: Player,
  accusedPlayer: Player,
  actions: NightActionRecord[],
  players: Player[]
): 'execute' | 'pardon' {
  // If the voter is a Werewolf
  if (bot.team === 'werewolves' || bot.role.includes('wolf')) {
    if (accusedPlayer.team === 'werewolves' || accusedPlayer.role.includes('wolf')) {
      // Defend fellow wolf
      return Math.random() < 0.85 ? 'pardon' : 'execute';
    } else {
      // Eliminate innocent villager
      return Math.random() < 0.85 ? 'execute' : 'pardon';
    }
  }

  // If the voter is Seer or Villager
  const aliveSeers = players.filter((p) => p.isAlive && p.role === 'seer');
  for (const s of aliveSeers) {
    const { foundWolves, foundVillagers } = getSeerKnowledge(s.id, players, actions);
    if (foundWolves.some((w) => w.id === accusedPlayer.id)) {
      // Accused is confirmed wolf!
      return Math.random() < 0.95 ? 'execute' : 'pardon';
    }
    if (foundVillagers.some((v) => v.id === accusedPlayer.id)) {
      // Accused is confirmed innocent!
      return Math.random() < 0.85 ? 'pardon' : 'execute';
    }
  }

  // Default: Leans execute on accused player
  return Math.random() < 0.65 ? 'execute' : 'pardon';
}
