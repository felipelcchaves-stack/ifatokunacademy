import { Check, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { 
  validatePassword, 
  getPasswordStrengthLabel, 
  getPasswordStrengthColor,
  type PasswordStrength 
} from "@/lib/passwordValidation";

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
}

export function PasswordStrengthIndicator({ 
  password, 
  showRequirements = true 
}: PasswordStrengthIndicatorProps) {
  const strength: PasswordStrength = validatePassword(password);
  const progressValue = (strength.score / 6) * 100;

  if (!password) {
    return null;
  }

  return (
    <div className="space-y-2 mt-2">
      {/* Barra de progresso */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">Força da senha:</span>
          <span className={`text-xs font-medium ${
            strength.score <= 2 ? 'text-destructive' : 
            strength.score <= 3 ? 'text-yellow-600' : 
            'text-green-600'
          }`}>
            {getPasswordStrengthLabel(strength.score)}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-300 ${getPasswordStrengthColor(strength.score)}`}
            style={{ width: `${progressValue}%` }}
          />
        </div>
      </div>

      {/* Lista de requisitos */}
      {showRequirements && (
        <div className="grid grid-cols-2 gap-1 text-xs">
          <RequirementItem 
            met={strength.requirements.minLength} 
            text="Mínimo 8 caracteres" 
          />
          <RequirementItem 
            met={strength.requirements.hasUppercase} 
            text="Letra maiúscula" 
          />
          <RequirementItem 
            met={strength.requirements.hasLowercase} 
            text="Letra minúscula" 
          />
          <RequirementItem 
            met={strength.requirements.hasNumber} 
            text="Número" 
          />
          <RequirementItem 
            met={strength.requirements.hasSpecial} 
            text="Caractere especial" 
          />
          <RequirementItem 
            met={strength.requirements.notCommon} 
            text="Não é senha comum" 
          />
        </div>
      )}
    </div>
  );
}

function RequirementItem({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-1 ${met ? 'text-green-600' : 'text-muted-foreground'}`}>
      {met ? (
        <Check className="h-3 w-3" />
      ) : (
        <X className="h-3 w-3" />
      )}
      <span>{text}</span>
    </div>
  );
}
