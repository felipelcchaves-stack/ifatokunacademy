// Mock data for Offe Orunmila Learning Platform
// All data is fully editable through the admin panel

export interface Exercise {
  id: string;
  type: 'reading' | 'drag-drop' | 'fill-columns' | 'flashcard' | 'video' | 'memorization';
  title: string;
  content: any;
  order: number;
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  duration: string;
  exercises: Exercise[];
  completed: boolean;
  order: number;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  type: 'proficiency' | 'thematic';
  level?: 'Akapo' | 'Awo' | 'Oluwo';
  theme?: string;
  image: string;
  lessons: Lesson[];
  progress: number;
  totalLessons: number;
  color: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'admin';
  enrolledModules: string[];
  progress: Record<string, number>;
  createdAt: string;
}

// Proficiency Modules
export const proficiencyModules: Module[] = [
  {
    id: 'akapo-1',
    title: 'Akapo',
    description: 'O início da jornada. Fundamentos essenciais para compreender os mistérios de Ifá.',
    type: 'proficiency',
    level: 'Akapo',
    image: '/modules/akapo.jpg',
    progress: 35,
    totalLessons: 12,
    color: 'from-gold-400 to-gold-600',
    lessons: [
      {
        id: 'akapo-lesson-1',
        title: 'Introdução ao Ifá',
        description: 'Conhecendo a história e os fundamentos do sistema oracular de Ifá.',
        duration: '25 min',
        completed: true,
        order: 1,
        exercises: [
          {
            id: 'ex-1',
            type: 'reading',
            title: 'A Origem de Ifá',
            order: 1,
            content: {
              text: 'Ifá é um sistema de adivinhação que se originou entre o povo Yorubá da África Ocidental. Orunmilá, também conhecido como Ifá, é o Orixá da sabedoria e do destino. Ele testemunhou a criação do universo e conhece o destino de todos os seres.',
              audioUrl: null,
            },
          },
          {
            id: 'ex-2',
            type: 'flashcard',
            title: 'Vocabulário Básico',
            order: 2,
            content: {
              cards: [
                { front: 'Orunmilá', back: 'Orixá da sabedoria e do destino' },
                { front: 'Ifá', back: 'Sistema de adivinhação Yorubá' },
                { front: 'Odù', back: 'Signos ou figuras de Ifá' },
                { front: 'Babalawo', back: 'Sacerdote de Ifá' },
              ],
            },
          },
          {
            id: 'ex-3',
            type: 'drag-drop',
            title: 'Organize os Conceitos',
            order: 3,
            content: {
              items: ['Orunmilá', 'Babalawo', 'Odù', 'Opele'],
              targets: ['Orixá', 'Sacerdote', 'Signo', 'Instrumento'],
              correctMatches: {
                'Orunmilá': 'Orixá',
                'Babalawo': 'Sacerdote',
                'Odù': 'Signo',
                'Opele': 'Instrumento',
              },
            },
          },
        ],
      },
      {
        id: 'akapo-lesson-2',
        title: 'Os 16 Odù Principais',
        description: 'Estudo inicial dos dezesseis Odù Meji, pilares do sistema de Ifá.',
        duration: '40 min',
        completed: true,
        order: 2,
        exercises: [
          {
            id: 'ex-4',
            type: 'memorization',
            title: 'Os Nomes dos Odù Meji',
            order: 1,
            content: {
              items: [
                'Eji Ogbe', 'Oyeku Meji', 'Iwori Meji', 'Odi Meji',
                'Irosun Meji', 'Owonrin Meji', 'Obara Meji', 'Okanran Meji',
                'Ogunda Meji', 'Osa Meji', 'Ika Meji', 'Oturupon Meji',
                'Otura Meji', 'Irete Meji', 'Ose Meji', 'Ofun Meji',
              ],
            },
          },
          {
            id: 'ex-5',
            type: 'fill-columns',
            title: 'Complete as Colunas',
            order: 2,
            content: {
              columns: ['Odù', 'Significado', 'Elemento'],
              rows: [
                { 'Odù': 'Eji Ogbe', 'Significado': '', 'Elemento': 'Luz' },
                { 'Odù': 'Oyeku Meji', 'Significado': '', 'Elemento': 'Escuridão' },
              ],
              answers: {
                'Eji Ogbe-Significado': 'Pureza e Clareza',
                'Oyeku Meji-Significado': 'Mistério e Profundidade',
              },
            },
          },
        ],
      },
      {
        id: 'akapo-lesson-3',
        title: 'Ética e Conduta',
        description: 'Os princípios éticos fundamentais na prática de Ifá.',
        duration: '30 min',
        completed: false,
        order: 3,
        exercises: [],
      },
    ],
  },
  {
    id: 'awo-1',
    title: 'Awo',
    description: 'O caminho do conhecimento. Aprofundamento nos segredos e rituais sagrados.',
    type: 'proficiency',
    level: 'Awo',
    image: '/modules/awo.jpg',
    progress: 0,
    totalLessons: 16,
    color: 'from-earth-400 to-earth-600',
    lessons: [],
  },
  {
    id: 'oluwo-1',
    title: 'Oluwo',
    description: 'A maestria. Domínio completo dos conhecimentos e práticas avançadas.',
    type: 'proficiency',
    level: 'Oluwo',
    image: '/modules/oluwo.jpg',
    progress: 0,
    totalLessons: 20,
    color: 'from-accent to-red-700',
    lessons: [],
  },
];

