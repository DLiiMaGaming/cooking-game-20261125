// Dapur Senja — ingredients and recipes.
// One job: what a dish is made of, what each ingredient needs, and what it pays.
// Every ingredient walks one prep chain: raw -> chopped -> cooked.
// `steps` lists the work it needs, in order; `ready` is the state a plate accepts.
export const INGREDIENTS = {
  nasi: {
    name: 'Nasi', short: 'NS', color: '#f7ead0', dark: '#c9a86a',
    steps: ['cook'], stepSeconds: { cook: 2.4 },
  },
  mie: {
    name: 'Mie', short: 'MI', color: '#f2c94c', dark: '#b98a1d',
    steps: ['cook'], stepSeconds: { cook: 2.2 },
  },
  ayam: {
    name: 'Ayam', short: 'AY', color: '#e8a87c', dark: '#a05a28',
    steps: ['chop', 'cook'], stepSeconds: { chop: 1.8, cook: 2.8 },
  },
  telur: {
    name: 'Telur', short: 'TL', color: '#fdf3d0', dark: '#d9a441',
    steps: ['cook'], stepSeconds: { cook: 2.0 },
  },
  sayur: {
    name: 'Sayur', short: 'SY', color: '#7bc96f', dark: '#2f7d32',
    steps: ['chop'], stepSeconds: { chop: 1.6 },
  },
  sambal: {
    name: 'Sambal', short: 'SB', color: '#e4572e', dark: '#8f1d1d',
    steps: ['chop'], stepSeconds: { chop: 1.6 },
  },
};

export const STEP_LABEL = { chop: 'CINCANG', cook: 'MASAK' };
export const STEP_STATION = { chop: 'board', cook: 'stove' };

// A recipe's `needs` maps ingredient -> the state it must reach before plating.
// `base` is the points for serving it on time; the tip grows with patience left.
export const RECIPES = [
  {
    id: 'nasi-goreng-senja', name: 'Nasi Goreng Senja', base: 120, color: '#e8a33d',
    needs: { nasi: 'cooked', telur: 'cooked', sambal: 'chopped' },
    tagline: 'Wajan panas, telur dadar, sambal ulek',
  },
  {
    id: 'mie-pedas-kilat', name: 'Mie Pedas Kilat', base: 130, color: '#f2c94c',
    needs: { mie: 'cooked', ayam: 'cooked', sayur: 'chopped' },
    tagline: 'Mie rebus, ayam bakar, sayur iris',
  },
  {
    id: 'ayam-bakar-madu', name: 'Ayam Bakar Madu', base: 140, color: '#e8a87c',
    needs: { ayam: 'cooked', sayur: 'chopped', sambal: 'chopped' },
    tagline: 'Ayam madu dua langkah, sayur dan sambal',
  },
  {
    id: 'sup-senja', name: 'Sup Senja', base: 90, color: '#7bc96f',
    needs: { sayur: 'chopped', telur: 'cooked' },
    tagline: 'Sup hangat dua bahan, cepat saji',
  },
  {
    id: 'telur-dadar-senja', name: 'Telur Dadar Senja', base: 80, color: '#fdf3d0',
    needs: { telur: 'cooked', sambal: 'chopped' },
    tagline: 'Dadar gulung, sambal di samping',
  },
];

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) || null;
}

export function ingredientState(item) {
  const steps = INGREDIENTS[item.id].steps;
  if (item.step >= steps.length) return steps[steps.length - 1] === 'cook' ? 'cooked' : 'chopped';
  return item.step === 0 ? 'raw' : steps[item.step - 1] === 'cook' ? 'cooked' : 'chopped';
}

export function isReady(item) {
  return item.step >= INGREDIENTS[item.id].steps.length;
}

export function nextStep(item) {
  const steps = INGREDIENTS[item.id].steps;
  return item.step < steps.length ? steps[item.step] : null;
}

export function nextStepSeconds(item) {
  const step = nextStep(item);
  return step === null ? 0 : INGREDIENTS[item.id].stepSeconds[step];
}
