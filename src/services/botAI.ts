import { Player, NightActionRecord, RoleType } from '../types';

export interface BotChatMessageQueueItem {
  botId: string;
  botName: string;
  content: string;
  delayMs: number;
}

// ----------------------------------------------------
// 💬 DIALOGUE REPOSITORY FOR BOTS (10+ Lines per Role/Context)
// ----------------------------------------------------

/** 1. Tiên Tri chỉ điểm Ma Sói (12 câu đa dạng từ ẩn ý đến dứt khoát) */
export const SEER_WOLF_ACCUSATIONS = [
  (target: string) => `Đêm qua tôi mơ thấy ${target} hóa Sói!`,
  (target: string) => `Trực giác mách bảo tôi ${target} không phải dân lành.`,
  (target: string) => `Tôi đã thấy năng lượng xấu toả ra từ ${target}.`,
  (target: string) => `Hành tung của ${target} hoàn toàn trùng khớp với loài Sói!`,
  (target: string) => `Tôi cảm nhận được sát khí từ ${target}. Mọi người hãy cùng nhau dồn phiếu trừ họa!`,
  (target: string) => `Tôi được cô Hằng nhắn rằng ${target} có móng vuốt và nanh nhọn!`,
  (target: string) => `Tôi dám cược cả mạng sống rằng ${target} chính là Ma Sói đang trà trộn!`,
  (target: string) => `Trợ lý AI của tôi báo rằng, tối qua ${target} đã rời khỏi nhà. Anh em hãy xem xét kỹ người này!`,
  (target: string) => `Đừng tin lời ${target} ngụy biện!`,
  (target: string) => `${target} là kẻ thù của phe Dân Làng! Hãy vote ngay!`,
  (target: string) => `Hôm nay nhất quyết phải đưa ${target} lên giàn!`,
  (target: string) => `Cái kiểu nói chuyện của ${target} rất đáng ngờ`,
];

/** 2. Tiên Tri bảo vệ / xác nhận Dân Làng tốt (10 câu) */
export const SEER_VILLAGER_ENDORSEMENTS = [
  (target: string) => `${target} hoàn toàn trong sạch, chúng ta không nên nghi ngờ oan cho người tốt nhé!`,
  (target: string) => `Cách nói chuyện của ${target} chứng tỏ là người tử tế, không thể là Sói được.`,
  (target: string) => `Tôi biết ${target} luôn đứng về phe Dân Làng, hãy cùng nhau bảo vệ người này!`,
  (target: string) => `${target} đêm qua chỉ ở yên trên giường, chắc chắn 100% không phải là Sói đâu!`,
  (target: string) => `Tôi đã kiểm tra thông tin ${target} trên internet. Người này vô tội.`,
  (target: string) => `Hãy gạch tên ${target} khỏi danh sách tình nghi, đây là đồng minh của chúng ta!`,
  (target: string) => `Trợ lý AI đã xác nhận ${target} là người tốt.`,
  (target: string) => `${target} đã chứng minh sự trong sạch rồi. Mọi người hãy cùng đoàn kết!`,
  (target: string) => `Tôi cam đoan ${target} không có nanh vuốt nào cả, hãy để họ tiếp tục cống hiến cho làng!`,
  (target: string) => `Tôi thấy hào quang phát ra từ ${target}, người anh em này là 1 thiên thần!`,
];

/** 3. Ma Sói tự bào chữa / chối tội khi bị nghi ngờ (12 câu) */
export const WOLF_SELF_DEFENSES = [
  `Ơ kìa sao lại vu oan cho tôi? Tôi là dân làng chăm chỉ mà! Đừng để bị dắt mũi!`,
  `Mọi người đừng nghe lời xúi giục, tôi thề tôi là phe Làng 100%! Có khi người tố cáo mới là Sói giả danh!`,
  `Đêm qua tôi ngủ ngoan ở nhà, sao cứ nhắm vào tôi vậy? Hãy nhìn những người ít nói kìa!`,
  `Tôi mà là Sói thì tôi nhận luôn rồi! Đừng để phe Sói thật giật dây chia rẽ làng ta!`,
  `Bằng chứng đâu mà dám bảo tôi là Sói? Đừng suy đoán vô căn cứ rồi giết oan dân tốt!`,
  `Cứ ai nói nhiều hoặc chơi hay là bị nghi là Sói à? Làng mình suy luận kỳ quặc thật sự!`,
  `Tôi cống hiến cho làng từ đầu tới giờ mà bị nghi ngờ thế này, buồn thật sự đấy!`,
  `Nếu tôi chết thì phe Làng sẽ mất đi một phiếu cực kỳ quan trọng, hãy suy nghĩ cho kỹ!`,
  `Tôi nghi ngờ người vừa chỉ điểm tôi mới chính là Sói đang cố tình tạo danh tiếng ảo!`,
  `Đêm nay Tiên tri cứ soi tôi thoải mái đi, đừng vội treo cổ tôi ban ngày kẻo hối hận!`,
  `Treo cổ tôi là trúng kế của bầy Sói thật đấy, xin mọi người hãy tỉnh táo lại!`,
  `Tôi mà là Sói thì đã chọn cắn bạn rồi!`,
  `Có Sói nào mà đẹp trai như tôi không?`,
  `Vote ai cũng được, xin đừng vote tôi`,
  `Con Sói có mấy chân tôi còn không biết. Sao lại bảo tôi là Sói!`,
  `Dĩ hoà vi quý, cứu một người hơn giết một người`,
  `Tối qua tôi chỉ đem hoa đến đặt ở gốc cây 55 thôi.`,
  `Tôi không biết ai là Sói, ai là dân. Chỉ biết tôi vô can.`,
  `Tôi là người lương thiện, không hề làm điều gì khuất tất!`,
  `Tôi bị sâu răng, làm sao lại là Sói được`,
  `Tôi ăn chay trường, không thích gặm xương. Sói gì mà Sói. Tào lao hết sức.`,
];

