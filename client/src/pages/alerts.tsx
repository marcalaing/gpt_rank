import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface AlertEvent {
  id: string;
  message: string;
  createdAt: Date;
  acknowledged: boolean;
}

export default function AlertsPage() {
  const { data: alerts = [], isLoading } = useQuery<AlertEvent[]>({
    queryKey: ["/api/notifications"],
  });

  return (
    <AppLayout breadcrumbs={[{ label: "Alerts" }]}>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Alerts
            </h1>
            <p className="text-muted-foreground mt-1">
              Recent alerts and notifications from all your projects
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center py-12">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No alerts yet</h3>
              <p className="text-muted-foreground">
                You'll see notifications here when there are changes to your projects
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Card key={alert.id} className={alert.acknowledged ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      {alert.acknowledged ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-medium break-words">
                          {alert.message}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {format(new Date(alert.createdAt), "PPp")}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={alert.acknowledged ? "secondary" : "default"} className="flex-shrink-0">
                      {alert.acknowledged ? "Read" : "New"}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
