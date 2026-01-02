export interface YorubaProverb {
  yoruba: string;
  portuguese: string;
  context: 'motivation' | 'wisdom' | 'perseverance' | 'victory' | 'risk' | 'greeting';
}

export const YORUBA_PROVERBS: YorubaProverb[] = [
  // Motivação
  {
    yoruba: "Ẹni tó bá fẹ́ jẹ oyin inu àpón, kò gbọdọ̀ bẹ̀rù oró.",
    portuguese: "Quem quer comer o mel da colmeia não deve temer as abelhas.",
    context: 'motivation'
  },
  {
    yoruba: "Àgbàlagbà kì í wo àwọ̀n ilé tán, kí wọ́n má bàa gbé.",
    portuguese: "O ancião não olha todas as casas da cidade sem escolher onde morar.",
    context: 'motivation'
  },
  {
    yoruba: "Ọ̀rọ̀ tó pọ̀ jù lọ kò lè yọ ẹnu aláìgbọ́n.",
    portuguese: "Palavras demais não saem da boca do sábio.",
    context: 'wisdom'
  },
  {
    yoruba: "Bí a bá ń retí ọjọ́ ọ̀la, a ò ní jẹun lónìí.",
    portuguese: "Se esperarmos apenas pelo amanhã, não comeremos hoje.",
    context: 'motivation'
  },
  
  // Perseverança
  {
    yoruba: "Ẹni tó bá múra sílẹ̀ fún ọjọ́ ọ̀la, kò ní sún mọ́lẹ̀.",
    portuguese: "Quem se prepara para o amanhã não dormirá no chão.",
    context: 'perseverance'
  },
  {
    yoruba: "Ọwọ́ ọ̀tún wẹ ọwọ́ òsì, ọwọ́ òsì wẹ ọwọ́ ọ̀tún.",
    portuguese: "A mão direita lava a esquerda, a esquerda lava a direita.",
    context: 'perseverance'
  },
  {
    yoruba: "Kò sí ìpínlẹ̀ láìsí ìwà pẹ̀lẹ́.",
    portuguese: "Não há sucesso sem paciência.",
    context: 'perseverance'
  },
  {
    yoruba: "Ìgbà tí a bá ń rìn, a ó dé ibi tí a ń lọ.",
    portuguese: "Enquanto caminhamos, chegaremos ao nosso destino.",
    context: 'perseverance'
  },
  
  // Sabedoria
  {
    yoruba: "Ọmọdé gbọ́n, àgbà gbọ́n, ló fi dá Ilé-Ifẹ̀.",
    portuguese: "Os jovens são sábios, os anciãos são sábios, foi assim que Ilé-Ifẹ̀ foi fundada.",
    context: 'wisdom'
  },
  {
    yoruba: "Bí inú bá dùn, ẹnu á sọ̀rọ̀.",
    portuguese: "Quando o coração está feliz, a boca fala.",
    context: 'wisdom'
  },
  {
    yoruba: "Àṣà là á gbé, ọ̀rọ̀ là á sọ̀.",
    portuguese: "Tradição é para ser vivida, palavras são para serem ditas.",
    context: 'wisdom'
  },
  {
    yoruba: "Ẹni tí ó mọ̀ ọjọ́ tí yóò kú, yóò mọ̀ bí yóò ṣe gbé ayé.",
    portuguese: "Quem soubesse o dia de sua morte, saberia como viver.",
    context: 'wisdom'
  },
  
  // Vitória
  {
    yoruba: "Ìṣẹ́gun ní ti Ọlọ́run!",
    portuguese: "A vitória pertence a Deus!",
    context: 'victory'
  },
  {
    yoruba: "Ẹni tó bá gbìyànjú, yóò rí ìyọ̀nu.",
    portuguese: "Quem se esforça encontrará alegria.",
    context: 'victory'
  },
  {
    yoruba: "Ìjà nlá kì í pa aláàánú.",
    portuguese: "Uma grande batalha não mata aquele que é persistente.",
    context: 'victory'
  },
  {
    yoruba: "A kì í fi ojú ọjọ́ kan wo ẹni tó dára.",
    portuguese: "Não se julga uma pessoa boa por apenas um dia.",
    context: 'victory'
  },
  
  // Risco de perder sequência
  {
    yoruba: "Ẹni tó bá dúró lẹ́yìn igi, afẹ́fẹ́ kò lè gbé e lọ.",
    portuguese: "Quem se abriga atrás da árvore, o vento não pode levá-lo.",
    context: 'risk'
  },
  {
    yoruba: "Kò sí ohun tó burú jù kí ẹni padà sẹ́yìn.",
    portuguese: "Não há nada pior do que retroceder.",
    context: 'risk'
  },
  {
    yoruba: "Òní là á ń ṣe iṣẹ́ ọ̀la.",
    portuguese: "É hoje que fazemos o trabalho de amanhã.",
    context: 'risk'
  },
  
  // Saudação/Greeting
  {
    yoruba: "Ẹ kú ọjọ́ mẹ́ta, Ọmọ Ifá!",
    portuguese: "Saudações, Filho de Ifá!",
    context: 'greeting'
  },
  {
    yoruba: "Àṣẹ o! Ọjọ́ yìí jẹ́ ọjọ́ ìmọ̀.",
    portuguese: "Àṣẹ! Que este dia seja um dia de conhecimento.",
    context: 'greeting'
  },
  {
    yoruba: "Ìwà rere ni ẹ̀wà ènìyàn.",
    portuguese: "O bom caráter é a beleza da pessoa.",
    context: 'greeting'
  },
];

export const getRandomProverb = (context?: YorubaProverb['context']): YorubaProverb => {
  const filtered = context 
    ? YORUBA_PROVERBS.filter(p => p.context === context)
    : YORUBA_PROVERBS;
  return filtered[Math.floor(Math.random() * filtered.length)];
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