/** 4. Ma Sói đồng bọn đánh lạc hướng sang người khác (12 câu) */
export const WOLF_DEFLECTIONS = [
  (target: string, accused: string) => `Tôi thấy ${accused} nói có lý đấy, đừng vội kết tội khi chưa có bằng chứng xác thực.`,
  (target: string, accused: string) => `Tôi lại thấy ${target} có vẻ đáng ngờ hơn nhiều, cứ im im quan sát từ đầu tới giờ!`,
  (target: string, accused: string) => `Mọi người bình tĩnh đã, vội vàng dồn phiếu vào ${accused} là trúng bẫy của Sói đấy!`,
  (target: string, accused: string) => `Sao không ai nghi ngờ ${target} nhỉ? Hành tung của hắn từ sáng tới giờ rất mờ ám!`,
  (target: string, accused: string) => `Cứ dồn hết vào một người thế này rất dễ bị Sói điều hướng, hãy xem xét lại ${target}!`,
  (target: string, accused: string) => `Tôi thấy ${accused} phản ứng rất chân thật, người đáng nghi nhất phải là ${target} kia kìa!`,
  (target: string, accused: string) => `Đừng để kẻ giấu mặt dẫn dắt, tôi có cảm giác ${target} mới là kẻ chủ mưu sau lưng!`,
  (target: string, accused: string) => `Tự nhiên quay xe dồn vào ${accused} thấy cấn cấn sao á, tôi vẫn nghi ${target} hơn!`,
  (target: string, accused: string) => `Hãy cẩn thận kẻo giết nhầm người tốt, nhìn thái độ của ${target} mới thấy gian manh!`,
  (target: string, accused: string) => `Phe Làng nên thay đổi góc nhìn, đừng chăm chăm vào ${accused} mà bỏ lọt ${target}!`,
  (target: string, accused: string) => `Tôi tin ${accused} vô tội, ${target} mới là người có nhiều điểm bất minh cần chất vấn!`,
  (target: string, accused: string) => `Có ai để ý ${target} nãy giờ không đưa ra được lập luận nào rõ ràng không?`,
];

/** 5. Ma Sói giả vờ nhiệt tình phân tích cùng Dân Làng (10 câu) */
export const WOLF_PRETEND_DISCUSSIONS = [
  `Hôm nay làng mình phải đồng lòng tìm ra con Sói đầu đàn, không thể để chúng lộng hành nữa!`,
  `Đêm qua thật may mắn khi không có quá nhiều thương vong, hôm nay phải diệt Sói trả thù!`,
  `Tôi để ý thấy một vài người vote rất bất thường hôm qua, chúng ta cần mổ xẻ kỹ!`,
  `Anh em phe Làng giữ bình tĩnh nhé, chúng ta còn nhiều thời gian để phân tích logic!`,
  `Mỗi lá phiếu hôm nay đều quyết định vận mệnh của ngôi làng, hãy cân nhắc thật kỹ!`,
  `Ai có thông tin gì hữu ích thì lên tiếng đi, đừng giấu kín làm Sói hưởng lợi!`,
  `Tôi ủng hộ việc vote những ai có biểu hiện gian dối, không thể nhân nhượng được!`,
  `Phe Sói chắc chắn đang ẩn nấp rất sâu, chúng ta phải quan sát từng cử chỉ nhỏ nhất!`,
  `Nếu ai đó là vai trò đặc biệt thì hãy cân nhắc thời điểm vàng để dẫn dắt dân làng nhé!`,
  `Quyết tâm hôm nay phải đưa được ít nhất một con Sói lên giàn thiêu!`,
];

