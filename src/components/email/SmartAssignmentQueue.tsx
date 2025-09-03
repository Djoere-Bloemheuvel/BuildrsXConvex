import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, Users, Zap, CheckCircle, Timer, Package } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { nl } from 'date-fns/locale';

interface SmartAssignmentQueueProps {
  clientId: string;
}

export default function SmartAssignmentQueue({ clientId }: SmartAssignmentQueueProps) {
  // Get pending assignments count
  const pendingCount = useQuery(api.smartAssignmentQueue.getPendingAssignmentCount, {
    clientId: clientId as any,
  });

  // Get recent assignments (last 24h)
  const recentAssignments = useQuery(api.smartAssignmentQueue.getRecentAssignments, {
    clientId: clientId as any,
    hours: 24,
  });

  // Get pending assignment details (limited to 10 for preview)
  const pendingAssignments = useQuery(api.smartAssignmentQueue.getPendingAssignments, {
    clientId: clientId as any,
    limit: 10,
  });

  // Progressive loading - show layout immediately, populate sections as data loads

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Smart Assignment Queue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Queue Status Summary - Progressive Loading */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Timer className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              {pendingCount !== undefined ? (
                <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
              ) : (
                <div className="flex items-center justify-center h-8 w-12">
                  <div className="w-5 h-5 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
                </div>
              )}
              <div className="text-sm text-muted-foreground">In wachtrij</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div>
              {recentAssignments !== undefined ? (
                <div className="text-2xl font-bold text-green-600">{recentAssignments.length}</div>
              ) : (
                <div className="flex items-center justify-center h-8 w-12">
                  <div className="w-5 h-5 border-2 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
                </div>
              )}
              <div className="text-sm text-muted-foreground">Laatste 24u</div>
            </div>
          </div>
        </div>

        {/* Status Message - Progressive Loading */}
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2 text-blue-700">
            <Zap className="h-4 w-4" />
            {pendingCount !== undefined ? (
              <span className="text-sm font-medium">
                {pendingCount > 0 
                  ? `${pendingCount} contacten worden morgen om 08:00 automatisch toegewezen`
                  : 'Geen contacten in wachtrij - alles is up-to-date'
                }
              </span>
            ) : (
              <div className="h-4 bg-gray-200 rounded animate-pulse w-64"></div>
            )}
          </div>
        </div>

        {/* Pending Assignments Preview - Progressive Loading */}
        {pendingAssignments !== undefined ? (
          pendingAssignments.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Wachtende toewijzingen</span>
              </div>
              
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {pendingAssignments.map((assignment) => (
                    <div
                      key={assignment.contactId}
                      className="flex items-center justify-between p-2 bg-gray-50 rounded-md text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {assignment.firstName} {assignment.lastName}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {assignment.companyName}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <Badge variant="outline" className="text-xs">
                          {assignment.campaignName?.length > 15 
                            ? `${assignment.campaignName.substring(0, 15)}...`
                            : assignment.campaignName
                          }
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {pendingCount && pendingCount > 10 && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      +{pendingCount - 10} meer in wachtrij
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : null
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Wachtende toewijzingen</span>
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-16"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Assignments Preview - Progressive Loading */}
        {recentAssignments !== undefined ? (
          recentAssignments.length > 0 ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Recent toegewezen</span>
              </div>
              
              <ScrollArea className="h-24">
                <div className="space-y-1">
                  {recentAssignments.slice(0, 5).map((assignment) => (
                    <div
                      key={assignment.contactId}
                      className="flex items-center justify-between p-2 bg-green-50 rounded-md text-sm"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {assignment.firstName} {assignment.lastName}
                        </div>
                        <div className="text-muted-foreground truncate">
                          {assignment.companyName}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-2 text-xs text-green-600">
                        {assignment.lastAssignmentAt && formatDistanceToNow(assignment.lastAssignmentAt, {
                          addSuffix: true,
                          locale: nl
                        })}
                      </div>
                    </div>
                  ))}
                  
                  {recentAssignments.length > 5 && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      +{recentAssignments.length - 5} meer recent toegewezen
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : null
        ) : (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Recent toegewezen</span>
            </div>
            <div className="space-y-1">
              {[1, 2].map((i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-green-50 rounded-md">
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-12"></div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {pendingCount === 0 && (!recentAssignments || recentAssignments.length === 0) && (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Geen Smart Assignment activiteit</p>
            <p className="text-xs">Gebruik de "Start Smart Assignment" knop om kandidaten toe te wijzen</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}