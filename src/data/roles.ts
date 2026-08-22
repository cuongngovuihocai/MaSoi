import { Player, RoleMeta, RoleType } from '../types';

export const ROLE_DEFINITIONS: Record<RoleType, RoleMeta> = {
  villager: {
    id: 'villager',
    name: 'Dân Làng',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Người dân vô tội sống tại ngôi làng nhỏ.',
    ability: 'Ban đêm ngủ ngon giấc. Ban ngày thảo luận và suy luận để tìm ra Ma Sói.',
    nightPriority: 99,
    iconName: 'User',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Thức đêm mới biết đêm dài. Sáng ra mới biết đến ai lên giàn',
  },
  werewolf: {
    id: 'werewolf',
    name: 'Ma Sói',
    team: 'werewolves',
    teamName: 'Phe Ma Sói',
    description: 'Sinh vật huyền bí ban ngày ẩn náu, ban đêm hiện nguyên hình.',
    ability: 'Mỗi đêm thức dậy cùng đồng đồng thống nhất chọn 1 dân làng để tiêu diệt.',
    nightPriority: 3,
    iconName: 'Wolf',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    quote: 'Ta sẽ thăm từng người, sẽ đi thăm từng đường, sẽ vô thăm từng nhà',
  },
  seer: {
    id: 'seer',
    name: 'Tiên Tri',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Người có khả năng nhìn thấu chân tướng sự thật.',
    ability: 'Mỗi đêm chọn 1 người để Quản trò tiết lộ người đó có phải Ma Sói hay không.',
    nightPriority: 7,
    iconName: 'Eye',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Vải thưa sao che được mắt thánh?',
  },
  guard: {
    id: 'guard',
    name: 'Bảo Vệ',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Dũng sĩ canh gác sự an nguy cho dân làng.',
    ability: 'Mỗi đêm chọn 1 người để bảo vệ khỏi cú cắn của Sói. Không bảo vệ 1 người 2 đêm liên tiếp.',
    nightPriority: 6,
    iconName: 'Shield',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Không sao mà, em đây rồi!',
  },
  witch: {
    id: 'witch',
    name: 'Phù Thủy',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Bậc thầy dược liệu sở hữu 2 lọ độc dược và thuốc giải.',
    ability: 'Có 1 lọ thuốc cứu người bị Sói cắn và 1 lọ thuốc độc tiêu diệt 1 người. Mỗi lọ chỉ dùng 1 lần.',
    nightPriority: 8,
    iconName: 'Sparkles',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Hy sinh một mạng. Cứu vạn sinh linh. Sao để vẹn tình?',
  },
  hunter: {
    id: 'hunter',
    name: 'Thợ Săn',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Tay súng cừ khôi của làng.',
    ability: 'Khi bị giết bởi bất kỳ ai hoặc bị treo cổ, Thợ Săn có quyền bắn gục 1 người chết theo.',
    nightPriority: 99,
    iconName: 'Target',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Trạng chết, Chúa cũng băng hà',
  },
  elder: {
    id: 'elder',
    name: 'Già Làng',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Trưởng lão có sức sống ngoan cường.',
    ability: 'Bị Sói cắn 2 lần mới chết. Tuy nhiên nếu bị treo cổ, Phù Thủy độc hoặc Thợ Săn bắn, Già Làng chết ngay và Dân Làng mất mọi năng lực.',
    nightPriority: 99,
    iconName: 'Crown',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Kính già, già để tuổi cho',
  },
  cupid: {
    id: 'cupid',
    name: 'Thần Tình Yêu',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Vị thần gieo mầm tình yêu.',
    ability: 'Đêm đầu tiên thức dậy chọn 2 người yêu nhau. Nếu 1 trong 2 chết, người kia lập tức chết theo.',
    nightPriority: 1,
    iconName: 'Heart',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Một mũi tên trúng hai đích, một cái chết xích hai người',
  },
  fox: {
    id: 'fox',
    name: 'Cáo',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Linh thú tinh ranh dò tìm mùi hương ma sói.',
    ability: 'Mỗi đêm chọn cụm 3 người ngồi cạnh nhau. Nếu có Sói, Quản trò gật đầu. Nếu không có Sói, Cáo mất vĩnh viễn năng lực.',
    nightPriority: 9,
    iconName: 'Feather',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Ba người một hội, có tội bước ra',
  },
  piper: {
    id: 'piper',
    name: 'Người Thổi Sáo',
    team: 'neutral',
    teamName: 'Phe Thứ 3',
    description: 'Kẻ lang thang mang tiếng sáo mê hoặc.',
    ability: 'Mỗi đêm thôi miên 2 người. Khi tất cả người sống đều bị thôi miên, Người Thổi Sáo chiến thắng độc lập.',
    nightPriority: 10,
    iconName: 'Music',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    quote: 'Nhạc lên là nhảy, sáo thổi là bay!',
  },
  white_wolf: {
    id: 'white_wolf',
    name: 'Sói Trắng',
    team: 'neutral',
    teamName: 'Phe Thứ 3',
    description: 'Chúa tể Sói cô độc muốn làm bá chủ duy nhất.',
    ability: 'Thức dậy cùng đàn Sói tiêu diệt dân làng. Cách 1 đêm thức riêng 1 lần để ăn thịt 1 con Sói khác.',
    nightPriority: 5,
    iconName: 'Moon',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    quote: 'Ta là Một, là Riêng, là Thứ Nhất',
  },
  curse_wolf: {
    id: 'curse_wolf',
    name: 'Sói Nguyền',
    team: 'werewolves',
    teamName: 'Phe Ma Sói',
    description: 'Con Sói mang lời nguyền biến đổi con người.',
    ability: 'Sở hữu 1 lần duy nhất trong toàn bộ ván chơi biến nạn nhân bị Sói cắn thành Sói mới thay vì chết.',
    nightPriority: 4,
    iconName: 'Skull',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    quote: 'Thêm một người bạn, bớt một dân làng',
  },
  dire_wolf: {
    id: 'dire_wolf',
    name: 'Sói Hùm',
    team: 'werewolves',
    teamName: 'Phe Ma Sói',
    description: 'Thủ lĩnh Sói hung hãn.',
    ability: 'Khi chưa có con Sói nào trong bầy bị tiêu diệt, Sói Hùm có quyền cắn thêm 1 dân làng mỗi đêm.',
    nightPriority: 4,
    iconName: 'Zap',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    quote: 'Bầy còn nguyên vẹn, ta còn ăn đêm!',
  },
  idiot: {
    id: 'idiot',
    name: 'Thằng Ngốc',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Gã khờ khạng ngây thơ của ngôi làng.',
    ability: 'Nếu bị làng vote treo cổ, Thằng Ngốc lật bài và được tha chết. Tuy nhiên sau đó mất quyền bỏ phiếu.',
    nightPriority: 99,
    iconName: 'Smile',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Đã làm gì đâu?!! Đã chạm vào đâu?!!',
  },
  angel: {
    id: 'angel',
    name: 'Thiên Thần',
    team: 'neutral',
    teamName: 'Phe Thứ 3',
    description: 'Sứ giả thiên đình muốn được trở về trời.',
    ability: 'Nhiệm vụ duy nhất: Dụ làng vote treo cổ mình ngay trong Ngày 1. Nếu thành công, Thiên Thần thắng trận!',
    nightPriority: 99,
    iconName: 'Sparkle',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    quote: 'Treo cổ một mạng, trắng tay cả làng',
  },
  scapegoat: {
    id: 'scapegoat',
    name: 'Hình Nhân Thế Mạng',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Kẻ mang số phận hy sinh.',
    ability: 'Khi số phiếu biểu quyết treo cổ ban ngày bị hòa, Hình Nhân Thế Mạng sẽ bị đem treo cổ thay.',
    nightPriority: 99,
    iconName: 'Ghost',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Quýt làm Cam chịu!!!',
  },
  stuttering_judge: {
    id: 'stuttering_judge',
    name: 'Quan Tòa Lắp Bắp',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Thẩm phán nghiêm minh.',
    ability: 'Có quyền yêu cầu Quản trò tổ chức 2 lần biểu quyết treo cổ trong cùng 1 ngày (dùng 1 lần).',
    nightPriority: 99,
    iconName: 'Gavel',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Gấp đôi nỗi sầu',
  },
  wild_child: {
    id: 'wild_child',
    name: 'Đứa Trẻ Hoang Dã',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Đứa trẻ lớn lên cùng núi rừng. Ban đầu thuộc phe Dân Làng, không có mục tiêu riêng.',
    ability: 'Thức dậy Đêm 1 chọn 1 người làm "Mẹ nuôi". Ban đầu thuộc phe Dân Làng. Khi "Mẹ nuôi" qua đời, Đứa Trẻ Hoang Dã biến thành Ma Sói.',
    nightPriority: 1,
    iconName: 'Flame',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Đừng đụng vào Idol nhà tôi!!!',
  },
  wolf_man: {
    id: 'wolf_man',
    name: 'Người Đội Lốt Sói',
    team: 'villagers',
    teamName: 'Phe Dân Làng',
    description: 'Dân làng đặc biệt mặc bộ da sói.',
    ability: 'Ban đêm thức dậy cùng phe Ma Sói, nhưng thuộc phe Dân Làng và thắng cùng Dân Làng.',
    nightPriority: 3,
    iconName: 'Wolf',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    quote: 'Treo đầu dê, bán thịt chó',
  },
};

