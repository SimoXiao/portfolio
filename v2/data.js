window.PORTFOLIO_DATA = {
  author: {
    nameZh: '徐晓强',
    nameEn: 'Xu Xiaoqiang',
    alias: 'Simo',
    role: 'UX Design Lead',
    years: 11,
    description: '兼具「审美感性 + 工具理性」的双重特质，拥有亿级流量 C 端产品重构经验与生态建设的成功案例。',
    phone: '13291691179',
    email: 'xusimoooo@gmail.com',
    experience: [
      { company: '网易云音乐', period: '2020.12 — Now', role: '平台基础线设计负责人' },
      { company: '阿里巴巴', period: '2018.05 — 2020.12', role: '体验设计师 · 1688 会员体系' },
      { company: '网易味央', period: '2016.05 — 2018.04', role: '视觉设计师' }
    ],
    skills: [
      '用户研究', '交互设计', 'UI 设计', '3D / UI 动效',
      '原型设计', 'A/B 测试', '设计系统', '可用性测试'
    ],
    tools: ['Figma', 'Mastergo', 'Sketch', 'Principle', 'ProtoPie', 'After Effects', 'Cinema4D']
  },
  projects: [
    {
      id: 'project1',
      title: '播放器减负计划',
      subtitle: 'UX Renovation',
      side: 'A',
      track: '01',
      role: '主设 · 设计提案 / 项目推进',
      date: '2023.5 — 2023.11',
      summary: '围绕播放页与我的页的 10.0 重构，以「更年轻、更可控」为方向改善核心听歌场景，推动设计提案与项目落地。',
      color: '#b76242',
      cover: 7,
      previewPages: [7, 18],
      metrics: [
        { value: '+0.2min', label: '人均播放时长', note: '播放页' },
        { value: '+5.8%', label: '互动 · 红心数', note: '播放页' },
        { value: '+18.4s', label: '前端听歌时长', note: '我的页' },
        { value: '+0.076pt', label: '次留数据', note: '我的页' }
      ],
      chapters: [
        { title: '播放页 10.0 大改版', from: 4, to: 15 },
        { title: '我的页 10.0 大改版', from: 16, to: 24 }
      ],
      gallery: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
    },
    {
      id: 'project2',
      title: '播放器样式美学',
      subtitle: 'Visual System & Motion Design',
      side: 'A',
      track: '02',
      role: '主设 · 创意策划 / 视觉设计',
      date: '2023 — 2024',
      summary: '从创意策划到视觉设计，探索播放器的个性化表达与动态体验。通过 30+ 原创样式，为年轻用户提供更丰富的听歌界面选择。',
      color: '#9784b1',
      cover: 29,
      previewPages: [29, 30],
      metrics: [
        { value: '661.8W', label: '新召用户', note: '2024 年数据' },
        { value: '18.12%', label: '功能渗透', note: '2024 年数据' },
        { value: '30+', label: '原创样式', note: '2023 — 2024' }
      ],
      chapters: [{ title: '原创样式', from: 25, to: 39 }],
      gallery: [25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39]
    },
    {
      id: 'project3',
      title: '双螺旋提效计划',
      subtitle: 'Design System & AI Tools',
      side: 'B',
      track: '03',
      role: '负责人 · 中台架构 / 工具研发',
      date: '',
      summary: '以设计系统与工具研发打通 Code ↔ Design，沉淀组件与规范。结合 AI 工具孵化，支持设计资产管理、协作与研发提效。',
      color: '#476b88',
      cover: 44,
      previewPages: [44, 47],
      metrics: [
        { value: '30%', label: '人力提效', note: 'Seals D2C 研发插件' },
        { value: '63+', label: '通用组件', note: '设计系统沉淀' },
        { value: '100+', label: '设计规范', note: '设计系统沉淀' }
      ],
      chapters: [{ title: '设计系统与 AI 工具', from: 40, to: 50 }],
      gallery: [40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50]
    },
    {
      id: 'project4',
      title: '硬核养成计划',
      subtitle: 'Design Leadership',
      side: 'B',
      track: '04',
      role: '设计负责人 · 团队管理 / 体系化建设',
      date: '',
      summary: '围绕团队组建、团队管理与团队发展，建立结构力、节奏力、成长力的管理体系。通过人才培养、内部课程与设计影响力建设推动团队成长。',
      color: '#74917e',
      cover: 53,
      previewPages: [53, 54],
      metrics: [
        { value: '6人', label: '团队规模', note: '4 名正式员工、1 名外包、1 名实习生' },
        { value: '2人', label: '外包 / 实习转正', note: '外包 1 人、实习生 1 人' },
        { value: 'TOP2', label: '集团十佳课程', note: '造物创新 · 曲风播放器' }
      ],
      chapters: [{ title: '团队建设', from: 51, to: 56 }],
      gallery: [51, 52, 53, 54, 55, 56]
    }
  ]
};

/*
 * 事实来源：../index.html（原作品集，2025 年版本）及 ../images/page_XX.png。
 * author：index.html 605—607、614—635、645—682、699—710 行。
 * project1：767—779、786—810 行；page_24 保留原稿「前端听歌时长」名称。
 * project2：822—834、837—851 行；page_35 明确 661.8 万与 18.12% 为 2024 年数据。
 * project3：863—875、878—888 行；page_50 明确 30% 归属 Seals D2C 研发插件。
 * project4：900—912、915—920 行；page_53 核对课程，page_55 核对团队构成与转正人数。
 * 未收录计量口径不明的 350W+ 与 SUS 8.7；未将项目提名计作获奖。
 * 「10 年」与经历中的「Now」沿用原稿，不代表已核验当前任职或自动延长年限。
 */
