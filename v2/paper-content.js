(() => {
  'use strict';
  const safe = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  const describe = (value) => safe(value).replace(/\b(?:10\.0|1688|AI|App|3D IP)\b/g, '<span class="liner-token">$&</span>');
  function faces(author) {
    const name = safe(author.nameZh);
    const english = safe(author.nameEn);
    const alias = safe(author.alias);
    const phone = safe(String(author.phone || '').replace(/^(\d{3})(\d{4})(\d{4})$/, '$1 $2 $3'));
    // Each role has a full fold, rather than compressing a résumé into one leaf.
    const summaries = [
      '负责播放器 10.0 重构与多风格样式生态建设，主导海豚中台搭建与 AI 工具孵化，通过品控标准、提案演练和协作机制，推动团队能力与人才梯队建设。',
      '主导 1688 会员体系升级，从信息架构、交互流程到视觉语言优化；负责支付宝货源市场、小程序与生活号的跨平台设计，参与找工厂等重点项目上线。',
      '主导网易四季与网易味央 App 界面及官网、活动和电商视觉，独立完成两大品牌 3D IP 从用户及市场分析、创意构思、草图绘制到建模打样的全流程设计。'
    ];
    const jobs = (author.experience || []).slice(0, 3).map((entry, index) => `<div class="liner-content liner-experience"><div class="liner-section-line"><h3 class="liner-company">${safe(entry.company)}</h3><span>${safe(entry.period)}</span></div><p class="liner-job">${safe(index === 1 ? '体验设计师' : entry.role)}</p><p class="liner-description">${describe(summaries[index])}</p></div>`);

    return [
      `<div class="liner-content liner-cover"><div class="liner-catalogue"><span>个人档案</span><span>PERSONAL NOTES</span></div><div class="liner-cover-main"><div><h2 class="liner-title">${name}</h2><p class="liner-name-en">${english} / ${alias}</p><p class="liner-role">${safe(author.role)}</p></div><div class="liner-tenure"><p>${safe(author.years)} 年产品体验设计</p><span>审美感性 × 工具理性</span></div></div></div>`,
      ...jobs,
      `<div class="liner-content liner-contact"><p class="liner-section-label">保持联系</p><div class="liner-contact-line"><a class="liner-email" href="mailto:${safe(author.email)}">${safe(author.email)} <span aria-hidden="true">↗</span></a><a class="liner-phone" href="tel:${safe(author.phone)}">${phone}</a></div><div class="liner-colophon"><span>心之所向，素履以往。</span><a href="assets/docs/xu-xiaoqiang-resume.pdf" target="_blank" rel="noopener">完整简历 ↗</a></div></div>`
    ];
  }
  window.PaperContent = { faces };
})();
