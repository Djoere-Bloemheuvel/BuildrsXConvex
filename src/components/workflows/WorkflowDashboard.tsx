import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/integrations/convex/client';
import { useConvexAuth } from '@/hooks/useConvexAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';

export const WorkflowDashboard = () => {
  const { getClientId } = useConvexAuth();
  const clientId = getClientId();
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Queries
  const workflows = useQuery(
    api.workflowHelpers.listClientWorkflows,
    clientId ? { 
      clientId,
      status: selectedStatus === 'all' ? undefined : selectedStatus as any,
      limit: 50
    } : "skip"
  );

  // Mutations
  const cancelWorkflow = useMutation(api.workflowHelpers.cancelWorkflow);

  const handleCancelWorkflow = async (workflowId: string) => {
    if (!clientId) return;
    
    try {
      await cancelWorkflow({ workflowId, clientId });
      toast.success("Workflow cancelled successfully");
    } catch (error) {
      toast.error("Failed to cancel workflow");
      console.error(error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Activity className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatWorkflowType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatDuration = (startTime: number, endTime?: number) => {
    const end = endTime || Date.now();
    const duration = end - startTime;
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    return `${minutes}m`;
  };

  const getProgressPercentage = (progress: any) => {
    if (!progress || !progress.totalSteps) return 0;
    return Math.round((progress.completedSteps / progress.totalSteps) * 100);
  };

  if (!clientId) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Please sign in to view workflows</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Workflow Dashboard</h1>
          <p className="text-gray-600">Monitor and manage your automation workflows</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={selectedStatus === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('all')}
          >
            All
          </Button>
          <Button 
            variant={selectedStatus === 'running' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('running')}
          >
            Running
          </Button>
          <Button 
            variant={selectedStatus === 'completed' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('completed')}
          >
            Completed
          </Button>
          <Button 
            variant={selectedStatus === 'failed' ? 'default' : 'outline'}
            onClick={() => setSelectedStatus('failed')}
          >
            Failed
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {workflows && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                <span className="text-sm font-medium text-gray-600">Running</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {workflows.filter(w => w.status === 'running').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-sm font-medium text-gray-600">Completed</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {workflows.filter(w => w.status === 'completed').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                <span className="text-sm font-medium text-gray-600">Failed</span>
              </div>
              <p className="text-2xl font-bold mt-2">
                {workflows.filter(w => w.status === 'failed').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <Square className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-600">Total</span>
              </div>
              <p className="text-2xl font-bold mt-2">{workflows.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workflows List */}
      <Card>
        <CardHeader>
          <CardTitle>Active Workflows</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {workflows && workflows.length > 0 ? (
              workflows.map((workflow) => (
                <div key={workflow.workflowId} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(workflow.status)}
                      <div>
                        <h3 className="font-semibold">
                          {formatWorkflowType(workflow.workflowType)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          ID: {workflow.workflowId}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusBadgeColor(workflow.status)}>
                        {workflow.status}
                      </Badge>
                      {workflow.status === 'running' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelWorkflow(workflow.workflowId)}
                        >
                          <Square className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {workflow.progress && workflow.status === 'running' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{workflow.progress.currentStep}</span>
                        <span>
                          {workflow.progress.completedSteps}/{workflow.progress.totalSteps} steps
                        </span>
                      </div>
                      <Progress value={getProgressPercentage(workflow.progress)} />
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>
                      Started: {new Date(workflow.startedAt).toLocaleString()}
                    </span>
                    <span>
                      Duration: {formatDuration(workflow.startedAt, workflow.endedAt)}
                    </span>
                    {workflow.metadata.contactCount && (
                      <span>Contacts: {workflow.metadata.contactCount}</span>
                    )}
                    {workflow.metadata.leadCount && (
                      <span>Leads: {workflow.metadata.leadCount}</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No workflows found</h3>
                <p className="text-gray-600">
                  {selectedStatus === 'all' 
                    ? "You haven't started any workflows yet."
                    : `No ${selectedStatus} workflows found.`
                  }
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};