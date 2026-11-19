export const SKILL_ITEMS = [
  {
    code: 'BLACK_VINYL_PAGE_THEME',
    title: '黑胶页调色规则',
    badge: 'Skill',
    text: '基于 D dominant 主色执行黑胶页背景调色规则，H 保持不变，只调整 S/L，输出渐变、CSS token 与解释。',
    version: 'v0.2.0',
    updatedAt: '2026/10/22',
  },
  {
    code: 'COVER_CARD_THEME',
    title: '封面卡片配色规则',
    badge: '预设',
    text: '将主色、边缘色和 16 色调色板转换为卡片背景、标题、标签、按钮等界面配色建议。',
    version: 'v0.1.0',
    updatedAt: '2026/06/02',
  },
  {
    code: 'BATCH_COLOR_EXTRACT',
    title: '底层图片取色能力',
    badge: 'Skill',
    text: '面向图片 URL、上传图和粘贴图的批量取色任务，统一返回结构化 JSON 与可复制色值。',
    version: 'v0.1.0',
    updatedAt: '2026/06/02',
  },
];

export function getSkillItem(code) {
  return SKILL_ITEMS.find((item) => item.code === code) || SKILL_ITEMS[0];
}
