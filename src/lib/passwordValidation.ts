// Lista de senhas comuns/vazadas (100+)
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', 'master', 'dragon', 'letmein', 'login',
  'admin', 'welcome', 'password1', '1234567', 'sunshine',
  'princess', '123456789', 'qwerty123', 'password123', 'iloveyou',
  'admin123', 'letmein1', '12345', 'qwertyuiop', '1234567890',
  'football', 'baseball', 'welcome1', 'shadow', 'superman',
  'michael', 'ninja', 'mustang', 'password!', 'trustno1',
  'hello', 'charlie', 'donald', 'password1!', 'qwerty1',
  'jennifer', 'jordan', 'harley', 'robert', 'matthew',
  'access', 'love', 'master1', '1qaz2wsx', 'ashley',
  'thomas', 'hockey', 'ranger', 'passw0rd', 'killer',
  'soccer', 'batman', 'test123', 'george', 'andrew',
  'michelle', 'pepper', 'zaq12wsx', 'starwars', 'maverick',
  'secret', 'fuckyou', 'asshole', 'summer', 'nothing',
  'joshua', 'maggie', 'biteme', 'bailey', 'thunder',
  'ginger', 'spider', 'buster', 'tigger', 'cookie',
  'samantha', 'banana', 'whatever', 'hunter', 'cowboy',
  'soccer1', 'amanda', 'chicken', 'camaro', 'cheese',
  '123123', 'silver', 'diamond', 'sparky', 'turtle',
  'merlin', 'falcon', 'phoenix', 'jasmine', 'dolphin',
  // Senhas em português
  'senha', 'senha123', 'senha1', 'mudar123', 'admin123',
  '123mudar', 'mudar@123', 'brasil', 'brasil1', 'futbol',
  'flamengo', 'corinthians', 'palmeiras', 'santos', 'gremio',
  'botafogo', 'vasco', 'cruzeiro', 'saopaulo', 'inter',
  'amor', 'amor123', 'jesus', 'jesus123', 'deus',
  'familia', 'feliz', 'alegria', 'vitoria', 'sucesso'
];

export interface PasswordRequirements {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  notCommon: boolean;
}

export interface PasswordStrength {
  score: number; // 0-5
  requirements: PasswordRequirements;
  feedback: string[];
  isValid: boolean;
}

export function validatePassword(password: string): PasswordStrength {
  const requirements: PasswordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/'`;~]/.test(password),
    notCommon: !COMMON_PASSWORDS.includes(password.toLowerCase())
  };

  const feedback: string[] = [];

  if (!requirements.minLength) {
    feedback.push('Mínimo de 8 caracteres');
  }
  if (!requirements.hasUppercase) {
    feedback.push('Pelo menos uma letra maiúscula');
  }
  if (!requirements.hasLowercase) {
    feedback.push('Pelo menos uma letra minúscula');
  }
  if (!requirements.hasNumber) {
    feedback.push('Pelo menos um número');
  }
  if (!requirements.hasSpecial) {
    feedback.push('Pelo menos um caractere especial (!@#$%^&*)');
  }
  if (!requirements.notCommon) {
    feedback.push('Esta senha é muito comum, escolha outra');
  }

  // Calcular score (0-5)
  const score = Object.values(requirements).filter(Boolean).length;

  // Válido apenas se todos os requisitos forem atendidos
  const isValid = Object.values(requirements).every(Boolean);

  return {
    score,
    requirements,
    feedback,
    isValid
  };
}

export function getPasswordStrengthLabel(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'Muito fraca';
    case 2:
      return 'Fraca';
    case 3:
      return 'Média';
    case 4:
      return 'Forte';
    case 5:
    case 6:
      return 'Muito forte';
    default:
      return 'Muito fraca';
  }
}

export function getPasswordStrengthColor(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'bg-destructive';
    case 2:
      return 'bg-orange-500';
    case 3:
      return 'bg-yellow-500';
    case 4:
      return 'bg-lime-500';
    case 5:
    case 6:
      return 'bg-green-500';
    default:
      return 'bg-destructive';
  }
}

// Para validação server-side (edge function)
export function validatePasswordServerSide(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Senha deve ter no mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve conter pelo menos uma letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve conter pelo menos um número');
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/'`;~]/.test(password)) {
    errors.push('Senha deve conter pelo menos um caractere especial');
  }
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Esta senha é muito comum, escolha outra');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