/** 6. Bảo Vệ thảo luận / định hướng bảo vệ (10 câu) */
export const GUARD_DISCUSSIONS = [
  `Mọi người cứ yên tâm thảo luận, chiếc khiên thần của bảo vệ vẫn luôn sẵn sàng trong đêm!`,
  `Những người có chức năng quan trọng cứ mạnh dạn lên tiếng, làng ta sẽ bảo vệ các bạn!`,
  `Hệ thống tường lửa của làng ta mạnh lắm, Sói không thể dễ dàng nuốt chửng chúng ta đâu!`,
  `Đừng hoang mang, chỉ cần tìm đúng mục tiêu thì đêm nay Sói sẽ không còn cơ hội trở mình!`,
  `Những ai đang giữ trọng trách hãy bình tĩnh, chúng ta luôn có hậu phương vững chắc!`,
  `Làng mình hãy giữ vững đội hình, đừng để Sói chia rẽ các vai trò then chốt!`,
  `Đêm nay chắc chắn sẽ là một đêm căng thẳng, hãy cùng nhau loại bỏ bớt hiểm họa ban ngày!`,
  `Tôi có niềm tin mãnh liệt vào chính nghĩa của Dân Làng, hôm nay vote thật chuẩn xác nhé!`,
  `Sói đang sợ hãi sự đoàn kết của chúng ta đấy, cùng nhau dồn phiếu nào anh em!`,
  `Nắm tay nhau, cùng bước bên nhau, vì hạnh phúc nhân loại`,
  `Một ngày mới là một cơ hội mới, hãy triệt hạ móng vuốt của loài sói ngay trong hôm nay!`,
];

/** 7. Phù Thủy thảo luận / phân tích tình hình đêm (10 câu) */
export const WITCH_DISCUSSIONS = [
  `Độc dược và giẩi dược đều là con dao hai lưỡi, phù thuỷ cần tính toán thật tỉnh táo!`,
  `Đêm qua làng ta đã trải qua nhiều biến động khó lường, hôm nay phải tìm ra kẻ chủ mưu!`,
  `Nếu Sói còn hung hăng thì sớm muộn cũng sẽ nếm mùi độc dược cay đắng thôi!`,
  `Tôi linh cảm đêm nay sẽ có kẻ phải trả giá đắt cho tội ác của mình!`,
  `Mỗi mạng sống của phe Làng đều vô cùng quý giá, đừng vội vàng đưa ra quyết định sai lầm!`,
  `Hãy để ý những ai đổi giọng bất thường sau mỗi đêm, đó là dấu hiệu của quỷ dữ!`,
  `Hôm nay làng hãy vote dứt khoát người đáng nghi nhất, đừng để đêm xuống lại chịu tổn thất!`,
  `Bình thuốc của công lý vẫn còn đó, phe Sói chớ vội mừng thầm!`,
  `Thảo luận kỹ lưỡng đi nào mọi người, cái giá của sự bất cẩn ban ngày là rất đắt!`,
  `Tôi đang xâu chuỗi lại các sự kiện từ đầu trận, có nhiều điểm rất đáng ngờ ở một số người!`,
];

/** 8. Thợ Săn răn đe / tuyên bố đanh thép (10 câu) */
export const HUNTER_DISCUSSIONS = [
  `Họng súng của tôi luôn nạp sẵn đạn!`,
  `Tôi khuyên các bạn cân nhắc kỹ, đừng vote bừa. Mạng đổi mạng đấy!`,
  `Nếu tôi có mệnh hệ gì, viên đạn cuối cùng chắc chắn sẽ găm thẳng vào người hại tôi!`,
  `Làng cứ mạnh dạn biểu quyết, có tôi bọc lót thì không việc gì phải sợ hãi bầy Sói!`,
  `Ai là Sói thì tự biết điều đi, đừng để tôi phải chịu tội oan!`,
  `Tôi đã ghim sẵn một vài đối tượng rồi, liệu mà tránh tôi ra!`,
  `Một phát súng công lý sẽ giải quyết tất cả nếu tôi bị đẩy vào chân tường!`,
  `Đụng vào tôi là xác định đi tong một mạng, đừng có dại dột thử lửa!`,
  `Cứ thảo luận thoải mái đi anh em, miễn đừng vote tôi!`,
  `Hại tôi thì các bạn cũng sẽ phải trả giá đắt`,
  `Thợ săn tôi đây không ngán ai đâu!`,
];

/** 9. Già Làng khuyên răn / kinh nghiệm từng trải (10 câu) */
export const ELDER_DISCUSSIONS = [
  `Các con hãy bình tĩnh, người già này đã chứng kiến nhiều mưu hèn kế bẩn của loài Sói rồi!`,
  `Đừng nóng vội treo cổ ai khi chưa rõ ràng, giết ta, làng sẽ mất hết quyền năng đấy!`,
  `Lắng nghe từng lời nói cho kỹ, kẻ hay hùa theo đám đông thường là Sói đang ẩn mình!`,
  `Sự đoàn kết là vũ khí mạnh nhất của chúng ta, đừng để sự nghi kị làm tan rã ngôi làng!`,
  `Hãy suy xét bằng cái đầu lạnh, đừng để cảm xúc nhất thời biến chúng ta thành công cụ của Sói!`,
  `Kinh nghiệm của ta cho thấy những kẻ hung hăng nhất ban ngày thường có điều cần che giấu!`,
  `Ta tin tưởng vào trí tuệ của thế hệ trẻ trong làng, hãy chọn lọc thông tin thật thông thái!`,
  `Còn nhớ ba mươi năm trước, làng cũng rơi vào tình huống ngặt nghèo này`,
  `Một quyết định sai lầm hôm nay có thể khiến cả ngôi làng chìm trong bóng tối vĩnh hằng!`,
  `Cứ phân tích từ từ, chân lý luôn thuộc về những người kiên định và chính trực!`,
  `Hãy giữ vững niềm tin, phe Dân Làng nhất định sẽ vượt qua kiếp nạn này!`,
];

