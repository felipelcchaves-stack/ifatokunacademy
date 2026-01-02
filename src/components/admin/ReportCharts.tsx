import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--accent))",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(280, 65%, 60%)"
];

interface UserGrowthChartProps {
  data: { date: string; count: number }[];
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR })
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px"
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
          name="Novos usuários"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface ExerciseTypePieChartProps {
  data: { type: string; count: number; percentage: number }[];
}

const TYPE_LABELS: Record<string, string> = {
  reading: "Leitura",
  flashcard: "Flash Cards",
  quiz: "Quiz",
  drag_drop: "Arrastar/Soltar",
  fill_columns: "Preencher Colunas",
  memorization: "Memorização",
  video: "Vídeo"
};

export function ExerciseTypePieChart({ data }: ExerciseTypePieChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    name: TYPE_LABELS[d.type] || d.type
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={formattedData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={2}
          dataKey="count"
          label={({ name, percentage }) => `${name} (${percentage}%)`}
          labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
        >
          {formattedData.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px"
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface ModuleContentChartProps {
  data: {
    title: string;
    lessonsCount: number;
    exercisesCount: number;
  }[];
}

export function ModuleContentChart({ data }: ModuleContentChartProps) {
  const truncatedData = data.map((d) => ({
    ...d,
    name: d.title.length > 15 ? d.title.slice(0, 15) + "..." : d.title
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={truncatedData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <YAxis
          type="category"
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
          width={120}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px"
          }}
        />
        <Legend />
        <Bar dataKey="lessonsCount" fill="hsl(var(--primary))" name="Lições" />
        <Bar
          dataKey="exercisesCount"
          fill="hsl(var(--secondary))"
          name="Exercícios"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface ProgressActivityChartProps {
  data: { date: string; count: number }[];
}

export function ProgressActivityChart({ data }: ProgressActivityChartProps) {
  const formattedData = data.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "dd/MM", { locale: ptBR })
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={formattedData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis
          dataKey="label"
          stroke="hsl(var(--muted-foreground))"
          fontSize={12}
        />
        <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px"
          }}
        />
        <Area
          type="monotone"
          dataKey="count"
          stroke="hsl(var(--accent))"
          fill="hsl(var(--accent) / 0.3)"
          name="Exercícios completados"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
