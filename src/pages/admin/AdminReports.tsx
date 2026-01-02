import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Users,
  BookOpen,
  FileText,
  PenTool,
  TrendingUp,
  BarChart3
} from "lucide-react";
import { useAdminReports, DateRange } from "@/hooks/useAdminReports";
import {
  UserGrowthChart,
  ExerciseTypePieChart,
  ModuleContentChart,
  ProgressActivityChart
} from "@/components/admin/ReportCharts";

interface KPICardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  isLoading?: boolean;
}

function KPICard({ title, value, icon, subtitle, isLoading }: KPICardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            {isLoading ? (
              <Skeleton className="h-8 w-20 mb-1" />
            ) : (
              <p className="text-2xl font-bold">{value}</p>
            )}
            <p className="text-sm text-muted-foreground">{title}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminReports() {
  const [dateRange, setDateRange] = useState<DateRange>("30d");
  const {
    contentStats,
    userStats,
    exerciseTypes,
    moduleDetails,
    progressActivity,
    isLoading
  } = useAdminReports(dateRange);

  const dateRangeLabel =
    dateRange === "7d"
      ? "últimos 7 dias"
      : dateRange === "30d"
      ? "últimos 30 dias"
      : dateRange === "90d"
      ? "últimos 90 dias"
      : "todo o período";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Visão geral da plataforma - {dateRangeLabel}
          </p>
        </div>
        <Select
          value={dateRange}
          onValueChange={(v) => setDateRange(v as DateRange)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="all">Todo o período</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total de Usuários"
          value={userStats.totalUsers}
          icon={<Users className="h-6 w-6 text-primary" />}
          subtitle={`+${userStats.newUsersThisPeriod} no período`}
          isLoading={isLoading}
        />
        <KPICard
          title="Módulos"
          value={contentStats.totalModules}
          icon={<BookOpen className="h-6 w-6 text-primary" />}
          subtitle={`${contentStats.publishedModules} publicados`}
          isLoading={isLoading}
        />
        <KPICard
          title="Lições"
          value={contentStats.totalLessons}
          icon={<FileText className="h-6 w-6 text-primary" />}
          isLoading={isLoading}
        />
        <KPICard
          title="Exercícios"
          value={contentStats.totalExercises}
          icon={<PenTool className="h-6 w-6 text-primary" />}
          isLoading={isLoading}
        />
        <KPICard
          title="Méd. Exerc./Lição"
          value={contentStats.avgExercisesPerLesson}
          icon={<TrendingUp className="h-6 w-6 text-primary" />}
          isLoading={isLoading}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Crescimento de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : userStats.userGrowthData.length > 0 ? (
              <UserGrowthChart data={userStats.userGrowthData} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados de crescimento no período
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tipos de Exercícios
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : exerciseTypes.length > 0 ? (
              <ExerciseTypePieChart data={exerciseTypes} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum exercício cadastrado
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Conteúdo por Módulo</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : moduleDetails.length > 0 ? (
              <ModuleContentChart data={moduleDetails} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhum módulo cadastrado
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividade de Progresso</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : progressActivity.length > 0 ? (
              <ProgressActivityChart data={progressActivity} />
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem atividade no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Module Details Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Detalhes dos Módulos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : moduleDetails.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Módulo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Lições</TableHead>
                  <TableHead className="text-center">Exercícios</TableHead>
                  <TableHead className="text-center">Conclusões</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {moduleDetails.map((module) => (
                  <TableRow key={module.id}>
                    <TableCell className="font-medium">{module.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{module.type}</Badge>
                    </TableCell>
                    <TableCell>
                      {module.isPublished ? (
                        <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">
                          Publicado
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Rascunho</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {module.lessonsCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {module.exercisesCount}
                    </TableCell>
                    <TableCell className="text-center">
                      {module.completionsCount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum módulo cadastrado
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
