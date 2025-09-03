import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useConvexAuth } from '@/hooks/useConvexAuth';

import {
  Mail,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Bot,
  User,
  Eye,
  Trash2,
  Archive,
  Filter,
  Search,
  Reply,
  Forward,
  Star,
  MoreHorizontal,
  Send,
  Sparkles,
  Bell
} from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

type Message = {
  _id: Id<"inboxMessages">;
  _creationTime: number;
  type: "incoming" | "ai_suggested" | "system" | "notification";
  status: "unread" | "read" | "pending_approval" | "approved" | "rejected" | "archived";
  priority: "low" | "normal" | "high" | "urgent";
  subject?: string;
  content: string;
  sender?: string;
  senderEmail?: string;
  contactId?: Id<"contacts">;
  campaignId?: Id<"campaigns">;
  aiConfidence?: number;
  suggestedAction?: string;
  originalMessageId?: string;
  metadata?: any;
};

function getMessageIcon(type: string) {
  switch (type) {
    case 'incoming':
      return <Mail className="w-4 h-4" />;
    case 'ai_suggested':
      return <Bot className="w-4 h-4" />;
    case 'system':
      return <MessageSquare className="w-4 h-4" />;
    case 'notification':
      return <Bell className="w-4 h-4" />;
    default:
      return <MessageSquare className="w-4 h-4" />;
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'normal':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'low':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function formatTimeAgo(timestamp: number) {
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Nu';
  if (minutes < 60) return `${minutes}m geleden`;
  if (hours < 24) return `${hours}u geleden`;
  if (days < 7) return `${days}d geleden`;
  return new Date(timestamp).toLocaleDateString('nl-NL');
}

export default function Inbox() {
  const { getClientId } = useConvexAuth();
  const clientId = getClientId();
  
  const [activeTab, setActiveTab] = useState('all');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Query messages
  const messages = useQuery(api.inbox.list, 
    clientId ? { clientId, status: activeTab === 'all' ? undefined : activeTab } : "skip"
  ) as Message[] | undefined;

  // Mutations
  const markAsRead = useMutation(api.inbox.markAsRead);
  const approveMessage = useMutation(api.inbox.approveMessage);
  const rejectMessage = useMutation(api.inbox.rejectMessage);
  const archiveMessage = useMutation(api.inbox.archiveMessage);

  // Filter messages
  const filteredMessages = messages?.filter(message => {
    if (!searchQuery) return true;
    return (
      message.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      message.sender?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }) || [];

  // Count by status
  const counts = {
    all: messages?.length || 0,
    unread: messages?.filter(m => m.status === 'unread').length || 0,
    pending_approval: messages?.filter(m => m.status === 'pending_approval').length || 0,
    ai_suggested: messages?.filter(m => m.type === 'ai_suggested').length || 0,
  };

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);
    if (message.status === 'unread') {
      await markAsRead({ messageId: message._id });
    }
  };

  const handleApprove = async (messageId: Id<"inboxMessages">) => {
    await approveMessage({ messageId });
    setSelectedMessage(null);
  };

  const handleReject = async (messageId: Id<"inboxMessages">) => {
    await rejectMessage({ messageId });
    setSelectedMessage(null);
  };

  const handleArchive = async (messageId: Id<"inboxMessages">) => {
    await archiveMessage({ messageId });
    setSelectedMessage(null);
  };

  if (!clientId) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-gray-50 -m-6">
      {/* Compact Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Inbox</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Zoek berichten..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-48 h-8"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Messages List */}
          <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
            {/* Compact Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <div className="p-3 border-b border-gray-200">
                <TabsList className="grid w-full grid-cols-4 h-8">
                  <TabsTrigger value="all" className="relative text-xs">
                    Alle ({counts.all})
                  </TabsTrigger>
                  <TabsTrigger value="unread" className="relative text-xs">
                    Ongelezen ({counts.unread})
                    {counts.unread > 0 && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="pending_approval" className="relative text-xs">
                    Te bevestigen ({counts.pending_approval})
                    {counts.pending_approval > 0 && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"></div>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="ai_suggested" className="text-xs">
                    AI ({counts.ai_suggested})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={activeTab} className="flex-1 overflow-auto p-0 mt-0">
                <div className="divide-y divide-gray-200">
                  {filteredMessages.map((message) => (
                    <div
                      key={message._id}
                      onClick={() => handleSelectMessage(message)}
                      className={`p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedMessage?._id === message._id ? 'bg-blue-50 border-r-2 border-blue-600' : ''
                      } ${message.status === 'unread' ? 'bg-blue-25' : ''}`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`p-1.5 rounded-full ${
                          message.type === 'ai_suggested' 
                            ? 'bg-purple-100 text-purple-600' 
                            : message.type === 'incoming'
                              ? 'bg-blue-100 text-blue-600'
                              : 'bg-gray-100 text-gray-600'
                        }`}>
                          {getMessageIcon(message.type)}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1">
                              {message.sender && (
                                <span className="text-xs font-medium text-gray-900 truncate">
                                  {message.sender}
                                </span>
                              )}
                              {message.type === 'ai_suggested' && (
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-gray-500">
                                {formatTimeAgo(message._creationTime)}
                              </span>
                              {message.priority === 'high' && <div className="w-2 h-2 bg-orange-500 rounded-full"></div>}
                              {message.priority === 'urgent' && <div className="w-2 h-2 bg-red-500 rounded-full"></div>}
                            </div>
                          </div>
                          
                          <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                            {message.subject || 'Geen onderwerp'}
                          </h3>
                          
                          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                            {message.content}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              {message.status === 'unread' && (
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                              )}
                              {message.status === 'pending_approval' && (
                                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                              )}
                            </div>
                            {message.aiConfidence && (
                              <span className="text-xs text-gray-500">
                                {Math.round(message.aiConfidence * 100)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredMessages.length === 0 && (
                    <div className="p-6 text-center text-gray-500">
                      <MessageSquare className="w-8 h-8 mx-auto mb-3 text-gray-300" />
                      <h3 className="text-sm font-medium text-gray-900 mb-1">Geen berichten</h3>
                      <p className="text-xs">Er zijn geen berichten in deze categorie.</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Message Detail */}
          <div className="flex-1 bg-white flex flex-col">
            {selectedMessage ? (
              <>
                {/* Compact Message Header */}
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-full ${
                        selectedMessage.type === 'ai_suggested' 
                          ? 'bg-purple-100 text-purple-600' 
                          : selectedMessage.type === 'incoming'
                            ? 'bg-blue-100 text-blue-600'
                            : 'bg-gray-100 text-gray-600'
                      }`}>
                        {getMessageIcon(selectedMessage.type)}
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {selectedMessage.subject || 'Geen onderwerp'}
                        </h2>
                        {selectedMessage.sender && (
                          <p className="text-xs text-gray-600">
                            Van: {selectedMessage.sender}
                            {selectedMessage.senderEmail && ` (${selectedMessage.senderEmail})`}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleArchive(selectedMessage._id)}>
                          <Archive className="w-4 h-4 mr-2" />
                          Archiveren
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Star className="w-4 h-4 mr-2" />
                          Markeer als belangrijk
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Verwijderen
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{formatTimeAgo(selectedMessage._creationTime)}</span>
                    {selectedMessage.priority !== 'normal' && (
                      <span className="capitalize">{selectedMessage.priority} prioriteit</span>
                    )}
                    {selectedMessage.aiConfidence && (
                      <span>{Math.round(selectedMessage.aiConfidence * 100)}% vertrouwen</span>
                    )}
                  </div>
                </div>

                {/* Compact Message Content */}
                <div className="flex-1 p-4 overflow-auto">
                  <div className="text-sm text-gray-900 whitespace-pre-wrap">
                    {selectedMessage.content}
                  </div>
                  
                  {selectedMessage.suggestedAction && (
                    <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Bot className="w-4 h-4 text-purple-600" />
                        <span className="text-sm font-medium text-purple-900">AI Suggestie</span>
                      </div>
                      <p className="text-sm text-purple-800">
                        {selectedMessage.suggestedAction}
                      </p>
                    </div>
                  )}
                </div>

                {/* Compact Action Buttons */}
                <div className="p-3 border-t border-gray-200 bg-gray-50">
                  {selectedMessage.status === 'pending_approval' && (
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm"
                        onClick={() => handleApprove(selectedMessage._id)}
                        className="bg-green-600 hover:bg-green-700 flex-1"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Goedkeuren
                      </Button>
                      <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(selectedMessage._id)}
                        className="text-red-600 border-red-300 hover:bg-red-50 flex-1"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Afwijzen
                      </Button>
                    </div>
                  )}
                  
                  {selectedMessage.status !== 'pending_approval' && (
                    <div className="flex items-center gap-2">
                      <Button size="sm" className="flex-1">
                        <Reply className="w-4 h-4 mr-2" />
                        Beantwoorden
                      </Button>
                      <Button size="sm" variant="outline">
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <h3 className="text-base font-medium text-gray-900 mb-1">Selecteer een bericht</h3>
                  <p className="text-sm">Kies een bericht uit de lijst om de details te bekijken.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}