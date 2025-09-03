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
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  ArrowLeft, 
  Building2,
  Globe2,
  MapPin, 
  Users as UsersIcon, 
  Phone, 
  Mail, 
  Linkedin, 
  Calendar,
  User,
  Plus,
  Edit,
  MoreHorizontal,
  Target,
  Zap,
  TrendingUp,
  Clock,
  Star,
  FileText,
  Activity,
  MessageSquare,
  Briefcase,
  Eye,
  CheckCircle,
  Filter
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

function getChannelIcon(channel: string) {
  switch (channel.toLowerCase()) {
    case 'email': return <Mail className="h-4 w-4" />
    case 'phone': return <Phone className="h-4 w-4" />
    case 'linkedin': return <Linkedin className="h-4 w-4" />
    case 'meeting': return <Calendar className="h-4 w-4" />
    default: return <FileText className="h-4 w-4" />
  }
}

function getLogo(domain?: string | null) {
  if (!domain) return null
  const clean = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  return `https://logo.clearbit.com/${clean}`
}

export default function AccountDetail() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, isLoaded, getClientId } = useConvexAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [contactSearch, setContactSearch] = useState('');
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState<string[]>(['email', 'phone', 'linkedin', 'meeting']);

  const clientId = getClientId();

  if (!companyId) {
    return <div>Bedrijf ID niet gevonden</div>;
  }

  const company = useQuery(api.companies.getByIdWithDetails, { id: companyId as Id<"companies"> });
  const contacts = useQuery(api.companies.getContacts, { 
    companyId: companyId as Id<"companies">,
    clientId: clientId as Id<"clients">
  });
  const deals = useQuery(api.companies.getDeals, { companyId: companyId as Id<"companies"> });
  const activities = useQuery(api.companies.getActivities, { 
    companyId: companyId as Id<"companies">, 
    limit: 50 
  });
  const notes = useQuery(api.companies.getNotes, { companyId: companyId as Id<"companies"> });

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

  if (!isAuthenticated || !clientId) {
    return <div>Je moet ingelogd zijn om deze pagina te bekijken</div>;
  }

  if (company === undefined) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse">Loading company details...</div>
      </div>
    );
  }

  if (company === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/companies')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Terug naar Bedrijven
          </Button>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Bedrijf niet gevonden
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openDeals = deals?.filter(deal => deal.status === 'open') || [];
  const totalPipelineValue = openDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
  
  const filteredContacts = contacts?.filter(contact => {
    const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase();
    const search = contactSearch.toLowerCase();
    return fullName.includes(search) || 
           contact.email?.toLowerCase().includes(search) || 
           contact.jobTitle?.toLowerCase().includes(search);
  }) || [];

  const filteredActivities = activities?.filter(activity => 
    timelineFilter.includes(activity.channel.toLowerCase())
  ) || [];

  const companyLogo = getLogo(company.domain);
  const location = [company.city, company.state, company.country].filter(Boolean).join(', ') || '—';

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-gray-50 -m-6 overflow-hidden">
      {/* Sticky Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/companies')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Terug naar Bedrijven
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                {companyLogo ? (
                  <img 
                    src={companyLogo} 
                    alt="Company logo" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.innerHTML = `<div class="text-sm font-medium">${company.name[0] || 'C'}</div>`;
                    }}
                  />
                ) : (
                  <Building2 className="w-6 h-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  {company.industryLabel && (
                    <span className="flex items-center gap-1">
                      <Target className="h-3.5 w-3.5" />
                      {company.industryLabel}
                    </span>
                  )}
                  {location !== '—' && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {location}
                    </span>
                  )}
                  {company.companySize && (
                    <span className="flex items-center gap-1">
                      <UsersIcon className="h-3.5 w-3.5" />
                      {company.companySize} medewerkers
                    </span>
                  )}
                  {company.website && (
                    <a 
                      href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                      target="_blank" 
                      rel="noreferrer" 
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      <Globe2 className="h-3.5 w-3.5" />
                      Website
                    </a>
                  )}
                </div>
              </div>
            </div>
            <Badge className="bg-green-50 text-green-700 border-green-200" variant="outline">
              Actief
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Phone className="w-4 h-4 mr-2" />
              Bel
            </Button>
            <Button variant="outline" size="sm">
              <Mail className="w-4 h-4 mr-2" />
              E-mail
            </Button>
            {company.companyLinkedinUrl && (
              <Button variant="outline" size="sm">
                <Linkedin className="w-4 h-4 mr-2" />
                LinkedIn
              </Button>
            )}
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Nieuwe Deal
            </Button>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contacten</p>
                <p className="text-2xl font-bold">{contacts?.length || 0}</p>
              </div>
              <UsersIcon className="h-8 w-8 text-blue-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Open Deals</p>
                <p className="text-2xl font-bold">{openDeals.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pipeline Waarde</p>
                <p className="text-2xl font-bold">{formatCurrency(totalPipelineValue)}</p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Laatste Interactie</p>
                <p className="text-sm font-medium">
                  {activities?.[0] ? formatDistance(
                    new Date(activities[0].timestamp), 
                    new Date(), 
                    { addSuffix: true, locale: nl }
                  ) : '—'}
                </p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Volgende Taak</p>
                <p className="text-sm font-medium">Geen taken</p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full flex">
          {/* Main Content Area */}
          <div className="flex-1 overflow-auto">
            <div className="p-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overzicht</TabsTrigger>
                  <TabsTrigger value="contacts">Contacten</TabsTrigger>
                  <TabsTrigger value="deals">Deals</TabsTrigger>
                  <TabsTrigger value="timeline">Tijdlijn</TabsTrigger>
                  <TabsTrigger value="notes">Notities</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 mt-6">
                  {/* AI Intelligence & Company Summary */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Company Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building2 className="h-5 w-5" />
                          Bedrijf Samenvatting
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {company.companySummary ? (
                          <div>
                            <ScrollArea className={showFullSummary ? "h-auto" : "h-32"}>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {company.companySummary}
                              </p>
                            </ScrollArea>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setShowFullSummary(!showFullSummary)}
                              className="mt-2 h-auto p-0 text-xs"
                            >
                              {showFullSummary ? 'Toon minder' : 'Toon meer'}
                            </Button>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Geen bedrijfssamenvatting beschikbaar</p>
                        )}
                      </CardContent>
                    </Card>

                    {/* AI Intelligence Zone */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-yellow-500" />
                          AI Intelligence
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-800">
                              <strong>Groeiend bedrijf:</strong> {company.companySize || 0} medewerkers
                            </p>
                          </div>
                          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-sm text-green-800">
                              <strong>Actieve contacten:</strong> {contacts?.length || 0} beschikbare contacten
                            </p>
                          </div>
                          <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-sm text-orange-800">
                              <strong>Aanbeveling:</strong> {openDeals.length > 0 ? 'Follow up op open deals' : 'Initieer nieuwe opportunity'}
                            </p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full">
                          <Plus className="h-4 w-4 mr-2" />
                          Maak aanbevolen taak
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Recent Activity Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5" />
                        Recente Activiteiten
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {filteredActivities && filteredActivities.length > 0 ? (
                        <div className="space-y-4">
                          {filteredActivities.slice(0, 5).map((activity) => (
                            <div key={activity._id} className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                {getChannelIcon(activity.channel)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium capitalize">{activity.channel}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistance(
                                      new Date(activity.timestamp), 
                                      new Date(), 
                                      { addSuffix: true, locale: nl }
                                    )}
                                  </p>
                                </div>
                                {activity.contactName && (
                                  <p className="text-sm text-muted-foreground">Met: {activity.contactName}</p>
                                )}
                                {activity.content && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {activity.content.length > 100 ? `${activity.content.substring(0, 100)}...` : activity.content}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Geen recente activiteiten</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="contacts" className="mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <UsersIcon className="w-5 h-5" />
                        Contacten ({filteredContacts.length})
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Input
                          placeholder="Zoek contacten..."
                          value={contactSearch}
                          onChange={(e) => setContactSearch(e.target.value)}
                          className="h-8 w-64"
                        />
                        <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Nieuw Contact
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {filteredContacts.length > 0 ? (
                        <div className="space-y-3">
                          {filteredContacts.map((contact) => (
                            <div key={contact._id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                              <div className="flex-1">
                                <Link 
                                  to={`/contacts/${contact._id}`} 
                                  className="font-medium hover:underline text-blue-600"
                                >
                                  {`${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Naamloos Contact'}
                                </Link>
                                <p className="text-sm text-muted-foreground">{contact.jobTitle || '—'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  {contact.functionGroup && (
                                    <Badge variant="outline" className="text-xs">
                                      {contact.functionGroup}
                                    </Badge>
                                  )}
                                  {contact.status && (
                                    <Badge className={getStatusColor(contact.status)} variant="secondary">
                                      {contact.status}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {contact.email && (
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Mail className="h-4 w-4" />
                                  </Button>
                                )}
                                {contact.mobilePhone && (
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Phone className="h-4 w-4" />
                                  </Button>
                                )}
                                {contact.linkedinUrl && (
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <Linkedin className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground">Geen contacten gevonden</p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="deals" className="mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        Deals & Opportunities ({deals?.length || 0})
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
                                  {deal.confidence && (
                                    <Badge variant="outline">{deal.confidence}% kans</Badge>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-semibold">
                                  {deal.value ? formatCurrency(deal.value, deal.currency) : '—'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDistance(new Date(deal._creationTime), new Date(), { addSuffix: true, locale: nl })}
                                </p>
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

                <TabsContent value="timeline" className="mt-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        360° Tijdlijn
                      </CardTitle>
                      <div className="flex gap-2">
                        {['email', 'phone', 'linkedin', 'meeting'].map(channel => (
                          <Button
                            key={channel}
                            variant={timelineFilter.includes(channel) ? "default" : "outline"}
                            size="sm"
                            onClick={() => {
                              if (timelineFilter.includes(channel)) {
                                setTimelineFilter(timelineFilter.filter(f => f !== channel))
                              } else {
                                setTimelineFilter([...timelineFilter, channel])
                              }
                            }}
                            className="h-7"
                          >
                            {getChannelIcon(channel)}
                          </Button>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-96">
                        {filteredActivities.length === 0 ? (
                          <div className="text-center py-8">
                            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Nog geen activiteiten</h3>
                            <p className="text-muted-foreground mb-4">Begin met contact om de tijdlijn te vullen.</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {filteredActivities.map((activity) => (
                              <div key={activity._id} className="flex gap-3 p-3 rounded-lg border bg-card/50 hover:bg-card transition-colors">
                                <div className={`p-2 rounded-full bg-muted/50 ${
                                  activity.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'
                                }`}>
                                  {getChannelIcon(activity.channel)}
                                </div>
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium capitalize">{activity.channel}</span>
                                      {activity.type && <Badge variant="outline" className="text-xs">{activity.type}</Badge>}
                                      <span className={`text-xs ${
                                        activity.direction === 'inbound' ? 'text-green-600' : 'text-blue-600'
                                      }`}>
                                        {activity.direction === 'inbound' ? 'Inkomend' : 'Uitgaand'}
                                      </span>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDistance(new Date(activity.timestamp), new Date(), { addSuffix: true, locale: nl })}
                                    </span>
                                  </div>
                                  {activity.contactName && (
                                    <p className="text-sm text-muted-foreground">Met: {activity.contactName}</p>
                                  )}
                                  {activity.content && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {activity.content}
                                    </p>
                                  )}
                                  {activity.campaignName && (
                                    <Badge variant="outline" className="text-xs">
                                      Campagne: {activity.campaignName}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
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
            {/* Quick Actions */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Snelle Acties</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Calendar className="w-4 h-4 mr-2" />
                  Plan Meeting
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Plus className="w-4 h-4 mr-2" />
                  Maak Deal
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <FileText className="w-4 h-4 mr-2" />
                  Voeg Notitie Toe
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Target className="w-4 h-4 mr-2" />
                  Voeg toe aan Campagne
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start">
                  <Mail className="w-4 h-4 mr-2" />
                  Stuur E-mail
                </Button>
              </CardContent>
            </Card>

            {/* Company Details */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Bedrijf Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="text-muted-foreground">Industrie</div>
                  <div className="text-right">{company.industryLabel || '—'}</div>
                  
                  <div className="text-muted-foreground">Sub-industrie</div>
                  <div className="text-right">{company.subindustryLabel || '—'}</div>
                  
                  <div className="text-muted-foreground">Bedrijfsgrootte</div>
                  <div className="text-right">
                    {company.companySize ? `${company.companySize} medewerkers` : '—'}
                  </div>
                  
                  <div className="text-muted-foreground">Locatie</div>
                  <div className="text-right">{location}</div>
                  
                  <div className="text-muted-foreground">Website</div>
                  <div className="text-right">
                    {company.website ? (
                      <a 
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank" 
                        rel="noreferrer" 
                        className="hover:underline text-blue-600"
                      >
                        {company.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : '—'}
                  </div>
                </div>

                <Separator />

                {company.companyKeywords && company.companyKeywords.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Keywords:</p>
                    <div className="flex flex-wrap gap-1">
                      {company.companyKeywords.slice(0, 6).map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Toegevoegd op {new Date(company._creationTime).toLocaleDateString('nl-NL')}
                </div>
              </CardContent>
            </Card>

            {/* AI Context */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900 text-base">AI Context</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="p-2 bg-white/50 rounded">
                    <p className="text-blue-800">
                      <strong>Beste tijd om te bellen:</strong><br />
                      Dinsdag - Donderdag, 10:00-16:00
                    </p>
                  </div>
                  <div className="p-2 bg-white/50 rounded">
                    <p className="text-blue-800">
                      <strong>Bedrijfsgroei:</strong><br />
                      {company.companySize && company.companySize > 50 ? 'Stabiel groot bedrijf' : 'Groeiend bedrijf'}
                    </p>
                  </div>
                  <div className="p-2 bg-white/50 rounded">
                    <p className="text-blue-800">
                      <strong>Aanbevolen aanpak:</strong><br />
                      {openDeals.length > 0 ? 'Focus op bestaande deals' : 'Nieuwe opportunity identificeren'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}