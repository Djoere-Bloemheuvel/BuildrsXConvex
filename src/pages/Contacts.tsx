
import { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Search, Plus, Filter, Download, MoreHorizontal, User, Building2, Phone, Mail, Calendar, Edit, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from '@/components/ui/badge';
import { useConvexAuth } from '@/hooks/useConvexAuth';
import ApolloUploadDialog from '@/components/contacts/ApolloUploadDialog';

// Type for basic contacts from Convex database
type Contact = {
  _id: string
  _creationTime: number
  leadId: string
  clientId: string
  companyId: string
  purchasedAt: number
  status?: string
  lastCommunicationAt?: number
  optedIn?: boolean
  fullEnrichment?: boolean
  // Smart Assignment Queue fields
  suggestedCampaignId?: string
  lastAssignmentAt?: number
  firstName?: string
  lastName?: string
  email?: string
  mobilePhone?: string
  linkedinUrl?: string
  jobTitle?: string
  functionGroup?: string
  name?: string
  website?: string
  domain?: string // Added for logo support
  companyLinkedinUrl?: string
  industryLabel?: string
  subindustryLabel?: string
  companySummary?: string
  shortCompanySummary?: string
  // Location fields
  city?: string
  state?: string
  country?: string
  companyCity?: string
  companyState?: string
  companyCountry?: string
  // Company size
  companySize?: number
  employeeCount?: number
}

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
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

export default function ContactsPage() {
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { user, getClientId, isAuthenticated, isLoaded } = useConvexAuth();
  const clientId = getClientId();

  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(25);
  
  // Get total count for pagination
  const totalContactsCount = useQuery(api.contacts.count,
    clientId ? {
      clientId: clientId,
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    } : "skip"
  );

  // Get paginated contacts data from Convex
  const contactsData = useQuery(api.contacts.list, 
    clientId ? {
      clientId: clientId,
      search: search || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    } : "skip"
  );

  const isLoading = contactsData === undefined || totalContactsCount === undefined;
  const contacts = contactsData || [];
  const total = totalContactsCount || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const columns: ColumnDef<Contact>[] = [
    {
      accessorKey: "contactpersoon",
      header: "Contactpersoon",
      cell: ({ row }: { row: any }) => {
        const c: Contact = row.original;
        const initials = `${c.firstName?.[0] || ''}${c.lastName?.[0] || ''}` || 'C';
        const fullName = `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Naamloos';
        // Extract domain from website for logo
        const domain = c.domain || (c.website ? c.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : '');
        
        return (
          <div className="flex items-center gap-2 sm:gap-3 w-full min-w-[200px] sm:w-[260px]">
            <input type="radio" name="contacts-select" className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-medium flex-shrink-0">
              {domain ? (
                <img 
                  src={`https://logo.clearbit.com/${domain}`} 
                  alt="Company logo" 
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    // Fallback to initials if logo fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement.innerHTML = initials;
                  }}
                />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1">
              <Link to={`/contacts/${c._id}`} className="font-medium text-foreground truncate text-sm hover:underline block">
                {fullName}
              </Link>
              <div className="text-xs truncate hidden sm:block">
                {c.linkedinUrl ? (
                  <a href={c.linkedinUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">LinkedIn profiel</a>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "functie",
      header: "Functie",
      cell: ({ row }: { row: any }) => {
        const c: Contact = row.original;
        return (
          <div className="w-full min-w-[150px] sm:w-[200px]">
            <div className="text-sm font-medium truncate text-foreground/90">{c.jobTitle || '—'}</div>
            {c.functionGroup && (
              <Badge variant="secondary" className="mt-1 hidden sm:inline-flex">{c.functionGroup}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "bedrijf",
      header: "Bedrijf",
      cell: ({ row }: { row: any }) => {
        const c: Contact = row.original;
        return (
          <div className="w-full min-w-[150px] sm:w-[220px]">
            <Link to={`/accounts/${c.companyId || ''}`} className="text-sm font-medium text-foreground hover:underline truncate block">
              {c.name || 'Onbekend Bedrijf'}
            </Link>
            <div className="text-xs truncate hidden sm:block">
              {c.website ? (
                <a href={c.website.startsWith('http') ? c.website : `https://${c.website}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">{c.website.replace(/https?:\/\//, '')}</a>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: "E-mail",
      cell: ({ row }: { row: any }) => {
        const c: Contact = row.original;
        return <div className="text-sm text-foreground/80 truncate max-w-[150px] sm:max-w-[200px]">{c.email || '—'}</div>;
      },
    },
    {
      accessorKey: "telefoon",
      header: () => <span className="hidden lg:inline">Telefoon</span>,
      cell: ({ row }: { row: any }) => {
        const c: Contact = row.original;
        return <div className="text-sm text-muted-foreground hidden lg:block">{c.mobilePhone || '—'}</div>;
      },
    },
    {
      accessorKey: "industrie",
      header: () => <span className="hidden md:inline">Industrie</span>,
      cell: ({ row }: { row: any }) => {
        const c: Contact = row.original;
        return (
          <div className="w-full min-w-[120px] sm:w-[200px] hidden md:block">
            <div className="text-sm font-medium text-foreground/90 truncate">{c.industryLabel || '—'}</div>
            {c.subindustryLabel && (
              <Badge variant="secondary" className="mt-1 hidden lg:inline-flex">{c.subindustryLabel}</Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "aantal_medewerkers",
      header: () => <span className="hidden xl:inline">Aantal medewerkers</span>,
      cell: ({ row }: { row: any }) => {
        const c: Contact = row.original;
        const employeeCount = c.companySize ?? c.employeeCount;
        const displayValue = employeeCount ? `${employeeCount}` : '—';
        return <div className="text-sm text-foreground/80 hidden xl:block">{displayValue}</div>;
      },
    },
    {
      accessorKey: "locatie",
      header: () => <span className="hidden xl:inline">Locatie</span>,
      cell: ({ row }: { row: any }) => {
        const c: Contact = row.original;
        // Use company location or contact location
        const parts = [
          c.companyCity || c.city,
          c.companyState || c.state,
          c.companyCountry || c.country,
        ].filter(Boolean) as string[];
        const location = parts.length ? parts.join(', ') : '—';
        return <div className="text-sm text-foreground/80 truncate max-w-[220px] hidden xl:block">{location}</div>;
      },
    },
    {
      id: "actie",
      header: "Actie",
      cell: () => (
        <div className="flex justify-end">
          <Button size="sm" className="h-8 text-xs px-2 sm:px-3">
            <span className="hidden sm:inline">Contact</span>
            <Mail className="h-3 w-3 sm:hidden" />
          </Button>
        </div>
      ),
    },
  ];

  // Note: Removed react-table usage in favor of direct table rendering

  // Show loading if authentication is not loaded yet
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading...</h2>
          <p className="text-muted-foreground mt-2">Please wait while we authenticate you.</p>
        </div>
      </div>
    );
  }

  // Show access denied if not authenticated
  if (!isAuthenticated || !clientId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">No Access</h2>
          <p className="text-muted-foreground mt-2">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Loading Contacts...</h2>
          <p className="text-muted-foreground mt-2">Please wait while we fetch your contacts.</p>
        </div>
      </div>
    );
  }

  // Add debug logging
  console.log('Contacts page debug:', { 
    contactsData: contactsData?.length, 
    totalContactsCount,
    isLoading, 
    clientId,
    contacts: contacts?.length,
    isAuthenticated,
    isLoaded,
    page,
    totalPages,
    total,
    queryArgs: clientId ? { clientId, search: search || undefined, status: statusFilter !== 'all' ? statusFilter : undefined, limit: pageSize, offset: (page - 1) * pageSize } : 'skip'
  });


  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-gray-50 -m-6 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4 gap-4 min-w-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="text-sm text-gray-600">{total} contacten</div>
            </div>
          </div>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative flex-shrink-0">
              {isLoading && search.length >= 2 ? (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              )}
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Zoek op naam, bedrijf, functie..."
                className="w-80 pl-9"
              />
            </div>
            <div className="flex items-center gap-3 overflow-x-auto flex-nowrap min-w-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-shrink-0">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter Status
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Filter</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => { setStatusFilter('all'); setPage(1); }}>
                    Alle
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setStatusFilter('hot'); setPage(1); }}>
                    Hot
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setStatusFilter('warm'); setPage(1); }}>
                    Warm
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setStatusFilter('cold'); setPage(1); }}>
                    Cold
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setStatusFilter('qualified'); setPage(1); }}>
                    Qualified
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setStatusFilter('unqualified'); setPage(1); }}>
                    Unqualified
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ApolloUploadDialog />
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button size="sm" className="flex-shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Contact
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Table Container - Fixed sticky header */}
      <div className="flex-1 overflow-hidden relative min-h-0">
        <div className="h-full overflow-auto">
          <div className="min-w-[1400px] lg:min-w-full">
            <table className="w-full">
              <thead className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
                <tr>
                  <th className="sticky left-0 z-30 w-[260px] xl:w-[300px] 2xl:w-[350px] px-4 py-2 bg-white text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-r border-gray-200">
                    Contactpersoon
                  </th>
                  <th className="w-[200px] xl:w-[250px] 2xl:w-[300px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Functie
                  </th>
                  <th className="w-[220px] xl:w-[280px] 2xl:w-[320px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Bedrijf
                  </th>
                  <th className="w-[150px] xl:w-[180px] 2xl:w-[200px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    E-mail
                  </th>
                  <th className="w-[120px] xl:w-[150px] 2xl:w-[180px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                    Telefoon
                  </th>
                  <th className="w-[200px] xl:w-[250px] 2xl:w-[300px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    Industrie
                  </th>
                  <th className="w-[120px] xl:w-[150px] 2xl:w-[180px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                    Aantal medewerkers
                  </th>
                  <th className="w-[220px] xl:w-[280px] 2xl:w-[350px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                    Locatie
                  </th>
                  <th className="w-[100px] xl:w-[120px] 2xl:w-[140px] px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Actie
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  // Enhanced loading skeleton
                  Array.from({ length: 12 }).map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 z-10 w-[260px] xl:w-[300px] 2xl:w-[350px] px-4 py-3 bg-white border-r border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-3/5" />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16" />
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="h-8 bg-gray-200 rounded animate-pulse w-20 mx-auto" />
                      </td>
                    </tr>
                  ))
                ) : contacts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      Geen contacten gevonden
                    </td>
                  </tr>
                ) : (
                  contacts.map((contact) => {
                    const initials = `${contact.firstName?.[0] || ''}${contact.lastName?.[0] || ''}`.toUpperCase() || 'C';
                    const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Naamloos';
                    const domain = contact.domain || (contact.website ? contact.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0] : '');
                    const employeeCount = contact.companySize ?? contact.employeeCount;
                    const location = [
                      contact.companyCity || contact.city,
                      contact.companyState || contact.state,
                      contact.companyCountry || contact.country,
                    ].filter(Boolean).join(', ') || '—';
                    
                    return (
                      <tr key={contact._id} className="hover:bg-gray-50 transition-colors group">
                        {/* Contactpersoon - Sticky */}
                        <td className="sticky left-0 z-10 w-[260px] xl:w-[300px] 2xl:w-[350px] px-4 py-3 bg-white group-hover:bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center gap-3">
                            <input type="radio" name="contacts-select" className="h-4 w-4 text-primary" />
                            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-medium">
                              {domain ? (
                                <img 
                                  src={`https://logo.clearbit.com/${domain}`} 
                                  alt="Company logo" 
                                  className="h-full w-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = initials;
                                  }}
                                />
                              ) : (
                                initials
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link to={`/contacts/${contact._id}`} className="font-medium text-foreground truncate text-sm hover:underline">
                                {fullName}
                              </Link>
                              <div className="text-xs truncate">
                                {contact.linkedinUrl ? (
                                  <a href={contact.linkedinUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">LinkedIn profiel</a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Functie */}
                        <td className="px-4 py-3">
                          <div className="w-[200px] xl:w-[250px] 2xl:w-[300px]">
                            <div className="text-sm font-medium truncate text-foreground/90">{contact.jobTitle || '—'}</div>
                            {contact.functionGroup && (
                              <Badge variant="secondary" className="mt-0.5 text-xs">{contact.functionGroup}</Badge>
                            )}
                          </div>
                        </td>

                        {/* Bedrijf */}
                        <td className="px-4 py-3">
                          <div className="w-[220px] xl:w-[280px] 2xl:w-[320px]">
                            <Link to={`/accounts/${contact.companyId || ''}`} className="text-sm font-medium text-foreground hover:underline truncate block">
                              {contact.name || 'Onbekend Bedrijf'}
                            </Link>
                            <div className="text-xs truncate">
                              {contact.website ? (
                                <a href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:underline">{contact.website.replace(/https?:\/\//, '')}</a>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* E-mail */}
                        <td className="px-4 py-3">
                          <div className="text-sm text-foreground/80 truncate max-w-[150px]">{contact.email || '—'}</div>
                        </td>

                        {/* Telefoon */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="text-sm text-muted-foreground">{contact.mobilePhone || '—'}</div>
                        </td>

                        {/* Industrie */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="w-[200px] xl:w-[250px] 2xl:w-[300px]">
                            <div className="text-sm font-medium text-foreground/90 truncate">{contact.industryLabel || '—'}</div>
                            {contact.subindustryLabel && (
                              <Badge variant="secondary" className="mt-0.5 text-xs">{contact.subindustryLabel}</Badge>
                            )}
                          </div>
                        </td>

                        {/* Aantal medewerkers */}
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <div className="text-sm text-foreground/80">{employeeCount || '—'}</div>
                        </td>

                        {/* Locatie */}
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <div className="text-sm text-foreground/80 truncate max-w-[220px]">{location}</div>
                        </td>

                        {/* Actie */}
                        <td className="px-4 py-3">
                          <div className="flex justify-end">
                            <Button size="sm" className="h-7 text-xs">Contact</Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sticky Footer Pagination */}
      <div className="border-t border-border/50 bg-background/80 backdrop-blur-sm px-6 py-3 min-h-[60px]">
        <div className="w-full flex items-center justify-center">
          <div className="flex items-center gap-6">
            <div className="text-gray-600 font-medium text-sm">
              {Math.min((page-1)*pageSize+1, total)}–{Math.min(page*pageSize, total)} van {total}
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" disabled={page<=1} onClick={()=> setPage(p=> Math.max(1, p-1))} className="h-8 px-3 text-sm">Vorige</Button>
              <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">{page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page>=totalPages} onClick={()=> setPage(p=> Math.min(totalPages, p+1))} className="h-8 px-3 text-sm">Volgende</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
