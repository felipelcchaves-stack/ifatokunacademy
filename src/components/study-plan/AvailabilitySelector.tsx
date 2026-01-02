import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Clock, Calendar } from 'lucide-react';
import { DayAvailability, TimeSlot } from '@/hooks/useStudyPlan';

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

const TIME_OPTIONS = Array.from({ length: 24 * 2 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

const SESSION_DURATIONS = [
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h30' },
  { value: 120, label: '2 horas' },
];

const PREFERRED_TIMES = [
  { value: 'morning', label: 'Manhã (6h - 12h)' },
  { value: 'afternoon', label: 'Tarde (12h - 18h)' },
  { value: 'evening', label: 'Noite (18h - 23h)' },
];

interface AvailabilitySelectorProps {
  initialAvailability?: DayAvailability[];
  initialSessionDuration?: number;
  initialPreferredTime?: string;
  onSave: (availability: DayAvailability[], sessionDuration: number, preferredTime: string) => Promise<void>;
  saving?: boolean;
}

export const AvailabilitySelector: React.FC<AvailabilitySelectorProps> = ({
  initialAvailability = [],
  initialSessionDuration = 45,
  initialPreferredTime = 'evening',
  onSave,
  saving = false,
}) => {
  const [availability, setAvailability] = useState<DayAvailability[]>(initialAvailability);
  const [sessionDuration, setSessionDuration] = useState(initialSessionDuration);
  const [preferredTime, setPreferredTime] = useState(initialPreferredTime);

  const isDayEnabled = (day: number) => {
    return availability.some(a => a.day === day);
  };

  const getDaySlots = (day: number): TimeSlot[] => {
    const dayAvail = availability.find(a => a.day === day);
    return dayAvail?.slots || [];
  };

  const toggleDay = (day: number) => {
    if (isDayEnabled(day)) {
      setAvailability(availability.filter(a => a.day !== day));
    } else {
      // Adicionar com slot padrão baseado no horário preferido
      let defaultStart = '19:00';
      let defaultEnd = '20:30';
      
      if (preferredTime === 'morning') {
        defaultStart = '07:00';
        defaultEnd = '08:30';
      } else if (preferredTime === 'afternoon') {
        defaultStart = '14:00';
        defaultEnd = '15:30';
      }
      
      setAvailability([
        ...availability,
        { day, slots: [{ start: defaultStart, end: defaultEnd }] },
      ].sort((a, b) => a.day - b.day));
    }
  };

  const addSlot = (day: number) => {
    setAvailability(availability.map(a => {
      if (a.day === day) {
        const lastSlot = a.slots[a.slots.length - 1];
        const newStart = lastSlot?.end || '19:00';
        const [h, m] = newStart.split(':').map(Number);
        const newEndH = h + 1;
        const newEnd = `${newEndH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
        return {
          ...a,
          slots: [...a.slots, { start: newStart, end: newEnd }],
        };
      }
      return a;
    }));
  };

  const removeSlot = (day: number, slotIndex: number) => {
    setAvailability(availability.map(a => {
      if (a.day === day) {
        const newSlots = a.slots.filter((_, i) => i !== slotIndex);
        if (newSlots.length === 0) {
          return null;
        }
        return { ...a, slots: newSlots };
      }
      return a;
    }).filter(Boolean) as DayAvailability[]);
  };

  const updateSlot = (day: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    setAvailability(availability.map(a => {
      if (a.day === day) {
        return {
          ...a,
          slots: a.slots.map((slot, i) =>
            i === slotIndex ? { ...slot, [field]: value } : slot
          ),
        };
      }
      return a;
    }));
  };

  const handleSave = async () => {
    await onSave(availability, sessionDuration, preferredTime);
  };

  const totalWeeklyHours = availability.reduce((total, day) => {
    return total + day.slots.reduce((dayTotal, slot) => {
      const [startH, startM] = slot.start.split(':').map(Number);
      const [endH, endM] = slot.end.split(':').map(Number);
      const minutes = (endH * 60 + endM) - (startH * 60 + startM);
      return dayTotal + minutes / 60;
    }, 0);
  }, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          Defina sua Disponibilidade Semanal
        </CardTitle>
        <CardDescription>
          Selecione os dias e horários que você pode dedicar aos estudos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Preferências Gerais */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Duração preferida por sessão
            </label>
            <Select value={sessionDuration.toString()} onValueChange={(v) => setSessionDuration(Number(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value.toString()}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Horário preferido</label>
            <Select value={preferredTime} onValueChange={setPreferredTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREFERRED_TIMES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Seleção de Dias */}
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => (
            <div
              key={day.value}
              className={`border rounded-lg p-4 transition-colors ${
                isDayEnabled(day.value) ? 'border-primary bg-primary/5' : 'border-border'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={isDayEnabled(day.value)}
                    onCheckedChange={() => toggleDay(day.value)}
                    id={`day-${day.value}`}
                  />
                  <label
                    htmlFor={`day-${day.value}`}
                    className="font-medium cursor-pointer"
                  >
                    {day.label}
                  </label>
                </div>
                {isDayEnabled(day.value) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addSlot(day.value)}
                    className="text-primary"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Adicionar horário
                  </Button>
                )}
              </div>

              {isDayEnabled(day.value) && (
                <div className="space-y-2 ml-7">
                  {getDaySlots(day.value).map((slot, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Select
                        value={slot.start}
                        onValueChange={(v) => updateSlot(day.value, index, 'start', v)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">até</span>
                      <Select
                        value={slot.end}
                        onValueChange={(v) => updateSlot(day.value, index, 'end', v)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TIME_OPTIONS.map((time) => (
                            <SelectItem key={time} value={time}>
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {getDaySlots(day.value).length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSlot(day.value, index)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            <strong>Resumo:</strong> {availability.length} dia(s) selecionado(s) • {' '}
            {totalWeeklyHours.toFixed(1)} horas por semana
          </p>
        </div>

        {/* Botão Salvar */}
        <Button
          onClick={handleSave}
          disabled={saving || availability.length === 0}
          className="w-full"
        >
          {saving ? 'Salvando...' : 'Salvar Disponibilidade'}
        </Button>
      </CardContent>
    </Card>
  );
};
