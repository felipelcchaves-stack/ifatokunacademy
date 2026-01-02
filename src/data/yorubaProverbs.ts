export interface YorubaProverb {
  id?: string;
  yoruba: string;
  portuguese: string;
  context: 'motivation' | 'wisdom' | 'perseverance' | 'victory' | 'risk' | 'greeting';
  literal?: string;
  lesson?: string;
  keywords?: string[];
  audioUrl?: string;
}

export const YORUBA_PROVERBS: YorubaProverb[] = [
  // Motivação
  {
    id: 'proverb_001',
    yoruba: "Ẹni tó bá fẹ́ jẹ oyin inu àpón, kò gbọdọ̀ bẹ̀rù oró.",
    portuguese: "Quem quer comer o mel da colmeia não deve temer as abelhas.",
    context: 'motivation',
    literal: "Pessoa que quer comer mel dentro da colmeia, não deve temer picadas.",
    lesson: "Para alcançar algo valioso, é preciso coragem para enfrentar os obstáculos.",
    keywords: ['oyin', 'àpón', 'oró', 'bẹ̀rù']
  },
  {
    id: 'proverb_002',
    yoruba: "Àgbàlagbà kì í wo àwọ̀n ilé tán, kí wọ́n má bàa gbé.",
    portuguese: "O ancião não olha todas as casas da cidade sem escolher onde morar.",
    context: 'motivation',
    literal: "O ancião não observa todas as casas terminarem, sem que elas sejam habitadas.",
    lesson: "A experiência traz discernimento para fazer escolhas sábias.",
    keywords: ['àgbàlagbà', 'ilé', 'gbé']
  },
  {
    id: 'proverb_003',
    yoruba: "Bí a bá ń retí ọjọ́ ọ̀la, a ò ní jẹun lónìí.",
    portuguese: "Se esperarmos apenas pelo amanhã, não comeremos hoje.",
    context: 'motivation',
    literal: "Se ficamos esperando o amanhã, não teremos comida hoje.",
    lesson: "A ação no presente é mais importante que a espera passiva pelo futuro.",
    keywords: ['ọjọ́', 'ọ̀la', 'jẹun', 'lónìí']
  },
  
  // Perseverança
  {
    id: 'proverb_004',
    yoruba: "Ẹni tó bá múra sílẹ̀ fún ọjọ́ ọ̀la, kò ní sún mọ́lẹ̀.",
    portuguese: "Quem se prepara para o amanhã não dormirá no chão.",
    context: 'perseverance',
    literal: "Aquele que se prepara para o dia de amanhã, não dormirá no chão.",
    lesson: "A preparação e o planejamento garantem um futuro melhor.",
    keywords: ['múra', 'sílẹ̀', 'ọjọ́', 'sún']
  },
  {
    id: 'proverb_005',
    yoruba: "Ọwọ́ ọ̀tún wẹ ọwọ́ òsì, ọwọ́ òsì wẹ ọwọ́ ọ̀tún.",
    portuguese: "A mão direita lava a esquerda, a esquerda lava a direita.",
    context: 'perseverance',
    literal: "Mão direita lava mão esquerda, mão esquerda lava mão direita.",
    lesson: "A cooperação e a reciprocidade são essenciais para o sucesso.",
    keywords: ['ọwọ́', 'ọ̀tún', 'òsì', 'wẹ']
  },
  {
    id: 'proverb_006',
    yoruba: "Kò sí ìpínlẹ̀ láìsí ìwà pẹ̀lẹ́.",
    portuguese: "Não há sucesso sem paciência.",
    context: 'perseverance',
    literal: "Não existe conquista sem caráter paciente.",
    lesson: "A paciência é fundamental para alcançar objetivos duradouros.",
    keywords: ['ìpínlẹ̀', 'ìwà', 'pẹ̀lẹ́']
  },
  {
    id: 'proverb_007',
    yoruba: "Ìgbà tí a bá ń rìn, a ó dé ibi tí a ń lọ.",
    portuguese: "Enquanto caminhamos, chegaremos ao nosso destino.",
    context: 'perseverance',
    literal: "No tempo em que estamos caminhando, chegaremos ao lugar que estamos indo.",
    lesson: "A persistência no caminho leva inevitavelmente ao objetivo.",
    keywords: ['rìn', 'dé', 'ibi', 'lọ']
  },
  
  // Sabedoria
  {
    id: 'proverb_008',
    yoruba: "Ọ̀rọ̀ tó pọ̀ jù lọ kò lè yọ ẹnu aláìgbọ́n.",
    portuguese: "Palavras demais não saem da boca do sábio.",
    context: 'wisdom',
    literal: "Palavras que são demais não conseguem sair da boca de quem não tem sabedoria.",
    lesson: "O sábio fala pouco, mas com significado profundo.",
    keywords: ['ọ̀rọ̀', 'pọ̀', 'ẹnu', 'aláìgbọ́n']
  },
  {
    id: 'proverb_009',
    yoruba: "Ọmọdé gbọ́n, àgbà gbọ́n, ló fi dá Ilé-Ifẹ̀.",
    portuguese: "Os jovens são sábios, os anciãos são sábios, foi assim que Ilé-Ifẹ̀ foi fundada.",
    context: 'wisdom',
    literal: "Criança é sábia, ancião é sábio, foi assim que se fundou Ilé-Ifẹ̀.",
    lesson: "A sabedoria não tem idade; jovens e velhos contribuem igualmente.",
    keywords: ['ọmọdé', 'gbọ́n', 'àgbà', 'Ilé-Ifẹ̀']
  },
  {
    id: 'proverb_010',
    yoruba: "Bí inú bá dùn, ẹnu á sọ̀rọ̀.",
    portuguese: "Quando o coração está feliz, a boca fala.",
    context: 'wisdom',
    literal: "Se a barriga (interior) está doce, a boca vai falar.",
    lesson: "Nossas palavras refletem o estado do nosso coração.",
    keywords: ['inú', 'dùn', 'ẹnu', 'sọ̀rọ̀']
  },
  {
    id: 'proverb_011',
    yoruba: "Àṣà là á gbé, ọ̀rọ̀ là á sọ̀.",
    portuguese: "Tradição é para ser vivida, palavras são para serem ditas.",
    context: 'wisdom',
    literal: "Costume é para viver, palavra é para falar.",
    lesson: "A tradição deve ser praticada, não apenas conhecida.",
    keywords: ['àṣà', 'gbé', 'ọ̀rọ̀', 'sọ̀']
  },
  {
    id: 'proverb_012',
    yoruba: "Ẹni tí ó mọ̀ ọjọ́ tí yóò kú, yóò mọ̀ bí yóò ṣe gbé ayé.",
    portuguese: "Quem soubesse o dia de sua morte, saberia como viver.",
    context: 'wisdom',
    literal: "Aquele que conhece o dia que vai morrer, conhecerá como vai viver a vida.",
    lesson: "Viva cada dia como se fosse precioso, pois o futuro é incerto.",
    keywords: ['mọ̀', 'ọjọ́', 'kú', 'gbé', 'ayé']
  },
  
  // Vitória
  {
    id: 'proverb_013',
    yoruba: "Ìṣẹ́gun ní ti Ọlọ́run!",
    portuguese: "A vitória pertence a Deus!",
    context: 'victory',
    literal: "Vitória é de Deus!",
    lesson: "A verdadeira vitória vem do divino, não do esforço humano apenas.",
    keywords: ['ìṣẹ́gun', 'Ọlọ́run']
  },
  {
    id: 'proverb_014',
    yoruba: "Ẹni tó bá gbìyànjú, yóò rí ìyọ̀nu.",
    portuguese: "Quem se esforça encontrará alegria.",
    context: 'victory',
    literal: "Aquele que se esforça, vai ver alegria.",
    lesson: "O esforço consistente é recompensado com felicidade.",
    keywords: ['gbìyànjú', 'rí', 'ìyọ̀nu']
  },
  {
    id: 'proverb_015',
    yoruba: "Ìjà nlá kì í pa aláàánú.",
    portuguese: "Uma grande batalha não mata aquele que é persistente.",
    context: 'victory',
    literal: "Luta grande não mata o misericordioso/persistente.",
    lesson: "A persistência e a compaixão são mais fortes que qualquer desafio.",
    keywords: ['ìjà', 'nlá', 'pa', 'aláàánú']
  },
  {
    id: 'proverb_016',
    yoruba: "A kì í fi ojú ọjọ́ kan wo ẹni tó dára.",
    portuguese: "Não se julga uma pessoa boa por apenas um dia.",
    context: 'victory',
    literal: "Não se usa olho de um dia para ver pessoa que é boa.",
    lesson: "O caráter verdadeiro se revela ao longo do tempo, não em um momento.",
    keywords: ['ojú', 'ọjọ́', 'wo', 'dára']
  },
  
  // Risco de perder sequência
  {
    id: 'proverb_017',
    yoruba: "Ẹni tó bá dúró lẹ́yìn igi, afẹ́fẹ́ kò lè gbé e lọ.",
    portuguese: "Quem se abriga atrás da árvore, o vento não pode levá-lo.",
    context: 'risk',
    literal: "Aquele que fica atrás da árvore, o vento não pode carregá-lo.",
    lesson: "Buscar proteção e apoio nos ajuda a resistir às adversidades.",
    keywords: ['dúró', 'igi', 'afẹ́fẹ́', 'gbé']
  },
  {
    id: 'proverb_018',
    yoruba: "Kò sí ohun tó burú jù kí ẹni padà sẹ́yìn.",
    portuguese: "Não há nada pior do que retroceder.",
    context: 'risk',
    literal: "Não há coisa que seja pior do que pessoa voltar para trás.",
    lesson: "O retrocesso é o maior perigo; mantenha-se sempre avançando.",
    keywords: ['burú', 'padà', 'sẹ́yìn']
  },
  {
    id: 'proverb_019',
    yoruba: "Òní là á ń ṣe iṣẹ́ ọ̀la.",
    portuguese: "É hoje que fazemos o trabalho de amanhã.",
    context: 'risk',
    literal: "Hoje é que estamos fazendo o trabalho do amanhã.",
    lesson: "O sucesso futuro é construído pelas ações de hoje.",
    keywords: ['òní', 'ṣe', 'iṣẹ́', 'ọ̀la']
  },
  
  // Saudação/Greeting
  {
    id: 'proverb_020',
    yoruba: "Ẹ kú ọjọ́ mẹ́ta, Ọmọ Ifá!",
    portuguese: "Saudações, Filho de Ifá!",
    context: 'greeting',
    literal: "Saudações de três dias, Filho de Ifá!",
    lesson: "Saudação tradicional que honra o estudante no caminho de Ifá.",
    keywords: ['kú', 'ọjọ́', 'mẹ́ta', 'Ọmọ', 'Ifá']
  },
  {
    id: 'proverb_021',
    yoruba: "Àṣẹ o! Ọjọ́ yìí jẹ́ ọjọ́ ìmọ̀.",
    portuguese: "Àṣẹ! Que este dia seja um dia de conhecimento.",
    context: 'greeting',
    literal: "Àṣẹ! Este dia seja dia de conhecimento.",
    lesson: "Invocação de bênção para que o aprendizado floresça.",
    keywords: ['àṣẹ', 'ọjọ́', 'jẹ́', 'ìmọ̀']
  },
  {
    id: 'proverb_022',
    yoruba: "Ìwà rere ni ẹ̀wà ènìyàn.",
    portuguese: "O bom caráter é a beleza da pessoa.",
    context: 'greeting',
    literal: "Caráter bom é a beleza do ser humano.",
    lesson: "A verdadeira beleza está no caráter, não na aparência.",
    keywords: ['ìwà', 'rere', 'ẹ̀wà', 'ènìyàn']
  },
];