/** 10. Kẻ Thế Mạng lo sợ hòa phiếu (10 câu) */
export const SCAPEGOAT_DISCUSSIONS = [
  `Xin mọi người vote dứt khoát giùm, đừng để HÒA PHIẾU kẻo tôi lại phải chết oan mạng!`,
  `Anh em bỏ phiếu tập trung vào một người thôi nhé, hòa phiếu là tôi gánh hết tội đấy hu hu!`,
  `Tôi không muốn làm kẻ thế mạng đâu, xin hãy cân nhắc kỹ đừng để phiếu bằng nhau!`,
  `Làng mình làm ơn thống nhất ý kiến đi, tôi sợ cảnh hòa phiếu lắm rồi!`,
  `Quýt làm Cam chịu`,
  `Tôi là người lương thiện mà, đừng cướp đi sinh mạng của tôi!`,
  `Hãy vote có trách nhiệm nào mọi người, đừng phân vân 50/50 nguy hiểm lắm!`,
  `Xin đừng để số phận tôi kết thúc chỉ vì sự thiếu quyết đoán của cả làng!`,
  `Tôi xin các bạn đấy, chọn một người đáng nghi nhất mà vote thôi, đừng chia phe nữa!`,
  `Mỗi lần đến giờ vote là tim tôi đập thình thịch, nhớ đừng để kết quả hòa nhé!`,
];

/** 11. Thằng Ngốc trêu đùa / ngây ngô (10 câu) */
export const IDIOT_DISCUSSIONS = [
  `Ủa alo mọi người đang bàn gì vui thế? Có đồ ăn ngon không cho tôi một phần với!`,
  `Ai là Sói thì giơ tay lên cho nhanh nào, chứ bàn tán hoài mỏi mồm quá đi à!`,
  `Tôi thấy ai cũng đẹp trai xinh gái hết á, hay là hôm nay mình đừng vote ai được hông?`,
  `Hahaha nhìn mặt ai cũng căng thẳng như chuẩn bị thi đại học vậy trời!`,
  `Cứ vote tôi thử xem!`,
  `Tôi chả hiểu gì hết nhưng thấy mọi người vote ai là tôi vote theo cho vui nè!`,
  `Đêm qua tôi mơ thấy Sói hiền lành xinh gái lắm!`,
  `Đừng nhìn tôi bằng ánh mắt hình viên đạn thế chứ, tôi vô hại nhất làng này luôn á!`,
  `Vote nhanh rồi đi ngủ nào, thức khuya bàn chuyện làm mắt tôi thâm quầng hết rồi!`,
  `Sói ơi Sói à, ra đây chơi ú oà với tôi nè, trốn kỹ quá ai mà tìm được!`,
];

/** 12. Thần Tình Yêu & Cặp Đôi bảo vệ nhau (10 câu) */
export const CUPID_LOVERS_DISCUSSIONS = [
  `Tôi là thần tình yêu mà!`,
  `Dù là Dân hay Sói, tình yêu chân chính sẽ vượt qua mọi ranh giới và hiểm nguy!`,
  `Tôi cảm nhận được sợi tơ hồng thiêng liêng đang che chở cho những con người chung thủy!`,
  `Xin mọi người hãy sáng suốt, đừng chia rẽ những người sinh ra để dành cho nhau!`,
  `Chúng ta phải sống sót đến cùng, tình yêu sẽ dẫn lối đến chiến thắng vinh quang!`,
  `Nếu một người ngã xuống thì người kia cũng không thiết sống nữa, xin hãy nương tay!`,
  `Trái tim tôi mách bảo phải tin tưởng tuyệt đối vào người bạn đời của mình!`,
  `Hãy cùng nhau dọn sạch mọi hiểm họa để xây dựng lại một ngôi làng yên bình!`,
  `Sức mạnh của tình yêu có thể đánh bại bất kỳ thế lực hắc ám nào trong đêm tối!`,
  `Chúng ta hãy kề vai sát cánh bảo vệ nhau đến hơi thở cuối cùng!`,
];

