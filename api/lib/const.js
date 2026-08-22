/**
 * 常量定义
 */

// 角色目录
export const CHARACTER_CATALOG = [
  { id: 'cat', name_zh: '橘猫', name_en: 'Cat', color: '#FB923C', is_default: true },
  { id: 'doraemon', name_zh: '机器猫', name_en: 'Doraemon', color: '#4285F4' },
  { id: 'panda', name_zh: '功夫熊猫', name_en: 'Kung Fu Panda', color: '#1F2937' },
  { id: 'nezha', name_zh: '哪吒', name_en: 'Nezha', color: '#EF4444' },
  { id: 'aorun', name_zh: '敖润', name_en: 'Ao Run', color: '#14B8A6' }
];

// 付费计划
export const BILLING_PLANS = {
  free: { key: 'free', name: 'Free', price: 0, interval: 'month', max_characters: 1, paypal_plan_id: '' },
  pro: { key: 'pro', name: 'Pro', price: 3.99, interval: 'month', max_characters: 99, paypal_plan_id: process.env.PAYPAL_PLAN_PRO || '' },
  pro_y: { key: 'pro_y', name: 'Pro Annual', price: 38.99, interval: 'year', max_characters: 99, paypal_plan_id: process.env.PAYPAL_PLAN_PRO_YEAR || '', yearly_equivalent: 'pro' },
  family: { key: 'family', name: 'Family', price: 7.99, interval: 'month', max_characters: 99, paypal_plan_id: process.env.PAYPAL_PLAN_FAMILY || '' }
};