export const PRESET_ROLE_SETUPS: Record<number, { title: string; roles: RoleType[] }> = {
  8: {
    title: '8 Người chơi',
    roles: ['seer', 'guard', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager'],
  },
  9: {
    title: '9 Người chơi',
    roles: ['seer', 'guard', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'villager'],
  },
  10: {
    title: '10 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager'],
  },
  11: {
    title: '11 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'villager'],
  },
  12: {
    title: '12 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'villager'],
  },
  13: {
    title: '13 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'villager'],
  },
  14: {
    title: '14 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'villager'],
  },
  15: {
    title: '15 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'villager', 'villager'],
  },
  16: {
    title: '16 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'elder', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'villager', 'villager'],
  },
  17: {
    title: '17 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'elder', 'piper', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'villager', 'villager'],
  },
  18: {
    title: '18 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'elder', 'piper', 'stuttering_judge', 'angel', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'villager'],
  },
  19: {
    title: '19 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'elder', 'piper', 'stuttering_judge', 'angel', 'idiot', 'fox', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager'],
  },
  20: {
    title: '20 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'elder', 'piper', 'stuttering_judge', 'angel', 'idiot', 'wild_child', 'fox', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager'],
  },
  21: {
    title: '21 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'elder', 'piper', 'stuttering_judge', 'angel', 'idiot', 'wild_child', 'fox', 'curse_wolf', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager'],
  },
  22: {
    title: '22 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'elder', 'piper', 'stuttering_judge', 'angel', 'idiot', 'wild_child', 'fox', 'wolf_man', 'curse_wolf', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager'],
  },
  23: {
    title: '23 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'elder', 'piper', 'stuttering_judge', 'angel', 'idiot', 'wild_child', 'fox', 'wolf_man', 'white_wolf', 'curse_wolf', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager'],
  },
  24: {
    title: '24 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'elder', 'piper', 'stuttering_judge', 'angel', 'idiot', 'wild_child', 'fox', 'wolf_man', 'white_wolf', 'curse_wolf', 'scapegoat', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager'],
  },
  25: {
    title: '25 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'elder', 'piper', 'stuttering_judge', 'angel', 'idiot', 'wild_child', 'fox', 'wolf_man', 'white_wolf', 'curse_wolf', 'scapegoat', 'dire_wolf', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager'],
  },
  26: {
    title: '26 Người chơi',
    roles: ['seer', 'guard', 'hunter', 'cupid', 'witch', 'elder', 'piper', 'stuttering_judge', 'angel', 'idiot', 'wild_child', 'fox', 'wolf_man', 'white_wolf', 'curse_wolf', 'scapegoat', 'dire_wolf', 'werewolf', 'werewolf', 'werewolf', 'werewolf', 'villager', 'villager', 'villager', 'villager', 'villager'],
  },
};