/** 13. Thiên Thần (Angel - 12 câu kích thích treo cổ Ngày 1 và tạo kịch tính) */
export const ANGEL_DISCUSSIONS = [
  `Tôi thấy mình rất đáng ngờ nè, hay là hôm nay cả làng cứ vote treo cổ tôi đi!`,
  `Nếu không biết vote ai thì cứ dồn hết phiếu vào tôi này, tôi không ngại đâu!`,
  `Cứ đưa tôi lên giàn thiêu thử xem, biết đâu làng sẽ có một bất ngờ cực lớn đấy!`,
  `Tôi chấp nhận hy sinh làm vật tế cho ngày đầu tiên, ai dám vote tôi nào?`,
  `Nhìn mặt tôi gian xảo thế này mà không ai nghi ngờ à? Vote tôi ngay đi chứ!`,
  `Tôi nghi ngờ chính bản thân mình nhất, mọi người hãy đồng lòng vote tôi đi!`,
  `Đừng chần chừ nữa, tôi xung phong lên giàn thiêu hôm nay!`,
  `Treo cổ tôi là quyết định sáng suốt nhất ngày hôm nay đó, thử đi rồi biết!`,
  `Hôm nay mà tôi không lên giàn thì thật là một thiếu sót lớn của làng ta!`,
  `Tôi xin nhận hết mọi tội lỗi về mình, mau mau cho tôi một vé về trời nào!`,
  `Ai dũng cảm thì cứ vote tôi một phiếu, đảm bảo ván này kết thúc trong ngỡ ngàng!`,
  `Đêm qua chính tôi dắt bầy sói vào làng cắn người!`,
];

/** 14. Dân Làng hưởng ứng dồn phiếu theo Tiên Tri / manh mối (12 câu) */
export const VILLAGER_AGREE_MESSAGES = [
  (target: string) => `Nếu đã có linh cảm rõ ràng thế này thì làng mình nên dồn phiếu vào ${target} thử xem sao!`,
  (target: string) => `Tôi cũng thấy ${target} hôm nay có vẻ bất an và đáng ngờ, đồng ý dồn phiếu!`,
  (target: string) => `Tin tưởng vào trực giác của người dẫn dắt, hôm nay quyết tâm diệt Sói ${target}!`,
  (target: string) => `Lập luận rất sắc bén và hợp lý, tôi theo làng vote ${target} một phiếu!`,
  (target: string) => `Chuẩn luôn, ${target} nãy giờ chối quanh co không giải thích được gì, dồn phiếu thôi!`,
  (target: string) => `Đã có manh mối rõ ràng, đừng chần chừ nữa, vote ${target}!`,
  (target: string) => `Anh em đồng lòng dồn hết phiếu vào ${target} đi, không để Sói thoát được!`,
  (target: string) => `Tôi tin vào sự thật và công lý, một phiếu đanh thép dành cho ${target}!`,
  (target: string) => `Không còn nghi ngờ gì nữa, thái độ của ${target} đã bán đứng hắn, vote ngay!`,
  (target: string) => `Quyết định sáng suốt nhất ngày hôm nay là loại bỏ ${target}, mọi người theo tôi!`,
  (target: string) => `Vì tương lai của làng, hãy bỏ phiếu vào ${target}!`,
  (target: string) => `Tôi đã sẵn sàng lá phiếu của mình để tống khứ ${target} lên giàn thiêu!`,
];

/** 14. Hội thoại mở màn ban ngày chung (15 câu) */
export const GENERAL_DAY_DISCUSSIONS = [
  `Hôm nay chúng ta cần thảo luận thật kỹ, đừng để phí mất lá phiếu quý giá!`,
  `Đêm qua thật kinh hoàng... Lũ Sói ngày càng lộng hành và táo tợn rồi!`,
  `Mọi người hãy lên tiếng đi, ai im lặng nhất thường là Sói ẩn mình đấy!`,
  `Dân làng chúng ta cần đoàn kết lại, không được nghi kị lẫn nhau!`,
  `Hôm nay các huynh đệ có manh mối hay linh cảm gì đặc biệt không, chia sẻ cho làng với!`,
  `Thời gian không còn nhiều, chúng ta phải tập trung phân tích những người khả nghi nhất!`,
  `Mỗi mạng người ngã xuống là một bài học đắt giá, hôm nay phải bắt Sói đền tội!`,
  `Hãy quan sát kỹ từng lượt vote và phát ngôn từ các ngày trước để tìm ra quy luật!`,
  `Tôi tin rằng ánh sáng công lý sẽ sớm xua tan bóng tối u ám của bầy Sói!`,
  `Đừng để những lời ngụy biện làm lung lạc ý chí, hãy tin vào logic và chứng cứ!`,
  `Cuộc chơi đang bước vào giai đoạn then chốt, một sai lầm nhỏ cũng có thể khiến chúng ta thua cuộc!`,
  `Hỡi những người con của làng, hãy cùng nhau đứng lên bảo vệ mái ấm của chúng ta!`,
  `Bằng hữu nào có vai trò đặc biệt, hãy cân nhắc dẫn dắt làng đúng thời điểm nhé!`,
  `Càng về cuối trận Sói càng tinh vi, mọi người tuyệt đối không được chủ quan!`,
  `Đêm qua tôi ngủ không ngon, nên xin phép không bàn luận gì!`,
  `Tôi không muốn treo cổ ai cả!`,
  `Sói thường có mắt to!`,
  `Cẩn thận với thế lực thù địch nhé!`,
  `Cần nhận diện rõ luận điệu nguỵ biện và vu cáo nhé`,
  `Sao không sống hòa ái, mà cứ phải tìm cách treo cổ nhau!`,
  `Thà giết nhầm còn hơn bỏ sót! Tăng lượt Vote mỗi ngày đi.`,
  `Hãy bỏ phiếu bằng cả lý trí và lương tâm để đưa làng ta đến bến bờ chiến thắng!`,
];