// Thematic Modules
export const thematicModules: Module[] = [
  {
    id: 'lingua-yoruba-1',
    title: 'Língua Yorubá',
    description: 'Aprenda os fundamentos da língua Yorubá, essencial para compreender os textos sagrados.',
    type: 'thematic',
    theme: 'Língua Yoruba',
    image: '/modules/yoruba.jpg',
    progress: 20,
    totalLessons: 24,
    color: 'from-gold-500 to-amber-600',
    lessons: [
      {
        id: 'yoruba-lesson-1',
        title: 'Alfabeto e Pronúncia',
        description: 'Os sons e letras da língua Yorubá.',
        duration: '35 min',
        completed: true,
        order: 1,
        exercises: [
          {
            id: 'yoruba-ex-1',
            type: 'reading',
            title: 'O Alfabeto Yorubá',
            order: 1,
            content: {
              text: 'O alfabeto Yorubá consiste em 25 letras. As vogais são: a, e, ẹ, i, o, ọ, u. Os tons são essenciais para o significado das palavras. Existem três tons principais: alto (´), médio (sem marca) e baixo (`).',
              audioUrl: null,
            },
          },
          {
            id: 'yoruba-ex-2',
            type: 'video',
            title: 'Vídeo: Pronúncia Básica',
            order: 2,
            content: {
              videoUrl: 'https://example.com/video.mp4',
              duration: '10:30',
            },
          },
          {
            id: 'yoruba-ex-3',
            type: 'flashcard',
            title: 'Palavras Básicas',
            order: 3,
            content: {
              cards: [
                { front: 'Ọjọ́', back: 'Dia' },
                { front: 'Ọ̀run', back: 'Céu' },
                { front: 'Ayé', back: 'Mundo/Terra' },
                { front: 'Omi', back: 'Água' },
                { front: 'Iná', back: 'Fogo' },
              ],
            },
          },
        ],
      },
      {
        id: 'yoruba-lesson-2',
        title: 'Saudações e Expressões',
        description: 'As saudações tradicionais e expressões cotidianas.',
        duration: '30 min',
        completed: false,
        order: 2,
        exercises: [],
      },
    ],
  },
  {
    id: 'oogun-1',
    title: 'Oogun',
    description: 'O estudo das folhas sagradas e suas aplicações medicinais e espirituais.',
    type: 'thematic',
    theme: 'Oogun',
    image: '/modules/oogun.jpg',
    progress: 0,
    totalLessons: 18,
    color: 'from-green-600 to-emerald-700',
    lessons: [],
  },
  {
    id: 'iyami-1',
    title: 'Iyami',
    description: 'Compreendendo o poder feminino ancestral e seu papel na tradição.',
    type: 'thematic',
    theme: 'Iyami',
    image: '/modules/iyami.jpg',
    progress: 0,
    totalLessons: 14,
    color: 'from-purple-600 to-violet-700',
    lessons: [],
  },
  {
    id: 'imule-1',
    title: 'Imule',
    description: 'Os pactos sagrados e sua importância na prática espiritual.',
    type: 'thematic',
    theme: 'Imule',
    image: '/modules/imule.jpg',
    progress: 0,
    totalLessons: 10,
    color: 'from-blue-600 to-indigo-700',
    lessons: [],
  },
  {
    id: 'sise-orisa-1',
    title: 'Sise Orisa',
    description: 'O trabalho com os Orixás e as práticas rituais fundamentais.',
    type: 'thematic',
    theme: 'Sise Orisa',
    image: '/modules/sise-orisa.jpg',
    progress: 0,
    totalLessons: 22,
    color: 'from-orange-500 to-red-600',
    lessons: [],
  },
];

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'João Silva',
    email: 'joao@exemplo.com',
    role: 'student',
    enrolledModules: ['akapo-1', 'lingua-yoruba-1'],
    progress: {
      'akapo-1': 35,
      'lingua-yoruba-1': 20,
    },
    createdAt: '2024-01-15',
  },
  {
    id: 'admin-1',
    name: 'Oluwo Ifatokun',
    email: 'ifatokun@offeorunmila.com',
    role: 'admin',
    enrolledModules: [],
    progress: {},
    createdAt: '2024-01-01',
  },
];

export const getAllModules = (): Module[] => [...proficiencyModules, ...thematicModules];

export const getModuleById = (id: string): Module | undefined => 
  getAllModules().find(m => m.id === id);

export const getLessonById = (moduleId: string, lessonId: string): Lesson | undefined => {
  const module = getModuleById(moduleId);
  return module?.lessons.find(l => l.id === lessonId);
};