export const getRandomProverb = (context?: YorubaProverb['context']): YorubaProverb => {
  const filtered = context 
    ? YORUBA_PROVERBS.filter(p => p.context === context)
    : YORUBA_PROVERBS;
  return filtered[Math.floor(Math.random() * filtered.length)];
};

export const getProverbsByContext = (context: YorubaProverb['context']): YorubaProverb[] => {
  return YORUBA_PROVERBS.filter(p => p.context === context);
};

export const getAllContexts = (): YorubaProverb['context'][] => {
  return ['motivation', 'wisdom', 'perseverance', 'victory', 'risk', 'greeting'];
};

export const getContextLabel = (context: YorubaProverb['context']): string => {
  const labels: Record<YorubaProverb['context'], string> = {
    motivation: 'Motivação',
    wisdom: 'Sabedoria',
    perseverance: 'Perseverança',
    victory: 'Vitória',
    risk: 'Proteção',
    greeting: 'Saudações'
  };
  return labels[context];
};

export const SPIRITUAL_LEVELS = [
  { level: 1, name: 'Kékeré', xpRequired: 0, description: 'O início da jornada' },
  { level: 2, name: 'Àgbà', xpRequired: 500, description: 'Caminhando com sabedoria' },
  { level: 3, name: 'Ọ̀mọdé Awo', xpRequired: 1500, description: 'Aprendiz dos mistérios' },
  { level: 4, name: 'Bàbá Awo', xpRequired: 5000, description: 'Guardião do conhecimento' },
  { level: 5, name: 'Ifá-tókun', xpRequired: 15000, description: 'Mestre supremo' },
];

export const XP_VALUES = {
  exercise_complete: 10,
  lesson_complete: 50,
  module_complete: 100,
  daily_goal_complete: 30,
  challenge_item: 5,
  review_correct: 5,
  streak_bonus_7: 1.5,
  streak_bonus_30: 2.0,
};