// ----------------------------------------------------
// 🎯 SMART TARGET SELECTION LOGIC
// ----------------------------------------------------

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
    (p) => p.team !== 'werewolves' && !p.role.includes('wolf') && p.isAlive
  );
  if (aliveNonWolves.length === 0) return null;

  // Check all werewolf bite actions tonight
  const tonightWolfBites = actions.filter(
    (a) => a.actionType === 'wolf_bite' && a.dayNumber === dayNumber && a.targetId
  );

  if (tonightWolfBites.length > 0) {
    // Count votes among wolves
    const voteCounts: Record<string, number> = {};
    tonightWolfBites.forEach((wb) => {
      if (wb.targetId && aliveNonWolves.some((p) => p.id === wb.targetId)) {
        voteCounts[wb.targetId] = (voteCounts[wb.targetId] || 0) + 1;
      }
    });

    // Find the target with most votes
    let topTargetId: string | null = null;
    let maxVotes = 0;
    Object.entries(voteCounts).forEach(([tId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        topTargetId = tId;
      }
    });

    if (topTargetId) {
      const topTarget = aliveNonWolves.find((p) => p.id === topTargetId);
      if (topTarget) return topTarget;
    }
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
 * Implements subtle Seer reveals, Wolf counter-arguments, role-specific comments, and Village chatter.
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

  // 1. Seer Bot Intelligence & Reveal
  if (seerBot) {
    const { foundWolves, foundVillagers } = getSeerKnowledge(seerBot.id, players, actions);
    const aliveFoundWolves = foundWolves.filter((w) => w.isAlive);
    const aliveFoundVillagers = foundVillagers.filter((v) => v.isAlive);

    if (aliveFoundWolves.length > 0) {
      // Pick the discovered wolf to point out
      targetedWolfBySeer = aliveFoundWolves[0];
      const template = SEER_WOLF_ACCUSATIONS[Math.floor(Math.random() * SEER_WOLF_ACCUSATIONS.length)];
      queue.push({
        botId: seerBot.id,
        botName: seerBot.name,
        content: template(targetedWolfBySeer.name),
        delayMs: 2500 + Math.floor(Math.random() * 2000),
      });
    } else if (aliveFoundVillagers.length > 0 && Math.random() < 0.75) {
      // Point out a verified good villager
      const goodP = aliveFoundVillagers[Math.floor(Math.random() * aliveFoundVillagers.length)];
      const template = SEER_VILLAGER_ENDORSEMENTS[Math.floor(Math.random() * SEER_VILLAGER_ENDORSEMENTS.length)];
      queue.push({
        botId: seerBot.id,
        botName: seerBot.name,
        content: template(goodP.name),
        delayMs: 3000 + Math.floor(Math.random() * 2000),
      });
    }
  }

  // 2. Wolf Bot Defense / Deflection if accused
  if (targetedWolfBySeer && targetedWolfBySeer.isBot && targetedWolfBySeer.isAlive) {
    const defenseMsg = WOLF_SELF_DEFENSES[Math.floor(Math.random() * WOLF_SELF_DEFENSES.length)];
    queue.push({
      botId: targetedWolfBySeer.id,
      botName: targetedWolfBySeer.name,
      content: defenseMsg,
      delayMs: 6500 + Math.floor(Math.random() * 2000),
    });

    // Fellow wolf might deflect
    const otherWolfBot = aliveBots.find(
      (p) =>
        p.id !== targetedWolfBySeer?.id &&
        (p.team === 'werewolves' || p.role.includes('wolf'))
    );
    if (otherWolfBot && Math.random() < 0.7) {
      const aliveNonWolves = players.filter(
        (p) => p.isAlive && p.team !== 'werewolves' && !p.role.includes('wolf')
      );
      const scapegoatCandidate = aliveNonWolves[Math.floor(Math.random() * aliveNonWolves.length)];
      const deflectionFn = WOLF_DEFLECTIONS[Math.floor(Math.random() * WOLF_DEFLECTIONS.length)];
      queue.push({
        botId: otherWolfBot.id,
        botName: otherWolfBot.name,
        content: deflectionFn(scapegoatCandidate ? scapegoatCandidate.name : 'người khác', targetedWolfBySeer.name),
        delayMs: 10500 + Math.floor(Math.random() * 2500),
      });
    }
  }

  // 3. Other alive bots chime in with role-specific or general comments
  const otherBots = aliveBots.filter(
    (p) => p.id !== seerBot?.id && p.id !== targetedWolfBySeer?.id
  );

  otherBots.forEach((b, index) => {
    if (Math.random() > 0.85 && otherBots.length > 2) return; // Keep chat natural, not flooded

    let msgContent = '';
    const delay = 4000 + (index + 1) * 3500 + Math.floor(Math.random() * 2000);

    if (targetedWolfBySeer && b.team === 'villagers' && Math.random() < 0.7) {
      const agreeFn = VILLAGER_AGREE_MESSAGES[Math.floor(Math.random() * VILLAGER_AGREE_MESSAGES.length)];
      msgContent = agreeFn(targetedWolfBySeer.name);
    } else {
      // Role-specific ambient chatter
      switch (b.role) {
        case 'guard':
          msgContent = GUARD_DISCUSSIONS[Math.floor(Math.random() * GUARD_DISCUSSIONS.length)];
          break;
        case 'witch':
          msgContent = WITCH_DISCUSSIONS[Math.floor(Math.random() * WITCH_DISCUSSIONS.length)];
          break;
        case 'hunter':
          msgContent = HUNTER_DISCUSSIONS[Math.floor(Math.random() * HUNTER_DISCUSSIONS.length)];
          break;
        case 'elder':
          msgContent = ELDER_DISCUSSIONS[Math.floor(Math.random() * ELDER_DISCUSSIONS.length)];
          break;
        case 'scapegoat':
          msgContent = SCAPEGOAT_DISCUSSIONS[Math.floor(Math.random() * SCAPEGOAT_DISCUSSIONS.length)];
          break;
        case 'idiot':
          msgContent = IDIOT_DISCUSSIONS[Math.floor(Math.random() * IDIOT_DISCUSSIONS.length)];
          break;
        case 'angel':
          msgContent = ANGEL_DISCUSSIONS[Math.floor(Math.random() * ANGEL_DISCUSSIONS.length)];
          break;
        case 'cupid':
          msgContent = CUPID_LOVERS_DISCUSSIONS[Math.floor(Math.random() * CUPID_LOVERS_DISCUSSIONS.length)];
          break;
        case 'werewolf':
        case 'white_wolf':
        case 'curse_wolf':
        case 'dire_wolf':
          msgContent = WOLF_PRETEND_DISCUSSIONS[Math.floor(Math.random() * WOLF_PRETEND_DISCUSSIONS.length)];
          break;
        default:
          if (lastNightVictimIds && lastNightVictimIds.length > 0 && Math.random() < 0.4) {
            msgContent = `Thương tiếc cho người vừa ngã xuống đêm qua... Hôm nay nhất định phải tìm ra thủ phạm!`;
          } else {
            msgContent = GENERAL_DAY_DISCUSSIONS[Math.floor(Math.random() * GENERAL_DAY_DISCUSSIONS.length)];
          }
          break;
      }
    }

    if (msgContent) {
      queue.push({
        botId: b.id,
        botName: b.name,
        content: msgContent,
        delayMs: delay,
      });
    }
  });

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
    if (targetWolf && Math.random() < 0.85) {
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

/**
 * Smart Defenses for Accused Bot on Bục Biện Hộ (15+ Options based on role or bluff)
 */
export function getSmartBotDefenseSpeech(targetPlayer: Player): string {
  if (targetPlayer.role === 'angel') {
    const angelDefenses = [
      "Tôi là Thiên Thần nè! Hãy treo cổ tôi đi để tôi được dang rộng đôi cánh về trời!",
      "Cứ vote treo cổ tôi đi, các bạn sẽ được chứng kiến điều kỳ diệu nhất từ trước đến giờ!",
      "Tôi tình nguyện lên giàn thiêu hôm nay, ai không vote cho tôi là hối hận đấy!",
      "Treo cổ tôi ngay đi, đừng chần chừ một giây phút nào nữa!",
      "Tôi nhận hết mọi nghi vấn, xin một vé treo cổ vinh quang ngày hôm nay!"
    ];
    return angelDefenses[Math.floor(Math.random() * angelDefenses.length)];
  }

  if (targetPlayer.role === 'idiot') {
    const idiotDefenses = [
      "Hahaha tôi là Thằng Ngốcnè! Cứ treo cổ tôi đi!",
      "Tôi ngốc thật nhưng tôi là người tốt 100%! Treo tôi lên là làng mất lượt oan uổng nha!",
      "Ủa sao lại kéo tôi lên đây? Tôi chỉ là một gã khờ vô hại thôi mà, đừng bắt nạt tôi chứ!",
      "Đã ai làm gì đâu? Có ai chạm vào đâu mà đổ lỗi cho ta???"
    ];
    return idiotDefenses[Math.floor(Math.random() * idiotDefenses.length)];
  }

  if (targetPlayer.role === 'elder') {
    const elderDefenses = [
      "Tôi chính là Già Làng! Treo cổ tôi, các người sẽ hứng chịu sự trừng phạt và mất toàn bộ quyền năng đấy!",
      "Người già này đã cống hiến cả đời cho làng! Giết nhầm tôi là phe Làng tự tay dâng chiến thắng cho Sói!",
      "Hãy dừng tay lại trước khi quá muộn! Tôi là Già Làng uy tín, đừng để lũ Sói dẫn dắt!"
    ];
    return elderDefenses[Math.floor(Math.random() * elderDefenses.length)];
  }

  if (targetPlayer.role === 'hunter') {
    const hunterDefenses = [
      "Tôi là Thợ Săn! Nếu các người dám treo cổ tôi, phát súng cuối cùng của tôi sẽ kéo theo kẻ đã vu khống tôi!",
      "Cây súng của tôi đã lên đạn! Treo cổ tôi là một người nữa chắc chắn sẽ phải chết cùng!",
      "Tôi là Thợ Săn lương thiện, giữ tôi lại để đêm nay tôi bắn hạ bầy Sói bảo vệ làng!"
    ];
    return hunterDefenses[Math.floor(Math.random() * hunterDefenses.length)];
  }

  if (targetPlayer.role === 'guard') {
    const guardDefenses = [
      "Tôi là Bảo Vệ của làng! Chiếc khiên của tôi đã cứu biết bao người trong đêm, xin hãy tha bổng cho tôi!",
      "Nếu treo cổ tôi, đêm nay sẽ không còn ai đứng ra che chở cho Tiên Tri và Dân Làng nữa đâu!",
      "Tôi cam đoan mình là Bảo Vệ chân chính! Hãy tha cho tôi để tôi tiếp tục bảo vệ phe Làng!"
    ];
    return guardDefenses[Math.floor(Math.random() * guardDefenses.length)];
  }

  if (targetPlayer.role === 'witch') {
    const witchDefenses = [
      "Tôi là Phù Thủy! Bình độc và bình thuốc cứu của tôi vẫn đang bảo vệ làng, đừng giết nhầm tôi!",
      "Treo cổ tôi là làng mất đi 2 bình tiên dược cực kỳ quý giá để đối đầu với bầy Sói đấy!",
      "Tôi có thể dùng độc tiêu diệt Sói trong đêm nay, xin mọi người hãy tha bổng để tôi lập công!"
    ];
    return witchDefenses[Math.floor(Math.random() * witchDefenses.length)];
  }

  if (targetPlayer.role === 'scapegoat') {
    const scapegoatDefenses = [
      "Tôi là Kẻ Thế Mạng thôi mà, xin hãy tha bổng cho tôi! Đừng để sự nghi ngờ vô cớ hại chết người vô tội!",
      "Oan ức quá làng ơi! Tôi không phải Sói, xin hãy cho tôi một cơ hội chứng minh lòng trong sạch!"
    ];
    return scapegoatDefenses[Math.floor(Math.random() * scapegoatDefenses.length)];
  }

  // General Villager or Werewolf Bluff Defenses
  const generalDefenses = [
    "Tôi hoàn toàn vô tội! Dân làng hãy tỉnh táo lại, đừng để bầy Ma Sói dắt mũi chia rẽ!",
    "Tôi là dân làng lương thiện! Nếu treo cổ tôi, phe Làng sẽ mất đi một lá phiếu vô cùng quan trọng!",
    "Có kẻ cố tình bom phiếu để hãm hại tôi! Mọi người hãy bình tĩnh tha bổng để tôi chứng minh!",
    "Tôi thề danh dự tôi không phải Ma Sói! Đêm nay hãy để Tiên Tri soi tôi sẽ rõ trắng đen!",
    "Sói thật đang ngồi cười hả hê khi thấy các bạn dồn phiếu vào tôi đấy, xin hãy tha bổng!",
    "Oan ức quá trời ơi! Tôi mà là Sói thì trời tru đất diệt, xin làng hãy rủ lòng tha thứ!",
    "Xin hãy giữ tôi lại! Tôi sẽ cống hiến hết mình cùng anh em tìm ra bầy Sói thực sự!",
    "Tôi chưa từng làm điều gì hại làng, một phiếu tha bổng của các bạn là cứu cả một sinh mạng trong sạch!",
    "Hãy nhìn thẳng vào mắt tôi, không có một chút tà tâm nào cả! Đừng trúng kế của kẻ thủ ác!",
    "Nếu các bạn tha bổng cho tôi hôm nay, tôi hứa ngày mai sẽ vạch mặt kẻ đã vu khống tôi!",
    "Tôi còn vợ già, ý lộn, mẹ già, vợ ốm, con thơ. Đừng hại tôi!",
    "Nếu tôi chết mà cứu được cả làng, tôi sẵn sàng. Nhưng không cứu được đâu. Vậy nên tha cho tôi đi!"
  ];

  return generalDefenses[Math.floor(Math.random() * generalDefenses.length)];
}
