import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Phone, 
  Mail, 
  Linkedin, 
  Building2, 
  MapPin, 
  Activity, 
  MessageSquare, 
  FileText, 
  Calendar,
  User,
  Plus,
  Edit,
  MoreHorizontal,
  Globe,
  Users,
  Briefcase,
  Target,
  Clock,
  TrendingUp,
  Star,
  Send,
  Eye,
  CheckCircle
} from 'lucide-react';
import { useConvexAuth } from '@/hooks/useConvexAuth';
import { formatDistance } from 'date-fns';
import { nl } from 'date-fns/locale';

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'hot':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'warm':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'cold':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'qualified':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'unqualified':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

function getPriorityColor(priority: string) {
  switch (priority?.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatCurrency(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export default function ContactDetail() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoaded } = useConvexAuth();
  const [activeTab, setActiveTab] = useState('overview');

  if (!contactId) {
    return <div>Contact ID niet gevonden</div>;
  }

  const contact = useQuery(api.contacts.getById, { id: contactId as Id<"contacts"> });
  const deals = useQuery(api.contacts.getDeals, { contactId: contactId as Id<"contacts"> });
  const activities = useQuery(api.contacts.getActivities, { contactId: contactId as Id<"contacts">, limit: 20 });
  const communications = useQuery(api.contacts.getCommunications, { contactId: contactId as Id<"contacts">, limit: 15 });
  const notes = useQuery(api.contacts.getNotes, { contactId: contactId as Id<"contacts"> });
  const campaigns = useQuery(api.contacts.getCampaigns, { contactId: contactId as Id<"contacts"> });

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <div>Je moet ingelogd zijn om deze pagina te bekijken</div>;
  }

  if (contact === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading contact details...</div>
      </div>
    );
  }

  if (contact === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar Contacts
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Contact niet gevonden
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Naamloos Contact';
  const domain = contact.companyDomain || (contact.companyWebsite ? contact.companyWebsite.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : '');
  const avatarUrl = domain ? `https://logo.clearbit.com/${domain}` : null;
  const location = [contact.city, contact.state, contact.country].filter(Boolean).join(', ') || '—';
  const companyLocation = [contact.companyCity, contact.companyState, contact.companyCountry].filter(Boolean).join(', ') || '—';

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-gray-50 -m-6 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/contacts')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug naar Contacts
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {avatarUrl ? (
                  <img 
                    src={avatarUrl} 
                    alt="Company logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `<div class="text-sm font-medium">${contact.firstName?.[0] || ''}${contact.lastName?.[0] || 'C'}</div>`;
                    }}
                  />
                ) : (
                  <User className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>{contact.jobTitle || 'Functie onbekend'}</span>
                  {contact.companyName && (
                    <>
                      <span>•</span>
                      <Link 
                        to={`/accounts/${contact.companyId}`} 
                        className="hover:underline text-blue-600"
                      >
                        {contact.companyName}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
            {contact.status && (
              <Badge className={getStatusColor(contact.status)} variant="secondary">
                {contact.status}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {contact.email && (
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            )}
            {contact.mobilePhone && (
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4 mr-2" />
                Bellen
              </Button>
            )}
            <Button variant="outline" size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Bewerken
            </Button>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Main Content */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger value="overview">Overzicht</TabsTrigger>
                  <TabsTrigger value="activity">Activiteiten</TabsTrigger>
                  <TabsTrigger value="communications">Communicatie</TabsTrigger>
                  <TabsTrigger value="deals">Deals</TabsTrigger>
                  <TabsTrigger value="campaigns">Campagnes</TabsTrigger>
                  <TabsTrigger value="notes">Notities</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Totale Deal Waarde</p>
                            <p className="text-2xl font-bold">
                              {deals ? formatCurrency(deals.reduce((sum, deal) => sum + (deal.value || 0), 0)) : '—'}
                            </p>
                          </div>
                          <TrendingUp className="w-8 h-8 text-green-600" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Actieve Deals</p>
                            <p className="text-2xl font-bold">
                              {deals ? deals.filter(d => d.status === 'active').length : 0}
                            </p>
                          </div>
                          <Briefcase className="w-8 h-8 text-blue-600" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Campagnes</p>
                            <p className="text-2xl font-bold">
                              {campaigns ? campaigns.length : 0}
                            </p>
                          </div>
                          <Target className="w-8 h-8 text-purple-600" />
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Laatste Contact</p>
                            <p className="text-sm font-bold">
                              {contact.lastCommunicationAt 
                                ? formatDistance(new Date(contact.lastCommunicationAt), new Date(), { 
                                    addSuffix: true, 
                                    locale: nl 
                                  })
                                : '—'
                              }
                            </p>
                          </div>
                          <Clock className="w-8 h-8 text-orange-600" />
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Recente Activiteiten
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {activities && activities.length > 0 ? (
                        <div className="space-y-4">
                          {activities.slice(0, 5).map((activity) => (
                            <div key={activity._id} className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Activity className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{activity.action}</p>
                                {activity.description && (
                                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {formatDistance(
                                    new Date(activity.timestamp || activity._creationTime), 
                                    new Date(), 
                                    { addSuffix: true, locale: nl }
                                  )}
                                </p>
                              </div>
                              {activity.priority && (
                                <Badge className={getPriorityColor(activity.priority)} variant="secondary">
                                  {activity.priority}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Geen recente activiteiten</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="activity" className="mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Alle Activiteiten
                      </CardTitle>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Nieuwe Activiteit
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {activities && activities.length > 0 ? (
                        <div className="space-y-4">
                          {activities.map((activity) => (
                            <div key={activity._id} className="flex items-start gap-3 p-3 rounded-lg border">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                <Activity className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">{activity.action}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistance(
                                      new Date(activity.timestamp || activity._creationTime), 
                                      new Date(), 
                                      { addSuffix: true, locale: nl }
                                    )}
                                  </p>
                                </div>
                                {activity.description && (
                                  <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  {activity.category && (
                                    <Badge variant="outline">{activity.category}</Badge>
                                  )}
                                  {activity.priority && (
                                    <Badge className={getPriorityColor(activity.priority)} variant="secondary">
                                      {activity.priority}
                                    </Badge>
                                  )}
                                  {activity.isSystemGenerated && (
                                    <Badge variant="outline">Automatisch</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Geen activiteiten gevonden</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="communications" className="mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Communicatie Geschiedenis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {communications && communications.length > 0 ? (
                        <div className="space-y-4">
                          {communications.map((comm) => (
                            <div key={comm._id} className="flex items-start gap-3 p-3 rounded-lg border">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                comm.direction === 'outbound' ? 'bg-blue-100' : 'bg-green-100'
                              }`}>
                                {comm.channel === 'email' ? (
                                  <Mail className="w-4 h-4" />
                                ) : comm.channel === 'linkedin' ? (
                                  <Linkedin className="w-4 h-4" />
                                ) : (
                                  <MessageSquare className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">
                                    {comm.direction === 'outbound' ? 'Uitgaand' : 'Inkomend'} {comm.channel}
                                    {comm.campaignName && ` - ${comm.campaignName}`}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistance(new Date(comm.timestamp), new Date(), { addSuffix: true, locale: nl })}
                                  </p>
                                </div>
                                {comm.content && (
                                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{comm.content}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  {comm.type && <Badge variant="outline">{comm.type}</Badge>}
                                  {comm.sentiment && <Badge variant="outline">{comm.sentiment}</Badge>}
                                  {comm.isAutomated && <Badge variant="outline">Automatisch</Badge>}
                                  {comm.isRead && <Eye className="w-4 h-4 text-green-600" />}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Geen communicatie geschiedenis gevonden</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="deals" className="mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Deals & Opportunities
                      </CardTitle>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Nieuwe Deal
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {deals && deals.length > 0 ? (
                        <div className="space-y-4">
                          {deals.map((deal) => (
                            <div key={deal._id} className="flex items-center justify-between p-4 rounded-lg border">
                              <div className="flex-1">
                                <h3 className="font-medium">{deal.title}</h3>
                                {deal.description && (
                                  <p className="text-sm text-muted-foreground">{deal.description}</p>
                                )}
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="outline">{deal.status}</Badge>
                                  {deal.stageName && <Badge variant="secondary">{deal.stageName}</Badge>}
                                  {deal.pipelineName && <Badge variant="outline">{deal.pipelineName}</Badge>}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold">
                                  {deal.value ? formatCurrency(deal.value, deal.currency) : '—'}
                                </p>
                                {deal.confidence && (
                                  <p className="text-sm text-muted-foreground">{deal.confidence}% kans</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Geen deals gevonden</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="campaigns" className="mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Campagne Geschiedenis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {campaigns && campaigns.length > 0 ? (
                        <div className="space-y-4">
                          {campaigns.map((campaign) => (
                            <div key={campaign._id} className="flex items-center justify-between p-4 rounded-lg border">
                              <div className="flex-1">
                                <h3 className="font-medium">{campaign.campaignName || 'Naamloze Campagne'}</h3>
                                <div className="flex items-center gap-2 mt-2">
                                  {campaign.campaignType && <Badge variant="outline">{campaign.campaignType}</Badge>}
                                  {campaign.campaignStatus && <Badge variant="secondary">{campaign.campaignStatus}</Badge>}
                                  {campaign.status && <Badge variant="outline">{campaign.status}</Badge>}
                                </div>
                              </div>
                              <div className="text-right text-sm text-muted-foreground">
                                {campaign.addedAt && (
                                  <p>Toegevoegd {formatDistance(new Date(campaign.addedAt), new Date(), { addSuffix: true, locale: nl })}</p>
                                )}
                                {campaign.completedAt && (
                                  <p>Voltooid {formatDistance(new Date(campaign.completedAt), new Date(), { addSuffix: true, locale: nl })}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Geen campagne geschiedenis gevonden</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="notes" className="mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        Notities
                      </CardTitle>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-2" />
                        Nieuwe Notitie
                      </Button>
                    </CardHeader>
                    <CardContent>
                      {notes && notes.length > 0 ? (
                        <div className="space-y-4">
                          {notes.map((note) => (
                            <div key={note._id} className="p-4 rounded-lg border">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {note.authorName && (
                                    <Badge variant="outline">{note.authorName}</Badge>
                                  )}
                                  {note.type && (
                                    <Badge variant="secondary">{note.type}</Badge>
                                  )}
                                  {note.isAiGenerated && (
                                    <Badge variant="outline">AI Generated</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistance(new Date(note._creationTime), new Date(), { addSuffix: true, locale: nl })}
                                </p>
                              </div>
                              <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Geen notities gevonden</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="w-96 bg-white border-l border-gray-200 p-6 overflow-auto">
            {/* Contact Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Contact Informatie</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="hover:underline">
                      {contact.email}
                    </a>
                  </div>
                )}
                
                {contact.mobilePhone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${contact.mobilePhone}`} className="hover:underline">
                      {contact.mobilePhone}
                    </a>
                  </div>
                )}
                
                {contact.linkedinUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <Linkedin className="w-4 h-4 text-muted-foreground" />
                    <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="hover:underline">
                      LinkedIn Profiel
                    </a>
                  </div>
                )}
                
                {location !== '—' && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{location}</span>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted-foreground">Status</div>
                  <div className="text-right">{contact.status || '—'}</div>
                  
                  <div className="text-muted-foreground">Functiegroep</div>
                  <div className="text-right">{contact.functionGroup || '—'}</div>
                  
                  <div className="text-muted-foreground">Seniority</div>
                  <div className="text-right">{contact.seniority || '—'}</div>
                  
                  <div className="text-muted-foreground">Opted In</div>
                  <div className="text-right">
                    {contact.optedIn ? (
                      <CheckCircle className="w-4 h-4 text-green-600 inline" />
                    ) : (
                      <span className="text-muted-foreground">Nee</span>
                    )}
                  </div>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Gekocht op {new Date(contact.purchasedAt).toLocaleDateString('nl-NL')}
                </div>
              </CardContent>
            </Card>

            {/* Company Info */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Bedrijf Informatie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Link 
                    to={`/accounts/${contact.companyId}`}
                    className="font-medium hover:underline text-blue-600"
                  >
                    {contact.companyName || 'Onbekend Bedrijf'}
                  </Link>
                </div>

                {contact.companyWebsite && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-muted-foreground" />
                    <a 
                      href={contact.companyWebsite.startsWith('http') ? contact.companyWebsite : `https://${contact.companyWebsite}`}
                      target="_blank" 
                      rel="noreferrer" 
                      className="hover:underline"
                    >
                      {contact.companyWebsite.replace(/^https?:\/\//, '')}
                    </a>
                  </div>
                )}

                {contact.companyLinkedinUrl && (
                  <div className="flex items-center gap-2 text-sm">
                    <Linkedin className="w-4 h-4 text-muted-foreground" />
                    <a href={contact.companyLinkedinUrl} target="_blank" rel="noreferrer" className="hover:underline">
                      LinkedIn Bedrijfspagina
                    </a>
                  </div>
                )}

                {companyLocation !== '—' && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{companyLocation}</span>
                  </div>
                )}

                <Separator />

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted-foreground">Industrie</div>
                  <div className="text-right">{contact.industryLabel || '—'}</div>
                  
                  <div className="text-muted-foreground">Sub-industrie</div>
                  <div className="text-right">{contact.subindustryLabel || '—'}</div>
                  
                  <div className="text-muted-foreground">Bedrijfsgrootte</div>
                  <div className="text-right">
                    {contact.companySize ? `${contact.companySize} medewerkers` : '—'}
                  </div>
                </div>

                {contact.shortCompanySummary && (
                  <div className="text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Samenvatting:</p>
                    <p>{contact.shortCompanySummary}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Snelle Acties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Send className="w-4 h-4 mr-2" />
                  Stuur E-mail
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Maak Deal
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Plan Meeting
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Voeg Notitie Toe
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Target className="w-4 h-4 mr-2" />
                  Voeg toe aan Campagne
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}