export const ROLE_FUNNY_EPITHETS: Record<string, string[]> = {
  werewolf: [
    'ăn chay',
    'béo ú thích gặm xương',
    'sợ bóng tối',
    'ngủ gật',
    'sún răng',
    'suy dinh dưỡng',
    'dễ thương',
    'ốm đói',
    'chán ăn',
    'cận thị',
    'lãng tai',
  ],
  white_wolf: [
    'cô độc',
    'khoác áo đen',
    'lạnh lùng',
    'khoái ăn sang',
    'ham chơi',
    'có bộ lông đen',
  ],
  curse_wolf: [
    'hay chửi bậy',
    'sợ nước',
    'bị tiểu đường',
    'xì hơi bừa bãi',
    'lười đánh răng',
  ],
  dire_wolf: [
    'hung tợn',
    'háu ăn',
    'ốm nhách',
    'thích cảm giác mạnh',
    'gym chúa',
  ],
  seer: [
    'lú lẫn',
    'lẩn thẩn',
    'đeo kính cận',
    'báo quẻ bừa',
    'mắt mờ',
    'nhặng xị',
    'mũ đen',
  ],
  guard: [
    'mê ngủ',
    'ham ăn',
    'quên mang khiên',
    'hậu đậu',
    'hay trốn việc',
    'chuyên đi trễ',
    'mơ mộng',
  ],
  hunter: [
    'mắt lác',
    'run tay',
    'hay bắn trượt',
    'nóng tính',
    'quên nạp đạn',
    'hấp tấp',
    'thiếu ngủ',
  ],
  witch: [
    'cáu bẳn',
    'thù vặt',
    'pha nhầm thuốc',
    'mê trai',
    'vụng về',
  ],
  cupid: [
    'thích làm mai',
    'FA lâu năm',
    'hay dỗi',
    'cao to đen hôi',
    'mắt to',
  ],
  elder: [
    'lưng còng',
    'khó ngủ',
    'hay quên',
    'biết tuốt',
    'hay kể chuyện xưa',
  ],
  piper: [
    'thích thổi kèn',
    'không biết nhạc',
    'miệng rộng',
    'hay hắt hơi',
    'chuyên đánh đàn',
  ],
  fox: [
    'tinh ranh',
    'nghẹt mũi',
    'láo nháo',
    'luôn nói nho còn xanh lắm',
    'hay trộm gà',
  ],
  idiot: [
    'đẹp trai',
    'ngây ngô',
    'yêu đời',
    'tào lao',
    'khờ khạo',
  ],
  angel: [
    'không biết bay',
    'bị rụng tóc',
    'nổi loạn',
    'không có cánh',
    'mắt đen',
  ],
  wild_child: [
    'ngây thơ',
    'nghịch ngợm',
    'thích ăn kem',
    'hay khóc nhè',
    'lóc chóc',
  ],
  knight: [
    'súng nước',
    'oai vệ',
    'cưỡi heo',
    'kiếm gỗ',
    'mũ sắt',
  ],
  stuttering_judge: [
    'lắp bắp',
    'nói nhiều',
    'bịt mắt',
    'công tâm',
    'nghiêm túc',
  ],
  scapegoat: [
    'bất đắc dĩ',
    'đen đủi',
    'vai u thịt bắp',
    'sao cũng được',
    'ngơ ngác',
  ],
  villager: [
    'lông bông không nghề ngỗng gì',
    'ba phải',
    'hóng hớt',
    'thông thái',
    'sợ ma',
  ],
};

