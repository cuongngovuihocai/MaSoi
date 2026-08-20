import React, { useState } from 'react';
import { ROLE_DEFINITIONS, PRESET_ROLE_SETUPS } from '../data/roles';
import { RoleType } from '../types';
import { CardArt } from './CardArt';
import { RoleImageModal } from './RoleImageModal';
import { X, BookOpen, Shield, Users, Moon, Sun, Sparkles, Award, Maximize2 } from 'lucide-react';

interface RuleGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RuleGuideModal: React.FC<RuleGuideModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'factions' | 'roles' | 'workflow' | 'presets'>('factions');
  const [roleFilter, setRoleFilter] = useState<'all' | 'villagers' | 'werewolves' | 'neutral'>('all');
  const [zoomedRole, setZoomedRole] = useState<RoleType | null>(null);

  if (!isOpen) return null;

  const rolesList = Object.values(ROLE_DEFINITIONS).filter(
    (r) => roleFilter === 'all' || r.team === roleFilter
  );

  return (
    <div id="rule-guide-modal" className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto overflow-x-hidden">
      <div className="relative w-full max-w-[calc(100vw-1.25rem)] sm:max-w-4xl bg-slate-900 border border-purple-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400 border border-purple-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-lg text-slate-100">Hướng Dẫn & Luật Chơi Ma Sói Chuẩn</h2>
              <p className="text-xs text-slate-400">Phe phái, danh sách 20 vai trò, quy trình ván đấu & thiết lập 8 - 26 người</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Vertical/Grid Stacked Menu Navigation for Mobile */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-3 bg-slate-950/80 border-b border-slate-800">
          <button
            onClick={() => setActiveTab('factions')}
            className={`flex items-center justify-center gap-1.5 p-2.5 text-xs font-semibold rounded-xl transition-all border ${
              activeTab === 'factions'
                ? 'border-purple-500 text-purple-200 bg-purple-950/80 shadow-md ring-1 ring-purple-500/50'
                : 'border-slate-800 text-slate-400 bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">Phe Phái & Mục Tiêu</span>
          </button>
          <button
            onClick={() => setActiveTab('roles')}
            className={`flex items-center justify-center gap-1.5 p-2.5 text-xs font-semibold rounded-xl transition-all border ${
              activeTab === 'roles'
                ? 'border-purple-500 text-purple-200 bg-purple-950/80 shadow-md ring-1 ring-purple-500/50'
                : 'border-slate-800 text-slate-400 bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">20 Vai Trò</span>
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`flex items-center justify-center gap-1.5 p-2.5 text-xs font-semibold rounded-xl transition-all border ${
              activeTab === 'workflow'
                ? 'border-purple-500 text-purple-200 bg-purple-950/80 shadow-md ring-1 ring-purple-500/50'
                : 'border-slate-800 text-slate-400 bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Quy Trình 1 Ván</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center justify-center gap-1.5 p-2.5 text-xs font-semibold rounded-xl transition-all border ${
              activeTab === 'presets'
                ? 'border-purple-500 text-purple-200 bg-purple-950/80 shadow-md ring-1 ring-purple-500/50'
                : 'border-slate-800 text-slate-400 bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">Cấu Hình (8-26)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-300 text-sm">
          {activeTab === 'factions' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/20">
                <h3 className="font-serif font-bold text-purple-300 text-base mb-2">
                  Tổng Quan Các Phe Trong Trò Chơi
                </h3>
                <p className="leading-relaxed text-slate-300">
                  Trò chơi Ma Sói chia người chơi thành 3 phe chính: Phe Dân Làng, Phe Ma Sói và Phe Thứ Ba. Mỗi phe sở hữu những năng lực đặc biệt và điều kiện chiến thắng riêng.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                    <Shield className="w-4 h-4" /> Phe Dân Làng
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Mục tiêu:</strong> Tiêu diệt toàn bộ Ma Sói có trong làng.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Bao gồm Dân Làng, Tiên Tri, Bảo Vệ, Phù Thủy, Thần Tình Yêu, Thợ Săn, Già Làng, Cáo, Hình Nhân Thế Mạng, Thằng Ngốc, Quan Tòa và Người Đội Lốt Sói.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <Moon className="w-4 h-4" /> Phe Ma Sói
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Mục tiêu:</strong> Tiêu diệt dân làng, sao cho số lượng Sói còn sống lớn hơn hoặc bằng số lượng dân còn sống.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Bao gồm Sói Thường, Sói Nguyền, Sói Hùm.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> Phe Thứ Ba (Mục Tiêu Riêng)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Mục tiêu:</strong> Tùy theo vai trò cụ thể:
                  </p>
                  <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-1">
                    <li><strong>Thiên Thần:</strong> Bị treo cổ trong lần biểu quyết đầu tiên (Ngày 1).</li>
                    <li><strong>Sói Trắng:</strong> Loại hết các đối thủ (dân cũng như Sói) để sống sót đến cuối cùng.</li>
                    <li><strong>Cặp Tình Nhân:</strong> Loại hết các đối thủ (dân cũng như Sói) để sống sót đến cuối cùng.</li>
                    <li><strong>Người Thổi Sáo:</strong> Thôi miên tất cả người chơi còn sống.</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setRoleFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                    roleFilter === 'all'
                      ? 'bg-slate-800 border-purple-500 text-purple-300'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  Tất cả ({Object.keys(ROLE_DEFINITIONS).length})
                </button>
                <button
                  onClick={() => setRoleFilter('villagers')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                    roleFilter === 'villagers'
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  Phe Dân Làng
                </button>
                <button
                  onClick={() => setRoleFilter('werewolves')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                    roleFilter === 'werewolves'
                      ? 'bg-rose-950 border-rose-500 text-rose-300'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  Phe Ma Sói
                </button>
                <button
                  onClick={() => setRoleFilter('neutral')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border ${
                    roleFilter === 'neutral'
                      ? 'bg-amber-950 border-amber-500 text-amber-300'
                      : 'border-slate-800 text-slate-400'
                  }`}
                >
                  Phe Thứ 3
                </button>
              </div>

              {/* Roles Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {rolesList.map((meta) => (
                  <div
                    key={meta.id}
                    onClick={() => setZoomedRole(meta.id)}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-purple-500/50 transition-all cursor-pointer group flex gap-3 items-start relative shadow-sm hover:shadow-purple-950/40"
                  >
                    <div className="relative shrink-0 rounded-lg overflow-hidden">
                      <CardArt role={meta.id} size="sm" />
                      <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Maximize2 className="w-4 h-4 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] animate-pulse" />
                      </div>
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-100 text-xs group-hover:text-purple-300 transition-colors flex items-center gap-1">
                          {meta.name}
                        </h4>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded border ${meta.badgeColor}`}>
                          {meta.teamName}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">{meta.ability}</p>
                      <span className="text-[10px] text-purple-400/90 font-medium block pt-1 group-hover:underline">
                        🔍 Chạm để xem hình phóng to
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <Sun className="w-4 h-4" /> 1. Ngày Thứ Nhất
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Kể chuyện dẫn nhập, Giới thiệu số lượng người chơi và Giới thiệu các vai trong ván đấu.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-purple-500/30 space-y-3">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                  <Moon className="w-4 h-4" /> 2. Đêm Thứ Nhất (Gọi Theo Trình Tự)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">1. Thần Tình Yêu: Ghép đôi 2 người chơi.</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">2. Cặp Tình Nhân: Nhận diện mặt nhau.</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">3. Sói & Người Đội Lốt Sói: Chọn nạn nhân bị cắn.</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">4. Sói Nguyền: Biến nạn nhân thành Sói (nếu dùng).</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">5. Sói Hùm: Cắn thêm 1 người (nếu bầy chưa ai chết).</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">6. Sói Trắng: Cắn 1 con Sói khác (đêm chẵn).</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">7. Bảo Vệ: Chọn 1 người để chở che.</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">8. Tiên Tri: Soi chân tướng Sói (Đúng/Sai).</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">9. Phù Thủy: Chọn cứu nạn nhân / dùng độc dược.</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800">10. Cáo: Dò cụm 3 người có chứa Sói.</div>
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 sm:col-span-2">11. Người Thổi Sáo: Chọn 2 người để thôi miên.</div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Sun className="w-4 h-4" /> 3. Ngày Thứ Hai & Các Ngày Tiếp Theo
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Dân làng thức dậy tiến hành:
                </p>
                <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
                  <li>Nghe thông báo số ca tử vong.</li>
                  <li>Nghe thông báo có thêm Sói xuất hiện (nếu Mẹ Nuôi của Đứa Trẻ Hoang Dã chết hoặc Sói Nguyền biến đổi).</li>
                  <li>Thảo luận, chọn người bị treo cổ, biểu quyết treo cổ hay tha bổng.</li>
                  <li>Nghe thông báo chọn thêm người bị treo cổ và biểu quyết (nếu Quan Tòa dùng kỹ năng).</li>
                  <li>Nghe thông báo cả làng bị mất hết kỹ năng (nếu Già Làng bị dân làng treo cổ, hoặc bị Phù Thủy hạ độc hoặc bị Thợ Săn bắn).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2">
                <div className="flex items-center gap-2 text-indigo-300 font-bold text-sm">
                  <Moon className="w-4 h-4" /> 4. Đêm Thứ Hai & Các Đêm Tiếp Theo
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Lần lượt gọi các chức năng theo thứ tự: Sói (và Sói nguyền, Sói hùm, Sói trắng, Người đội lốt sói) → Sói Nguyền → Sói Hùm → Sói Trắng → Bảo Vệ → Tiên Tri → Phù Thủy → Cáo → Người Thổi Sáo.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Bảng phân bổ vai trò chuẩn theo quy định từ 8 đến 26 người chơi trong 1 ván đấu:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {Object.entries(PRESET_ROLE_SETUPS).map(([num, preset]) => (
                  <div
                    key={num}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                  >
                    <div className="font-bold text-purple-300 text-xs flex items-center justify-between">
                      <span>{preset.title}</span>
                      <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                        {preset.roles.length} Thẻ Bài
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {preset.roles.map((rKey, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setZoomedRole(rKey as RoleType)}
                          className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-slate-300 border border-slate-700/60 hover:bg-purple-950 hover:text-purple-200 hover:border-purple-500/50 transition-colors cursor-pointer"
                        >
                          {ROLE_DEFINITIONS[rKey]?.name || rKey}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Role Card Zoom Modal */}
      <RoleImageModal
        role={zoomedRole}
        onClose={() => setZoomedRole(null)}
      />
    </div>
  );
};

