import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

interface ScoreCardProps {
  title: string;
  value: number;
  trend?: number;
  description?: string;
  icon?: React.ReactNode;
}

export function ScoreCard({
  title,
  value,
  trend,
  description,
  icon,
}: ScoreCardProps) {
  const trendUp = trend != null && trend > 0;
  const trendDown = trend != null && trend < 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm text-muted-foreground font-medium">
            {title}
          </CardTitle>
          {icon && (
            <span className="text-muted-foreground [&_svg]:size-4">
              {icon}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-mono font-semibold tracking-tight text-foreground">
            {value.toFixed(1)}
          </span>

          {trend != null && trend !== 0 && (
            <span
              className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium ${
                trendUp
                  ? "bg-emerald-500/15 text-emerald-400"
                  : trendDown
                    ? "bg-red-500/15 text-red-400"
                    : ""
              }`}
            >
              {trendUp ? "\u2191" : "\u2193"}{" "}
              {Math.abs(trend).toFixed(1)}
            </span>
          )}
        </div>

        {description && (
          <CardDescription className="mt-1">{description}</CardDescription>
        )}
      </CardContent>
    </Card>
  );
}