export function getRoleEpithet(role: string, seed: number = 0): string {
  const options = ROLE_FUNNY_EPITHETS[role] || ['độc đáo', 'bí ẩn', 'hài hước'];
  return options[Math.abs(seed) % options.length];
}

export function formatRoleCompositionWithEpithets(
  playersList?: Player[],
  roomRolesList?: RoleType[]
): string {
  const roles =
    playersList && playersList.length > 0
      ? playersList.map((p) => p.role)
      : roomRolesList && roomRolesList.length > 0
      ? roomRolesList
      : [];

  if (roles.length === 0) {
    return '1 tiên tri lú lẫn, 1 bảo vệ mê ngủ, 2 người dân lông bông không nghề ngỗng gì, và 2 ma sói ăn chay';
  }

  const counts: Record<string, number> = {};
  roles.forEach((r) => {
    counts[r] = (counts[r] || 0) + 1;
  });

  const parts: string[] = [];
  let seed = 0;
  for (const [role, count] of Object.entries(counts)) {
    seed++;
    const ep = getRoleEpithet(role, seed);
    if (role === 'werewolf') {
      parts.push(`${count} ma sói ${ep}`);
    } else if (role === 'white_wolf') {
      parts.push(`${count} sói trắng ${ep}`);
    } else if (role === 'curse_wolf') {
      parts.push(`${count} sói nguyền ${ep}`);
    } else if (role === 'dire_wolf') {
      parts.push(`${count} sói hùm ${ep}`);
    } else if (role === 'villager') {
      parts.push(`${count} dân làng ${ep}`);
    } else if (role === 'seer') {
      parts.push(`${count} tiên tri ${ep}`);
    } else if (role === 'hunter') {
      parts.push(`${count} thợ săn ${ep}`);
    } else if (role === 'guard') {
      parts.push(`${count} bảo vệ ${ep}`);
    } else if (role === 'witch') {
      parts.push(`${count} phù thủy ${ep}`);
    } else if (role === 'cupid') {
      parts.push(`${count} thần tình yêu ${ep}`);
    } else if (role === 'elder') {
      parts.push(`${count} già làng ${ep}`);
    } else if (role === 'piper') {
      parts.push(`${count} người thổi sáo ${ep}`);
    } else if (role === 'fox') {
      parts.push(`${count} con cáo ${ep}`);
    } else if (role === 'idiot') {
      parts.push(`${count} kẻ ngốc ${ep}`);
    } else if (role === 'angel') {
      parts.push(`${count} thiên thần ${ep}`);
    } else if (role === 'wild_child') {
      parts.push(`${count} đứa trẻ hoang dã ${ep}`);
    } else if (role === 'knight') {
      parts.push(`${count} hiệp sĩ ${ep}`);
    } else if (role === 'stuttering_judge') {
      parts.push(`${count} quan tòa ${ep}`);
    } else if (role === 'scapegoat') {
      parts.push(`${count} kẻ gánh tội ${ep}`);
    } else {
      const metaName = (ROLE_DEFINITIONS[role as RoleType]?.name || role).toLowerCase();
      parts.push(`${count} ${metaName} ${ep}`);
    }
  }

  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} và ${parts[1]}`;
  return parts.slice(0, -1).join(', ') + ', và ' + parts[parts.length - 1];
}

export const NARRATOR_SCRIPTS = {
  // Night Start options (varied by dayNumber)
  getNightStart: (dayNumber: number) => {
    if (dayNumber === 1) {
      return 'Trời đã tối, tất cả dân làng hãy nhắm mắt đi ngủ...';
    }
    const options = [
      `Màn đêm thứ ${dayNumber} đã buông xuống. Sương mù bao trùm ngôi làng, mọi người hãy đi ngủ...`,
      `Bóng tối của đêm thứ ${dayNumber} lại giăng lối. Dân làng hãy nhắm mắt chìm vào giấc ngủ...`,
      `Mặt trăng lên cao trong đêm thứ ${dayNumber}. Tiếng sói tru vang vọng. Hãy cuộn mình trong chăn ấm...`,
      `Bầu trời đêm thứ ${dayNumber} không trăng không sao. Hãy ở yên trong nhà...`,
      `Thời tiết đêm thứ ${dayNumber} thật oi bức. Hãy đóng kín cửa, mở máy lạnh cho dễ ngủ...`,
      `Đêm thứ ${dayNumber} lạnh lẽo bao trùm. Mọi nhà hãy đốt lò sưởi ấm...`,
    ];
    return options[(dayNumber - 1) % options.length];
  },
  nightStart: 'Trời đã tối, tất cả dân làng hãy nhắm mắt đi ngủ...',

  // Role Call options (varied by dayNumber)
  getCupidCall: (dayNumber: number) => {
    const ep = getRoleEpithet('cupid', dayNumber);
    const options = [
      `Thần Tình Yêu ${ep} ơi, hãy thức dậy! Chọn hai người sẽ gắn kết trái tim với nhau...`,
      `Thần Tình Yêu ${ep} hãy mở mắt ra! Hãy gieo mầm tình yêu và gắn kết duyên nợ hai người chơi...`,
    ];
    return options[(dayNumber - 1) % options.length];
  },
  cupidCall: 'Thần Tình Yêu ơi, hãy thức dậy! Chọn hai người sẽ gắn kết trái tim với nhau...',
  cupidSleep: 'Thần Tình Yêu hãy đi ngủ.',

  getWildChildCall: (dayNumber: number) => {
    return 'Đứa Trẻ Hoang Dã ơi, hãy thức dậy! Hãy chọn một người chơi làm Cha/ Mẹ Tinh Thần của bạn...';
  },
  wildChildCall: 'Đứa Trẻ Hoang Dã ơi, hãy ngồi dậy! Hãy chọn một người chơi làm Cha/ Mẹ đỡ đầu...',
  wildChildSleep: 'Đứa Trẻ Hoang Dã hãy đi ngủ.',

  getFoxCall: (dayNumber: number) => {
    return 'Con Cáo tinh ranh ơi, hãy thức dậy! Nhấp chọn 3 người chơi CÒN SỐNG bất kỳ để kiểm tra xem trong nhóm đó có Sói hay không...';
  },
  foxCall: 'Con Cáo tinh ranh ơi, mở mắt ra! Nhấp chọn 3 người chơi còn sống bất kỳ để kiểm tra xem có Sói không...',
  foxSleep: 'Con Cáo hãy đi ngủ.',

  getCurseWolfCall: (dayNumber: number) => {
    return 'Sói Nguyền ơi, mau lại đây! Bạn có muốn biến nạn nhân của đêm nay thành Sói mới hay không...';
  },
  curseWolfCall: 'Sói Nguyền ơi, hãy thức dậy! Bạn có muốn dùng lời nguyền biến nạn nhân thành Sói không...',
  curseWolfSleep: 'Sói Nguyền hãy đi ngủ.',

  getWhiteWolfCall: (dayNumber: number) => {
    return 'Sói Trắng ơi, hãy thức dậy! Đêm nay bạn có muốn tiêu diệt một con Sói khác trong bầy để trở thành bá chủ duy nhất hay không...';
  },
  whiteWolfCall: 'Sói Trắng ơi, ti hí mắt đi! Bạn có muốn chọn cắn 1 con Sói khác đêm nay không...',
  whiteWolfSleep: 'Sói Trắng hãy đi ngủ.',

  getDireWolfCall: (dayNumber: number) => {
    return 'Sói Hùm ơi, hãy thức dậy! Vì chưa có con Sói nào trong bầy bị tiêu diệt, bạn có quyền chọn cắn thêm 1 nạn nhân nữa đêm nay...';
  },
  direWolfCall: 'Sói Hùm ơi, lau nước miếng đi! Bạn có muốn chọn cắn thêm 1 dân làng đêm nay không...',
  direWolfSleep: 'Sói Hùm hãy đi ngủ.',

  getWerewolvesCall: (dayNumber: number) => {
    const ep = getRoleEpithet('werewolf', dayNumber);
    if (dayNumber === 1) {
      return `Ma Sói ${ep} ơi, hãy thức dậy! Đêm đầu tiên, hãy mở mắt nhìn nhau để nhận diện đồng bọn và thống nhất chọn con mồi đêm nay.`;
    }
    const options = [
      `Ma Sói ${ep} ơi, hãy tập hợp! Mở mắt nhìn nhau và thống nhất con mồi đêm nay...`,
      `Bóng đen Ma Sói ${ep} hãy trỗi dậy! Đã đến lúc chọn con mồi nhiều xương tiếp theo...`,
      `Những chú Sói ${ep} hãy thức giấc! Hãy chọn nạn nhân cho đêm nay...`,
      `Phe Ma Sói ${ep} hãy mở mắt ra! Hãy săn lùng con mồi trong màn đêm lạnh lẽo...`,
    ];
    return options[(dayNumber - 1) % options.length];
  },
  werewolvesCall: 'Ma Sói ơi, ra điểm danh nào! Mở mắt nhìn nhau và thống nhất con mồi đêm nay...',
  werewolvesSleep: 'Ma Sói hãy nhắm mắt đi ngủ.',

  getGuardCall: (dayNumber: number) => {
    const ep = getRoleEpithet('guard', dayNumber);
    const options = [
      `Bảo Vệ ${ep} ơi, dậy đi tuần! Hãy chọn nhà một người để đêm nay bạn canh gác...`,
      `Người Bảo Vệ ${ep} hãy vào ca trực! Đêm nay bạn muốn dang tay bảo vệ ai khỏi nanh vuốt Sói?`,
      `Bảo Vệ ${ep} hãy mở máy tính lên! Hãy bật tường lửa tâm linh để chở che cho một người trong làng...`,
    ];
    return options[(dayNumber - 1) % options.length];
  },
  guardCall: 'Bảo Vệ ơi, đến lúc hành động rồi! Tìm một người yếu đuối để chở che đêm nay...',
  guardSleep: 'Bảo Vệ hãy đi ngủ.',

  getSeerCall: (dayNumber: number) => {
    const ep = getRoleEpithet('seer', dayNumber);
    const options = [
      `Tiên Tri ${ep} ơi, hãy thức dậy! Hãy chọn một người để đoán xem có phải Ma Sói không...`,
      `Bậc Tiên Tri ${ep} hãy mở mắt ra! Hãy dùng nhãn quan thần thánh soi chiếu chân tướng của một người...`,
      `Mắt thần Tiên Tri ${ep} hãy thức giấc! Hãy khám phá bí mật xem người nào đang giấu mặt...`,
    ];
    return options[(dayNumber - 1) % options.length];
  },
  seerCall: 'Tiên Tri ơi, hãy thức dậy! Hãy chọn một người để đoán xem có phải Ma Sói không...',
  seerSleep: 'Tiên Tri hãy đi ngủ.',

  getWitchCall: (dayNumber: number) => {
    const ep = getRoleEpithet('witch', dayNumber);
    const options = [
      `Phù Thủy ${ep} ơi, hãy thức dậy! Đêm nay có người bị cắn. Bạn có muốn cứu họ hay dùng độc tiêu diệt ai không?`,
      `Phù Thủy ${ep} hãy tỉnh giấc! Mời bạn xem ai vừa bị hại và cân nhắc dùng bình thuốc bí mật...`,
      `Phù Thủy ${ep} hãy mở mắt ra! Đêm nay bình thuốc sinh tử của bạn dành cho ai?`,
    ];
    return options[(dayNumber - 1) % options.length];
  },
  witchCall: 'Phù Thủy ơi, hãy thức dậy! Đêm nay có người bị cắn. Bạn có muốn cứu họ hay dùng độc tiêu diệt ai không?',
  witchSleep: 'Phù Thủy hãy đi ngủ.',

  getPiperCall: (dayNumber: number) => {
    const ep = getRoleEpithet('piper', dayNumber);
    const options = [
      `Người Thổi Sáo ${ep} ơi, hãy thức dậy! Chọn hai người bạn muốn đưa vào giấc mộng thôi miên...`,
      `Nghệ sĩ Thổi Sáo ${ep} ơi, hãy tấu nhạc lên! Đeo tai nghe cho hai người bạn muốn đưa vào cơn mơ hoang đường...`,
      `Bậc Thầy Thổi Sáo ${ep} hãy cất tiếng nhạc! Chọn gấp hai vũ công để khiêu vũ với bầy sói...`,
    ];
    return options[(dayNumber - 1) % options.length];
  },
  piperCall: 'Người Thổi Sáo ơi, hãy thức dậy! Chọn hai người bạn muốn đưa vào giấc mộng thôi miên...',
  piperSleep: 'Người Thổi Sáo hãy đi ngủ.',

  // Waiting text for non-active players during each night step
  getWaitingMsg: (step: string, dayNumber: number) => {
    const stepMsgMap: Record<string, string[]> = {
      werewolves: [
        'Những tiếng hú rợn người vang vọng xa xa... Dân làng hãy giữ im lặng và ngủ sâu.',
        'Bóng đen vụt qua ngoài cửa sổ... Hãy nhắm mắt và giữ yên giấc ngủ.',
        'Ánh trăng tà chiếu rọi những chiếc bóng lạnh lẽo. Tất cả dân làng hãy tiếp tục ngủ.',
        'Sương đêm buông dày, gió rít qua khe cửa... Hãy nhắm mắt ngủ say.',
      ],
      seer: [
        'Một luồng năng lượng huyền bí len lỏi trong không gian... Dân làng hãy tiếp tục ngủ sâu.',
        'Màn đêm tĩnh lặng đến kỳ lạ... Hãy chìm vào giấc mộng của bạn.',
        'Ánh sao đêm lấp lánh soi tỏ vận mệnh... Mọi người hãy an tâm nghỉ ngơi.',
      ],
      guard: [
        'Tiếng bước chân âm thầm tuần tra bảo vệ làng... Mọi người hãy chìm vào giấc ngủ.',
        `Trạm gác đêm đã thiết lập. An ninh đã được tăng cường...`,
        'Bóng đêm bao phủ, hệ thống tường lửa đã được giăng lên... Hãy giữ giấc ngủ tròn.',
      ],
      cupid: [
        'Một giai điệu ngọt ngào dịu êm vang vọng... Dân làng hãy ngoan ngoãn ngủ say.',
        `Khúc nhạc tình yêu đã tấu lên... vang xa trong không gian tĩnh lặng `,
        'Sợi dây duyên nợ đang được gắn kết trong đêm... Ai ra đường vấp ngã ráng chịu.',
      ],
      witch: [
        'Mùi thảo mộc và độc dược phảng phất trong gió khuya... Dân làng hãy tiếp tục yên ngủ.',
        `Độc dược và Giải dược, hai bình thuốc thần kỳ không nhãn. Uống nhầm một ngụm thuốc, cơn say theo cả đời...`,
        'Không gian tĩnh mịch rợn người... Hãy nhắm mắt và giữ im lặng.',
      ],
      fox: [
        'Mùi hương thoang thoảng của hồ ly lướt qua trong sương đêm... Dân làng hãy tiếp tục ngủ sâu.',
        'Chiếc đuôi cáo phe phẩy ngoài thềm cửa... Hãy an tâm ngủ ngon.',
        'Đôi mắt sáng lấp lánh quan sát từ bụi cây... Dân làng hãy giữ giấc mộng đẹp.',
      ],
      wild_child: [
        'Tiếng bước chân tinh nghịch của đứa trẻ lang thang... Mọi người hãy an giấc.',
        'Một linh hồn bé nhỏ đang tìm kiếm chỗ dựa... Hãy nhắm mắt ngủ yên.',
      ],
      white_wolf: [
        'Một luồng sát khí lạnh lẽo thấu xương lướt qua trong đêm... Hãy nằm yên giữ giấc ngủ.',
        'Ánh trăng tuyết rọi bóng một kẻ săn mồi cô độc... Hãy giữ im lặng tuyệt đối.',
      ],
      curse_wolf: [
        'Lời nguyền bóng tối đang âm thầm lan tỏa trong sương mù... Hãy nhắm mắt ngủ sâu.',
        'Một luồng ma thuật hắc ám đang rình rập... Dân làng hãy ngủ yên.',
      ],
      dire_wolf: [
        'Tiếng gầm gừ trầm đục vang lên từ góc tối... Hãy cuộn tròn trong chăn.',
        'Cơn đói cồn cào của bầy dã thú đang rạo rực... Hãy nằm im đừng cử động.',
      ],
      piper: [
        'Tiếng sáo mờ ảo du dương vang lên từ hư không... Mọi người hãy chìm sâu vào giấc mộng.',
        `Bản hoà tấu Tiếu ngạo đang réo rắt giữa đêm. Dân làng hãy nhắm mắt thấy mùa hè, chớ mở mắt tháy mùa đông...`,
        'Giai điệu mê hoặc lan tỏa trong sương đêm... Hãy nghỉ ngơi an lành.',
      ],
    };

    const options = stepMsgMap[step] || [
      'Vui lòng giữ im lặng và nhắm mắt đi ngủ...',
      'Đêm đã về khuya, hãy chìm vào giấc ngủ ngon...',
      'Trời đã tối, xin tắt đèn đi ngủ...',
      'Hãy lẩm nhẩm đếm cừu cho dễ ngủ, đừng ồn ào làm ảnh hưởng đến hàng xóm...',
      'Trong đêm thanh vắng, mọi tiếng động đều vang rất xa. Hãy nằm im đừng cử động mạnh...',
      'Màn đêm tĩnh mịch, mọi người hãy an tâm nghỉ ngơi...',
    ];

    return options[(dayNumber - 1 + step.length) % options.length];
  },

  dayStart: 'Trời đã sáng rồi! Tất cả dân làng hãy thức dậy...',
  noDeaths: 'Đêm qua không có bất cứ án mạng nào xảy ra.',
  victimAnnounce: (namesWithReasons: string, count: number = 1) =>
    `Đêm qua, đã có ${count === 1 ? '1 người dân' : `${count} người dân`} bị thiệt mạng: ${namesWithReasons}. Xin chia buồn và mời các nạn nhân di chuyển vào nhóm chat Tâm linh.`,
  discussionPrompt: (minutes?: number) =>
    minutes
      ? `Mời toàn thể dân làng tích cực thảo luận bằng cách gõ chữ vào ô chat, hoặc ghi âm trực tiếp. Thời gian thảo luận tối đa là ${minutes} phút.`
      : 'Mời toàn thể dân làng tích cực thảo luận bằng cách gõ chữ vào ô chat, hoặc ghi âm trực tiếp.',
  votingPrompt:
    'Đã hết giờ bàn luận. Tất cả dân làng hãy tiến hành bỏ phiếu bầu chọn người nghi ngờ là Ma Sói!',
  topVotedAnnounce: (name: string, votes: number, totalPlayers?: number) =>
    totalPlayers
      ? `Nhân vật nhận được nhiều phiếu bầu chọn nhất là ${name} với ${votes}/${totalPlayers} phiếu bầu. Người này đang bị nghi ngờ gây nguy hại cho cộng đồng và có thời gian tự bào chữa!`
      : `Nhân vật nhận được nhiều phiếu bầu chọn nhất là ${name} với ${votes} phiếu bầu. Người này đang bị nghi ngờ gây nguy hại cho cộng đồng và có thời gian tự bào chữa!`,
  defensePrompt: (name: string, votes?: number, totalPlayers?: number) => {
    if (votes !== undefined && votes > 0 && totalPlayers !== undefined) {
      return `Người bị nghi ngờ nhiều nhất là ${name}, với ${votes} trên ${totalPlayers} phiếu bầu. Bạn có thời gian để tự bào chữa trước dân làng!`;
    }
    if (votes !== undefined && votes > 0) {
      return `Người bị nghi ngờ nhiều nhất là ${name}, với ${votes} phiếu bầu. Bạn có thời gian để tự bào chữa trước dân làng!`;
    }
    return `Người bị nghi ngờ nhiều nhất là ${name}. Bạn có thời gian để tự bào chữa trước dân làng!`;
  },
  verdictPrompt:
    'Dân làng hãy đưa ra biểu quyết lần 2: Treo cổ hay Tha bổng cho người bị nghi ngờ!',
  executedAnnounce: (name: string) =>
    `Kết quả biểu quyết lần 2: Làng đã quyết định treo cổ ${name}. Nạn nhân ${name} đã di chuyển vào nhóm chat Tâm linh.`,
  savedAnnounce: (name: string) =>
    `Kết quả biểu quyết lần 2: Dân làng đã quyết định bao dung và cứu sống ${name}!`,
  dayEndPrompt:
    'Một ngày mệt mỏi đã trôi qua. Chúc dân làng nghỉ ngơi an lành. Hãy tắt đèn và đi ngủ thôi...',
  victoryAnnounce: (w: string) => `Trò chơi kết thúc! ${w}`,
};

export const BOT_NAMES = [
  'Bot Linh', 'Bot Ân', 'Bot Khôi', 'Bot Trang', 'Bot Chi',
  'Bot Quang', 'Bot Nhật', 'Bot Vân', 'Bot Tùng', 'Bot Thuỷ',
  'Bot Đức', 'Bot Minh', 'Bot Hùng', 'Bot Hiền', 'Bot Hân',
  'Bot Huệ', 'Bot Long', 'Bot Anh', 'Bot Nam', 'Bot Gia',
  'Bot Lâm', 'Bot Yến', 'Bot Huế', 'Bot Phúc', 'Bot Thơ'
];

export function getUniqueBotNames(existingPlayers: { name: string }[], countNeeded: number): string[] {
  const usedNames = new Set(existingPlayers.map((p) => p.name.trim().toLowerCase()));
  const available = BOT_NAMES.filter((name) => !usedNames.has(name.toLowerCase()));

  // Randomize available names so bot selections are varied across games
  const shuffled = [...available].sort(() => Math.random() - 0.5);

  const result: string[] = [];
  for (let i = 0; i < countNeeded; i++) {
    if (i < shuffled.length) {
      result.push(shuffled[i]);
      usedNames.add(shuffled[i].toLowerCase());
    } else {
      const baseName = BOT_NAMES[i % BOT_NAMES.length];
      let suffix = 2;
      let candidate = `${baseName} ${suffix}`;
      while (usedNames.has(candidate.toLowerCase())) {
        suffix++;
        candidate = `${baseName} ${suffix}`;
      }
      result.push(candidate);
      usedNames.add(candidate.toLowerCase());
    }
  }
  return result;
}
