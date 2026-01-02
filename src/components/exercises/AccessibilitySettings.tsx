import React from 'react';
import { 
  Settings, 
  Type, 
  Volume2, 
  Eye, 
  Palette,
  RotateCcw,
  Pause,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAccessibilityPreferences, AccessibilityPreferences } from '@/hooks/useAccessibilityPreferences';

interface AccessibilitySettingsProps {
  trigger?: React.ReactNode;
}

const AccessibilitySettings: React.FC<AccessibilitySettingsProps> = ({ trigger }) => {
  const { preferences, updatePreferences, resetPreferences } = useAccessibilityPreferences();

  return (
    <Sheet>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Settings className="w-4 h-4" />
            Acessibilidade
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-[340px] sm:w-[400px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Configurações de Acessibilidade
          </SheetTitle>
          <SheetDescription>
            Personalize sua experiência de estudo para máximo conforto e eficácia.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Typography Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Type className="w-4 h-4" />
              Tipografia
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="fontSize">Tamanho do texto</Label>
                <Select
                  value={preferences.fontSize}
                  onValueChange={(value) => updatePreferences({ fontSize: value as AccessibilityPreferences['fontSize'] })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="large">Grande</SelectItem>
                    <SelectItem value="xlarge">Extra Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="letterSpacing">Espaçamento entre letras</Label>
                <Select
                  value={preferences.letterSpacing}
                  onValueChange={(value) => updatePreferences({ letterSpacing: value as AccessibilityPreferences['letterSpacing'] })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="wide">Amplo</SelectItem>
                    <SelectItem value="wider">Muito Amplo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="lineHeight">Altura da linha</Label>
                <Select
                  value={preferences.lineHeight}
                  onValueChange={(value) => updatePreferences({ lineHeight: value as AccessibilityPreferences['lineHeight'] })}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="relaxed">Relaxado</SelectItem>
                    <SelectItem value="loose">Espaçado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="dyslexiaFont">Fonte para Dislexia</Label>
                  <p className="text-xs text-muted-foreground">Usa fonte otimizada para leitura</p>
                </div>
                <Switch
                  id="dyslexiaFont"
                  checked={preferences.dyslexiaFont}
                  onCheckedChange={(checked) => updatePreferences({ dyslexiaFont: checked })}
                />
              </div>
            </div>
          </div>

          {/* Visual Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Visual
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="highContrast">Alto Contraste</Label>
                  <p className="text-xs text-muted-foreground">Aumenta contraste do texto</p>
                </div>
                <Switch
                  id="highContrast"
                  checked={preferences.highContrast}
                  onCheckedChange={(checked) => updatePreferences({ highContrast: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="colorCoding">Codificação por Cores</Label>
                  <p className="text-xs text-muted-foreground">Alterna cores para facilitar leitura</p>
                </div>
                <Switch
                  id="colorCoding"
                  checked={preferences.colorCoding}
                  onCheckedChange={(checked) => updatePreferences({ colorCoding: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="reducedMotion">Reduzir Movimento</Label>
                  <p className="text-xs text-muted-foreground">Desativa animações</p>
                </div>
                <Switch
                  id="reducedMotion"
                  checked={preferences.reducedMotion}
                  onCheckedChange={(checked) => updatePreferences({ reducedMotion: checked })}
                />
              </div>
            </div>
          </div>

          {/* Audio Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Volume2 className="w-4 h-4" />
              Áudio
            </h3>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="autoPlayAudio">Áudio Automático</Label>
                  <p className="text-xs text-muted-foreground">Toca áudio ao mostrar texto</p>
                </div>
                <Switch
                  id="autoPlayAudio"
                  checked={preferences.autoPlayAudio}
                  onCheckedChange={(checked) => updatePreferences({ autoPlayAudio: checked })}
                />
              </div>
            </div>
          </div>

          {/* Pacing Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Pause className="w-4 h-4" />
              Ritmo de Estudo
            </h3>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Pausa entre fragmentos</Label>
                  <span className="text-sm text-muted-foreground">{preferences.pauseBetweenChunks}s</span>
                </div>
                <Slider
                  value={[preferences.pauseBetweenChunks]}
                  onValueChange={([value]) => updatePreferences({ pauseBetweenChunks: value })}
                  min={3}
                  max={15}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Preferred Mode Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Modo Preferido
            </h3>

            <Select
              value={preferences.preferredMode}
              onValueChange={(value) => updatePreferences({ preferredMode: value as AccessibilityPreferences['preferredMode'] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Clássico (digitar)</SelectItem>
                <SelectItem value="microlearning">Microlearning (3-5 palavras)</SelectItem>
                <SelectItem value="tap">Toque e Complete (sem digitar)</SelectItem>
                <SelectItem value="karaoke">Karaokê Visual</SelectItem>
                <SelectItem value="visual">Construção Visual</SelectItem>
                <SelectItem value="listen">Escuta e Repete</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={resetPreferences}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Padrões
          </Button>

          {/* Preview Text */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground mb-2">Prévia:</p>
            <p 
              className={`font-serif ${preferences.fontSize === 'large' ? 'text-xl' : preferences.fontSize === 'xlarge' ? 'text-2xl' : 'text-base'} ${preferences.letterSpacing === 'wide' ? 'tracking-wide' : preferences.letterSpacing === 'wider' ? 'tracking-wider' : ''} ${preferences.lineHeight === 'relaxed' ? 'leading-relaxed' : preferences.lineHeight === 'loose' ? 'leading-loose' : ''}`}
              style={{
                fontFamily: preferences.dyslexiaFont ? "'Comic Sans MS', sans-serif" : undefined,
                fontWeight: preferences.highContrast ? 600 : undefined,
              }}
            >
              Òrúnmìlà ní ó di àgbà tán...
            </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AccessibilitySettings;
