import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useConvexAuth } from '@/hooks/useConvexAuth'
import { Search, Building2, Users, Globe, MapPin, Filter, Download, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'

type Company = {
  _id: string
  _creationTime: number
  name: string
  domain?: string
  website?: string
  industryLabel?: string
  subindustryLabel?: string
  city?: string
  state?: string
  country?: string
  companySize?: number
  contactCount: number
  lastContactAt?: number
}

export default function Companies() {
  const { getClientId, isLoaded, isAuthenticated } = useConvexAuth()
  const clientId = getClientId()
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 25

  // Use the fixed OPTIMIZED listWithContacts query
  const companiesResult = useQuery(api.companiesOptimized.listWithContactsOptimized, 
    clientId ? {
      clientId,
      search: searchQuery || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize
    } : "skip"
  )

  const companies = companiesResult?.companies || []
  const total = companiesResult?.total || 0
  const totalPages = Math.ceil(total / pageSize)
  const isLoading = companiesResult === undefined
  
  const error = null

  // Calculate stats
  const stats = {
    totalCompanies: total,
    avgSize: companies.length > 0 
      ? Math.round(companies.reduce((sum, c) => sum + (c.companySize || 0), 0) / companies.length) 
      : 0,
    avgContacts: companies.length > 0
      ? Math.round(companies.reduce((sum, c) => sum + c.contactCount, 0) / companies.length)
      : 0
  }

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

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] bg-gray-50 -m-6 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4 gap-4 min-w-0">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Bedrijven</h1>
            <div className="flex items-center gap-4 mt-1">
              <div className="text-sm text-gray-600">{total} bedrijven</div>
              <div className="text-sm text-gray-600">Ø {stats.avgContacts} contacten per bedrijf</div>
            </div>
          </div>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="relative flex-shrink-0">
              {isLoading && searchQuery.length >= 2 ? (
                <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4">
                  <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : (
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              )}
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Zoek bedrijven, domeinen, industrie..."
                className="w-80 pl-9"
              />
            </div>
            <div className="flex items-center gap-3 overflow-x-auto flex-nowrap min-w-0">
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline" size="sm" className="flex-shrink-0">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button size="sm" className="flex-shrink-0">
                <Plus className="w-4 h-4 mr-2" />
                Add Company
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
                  <th className="sticky left-0 z-30 w-[280px] xl:w-[320px] 2xl:w-[360px] px-4 py-2 bg-white text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-r border-gray-200">
                    Bedrijf
                  </th>
                  <th className="w-[200px] xl:w-[250px] 2xl:w-[300px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Industrie
                  </th>
                  <th className="w-[120px] xl:w-[140px] 2xl:w-[160px] px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Contacten
                  </th>
                  <th className="w-[120px] xl:w-[140px] 2xl:w-[160px] px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Grootte
                  </th>
                  <th className="w-[200px] xl:w-[250px] 2xl:w-[300px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden md:table-cell">
                    Locatie
                  </th>
                  <th className="w-[200px] xl:w-[250px] 2xl:w-[300px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden lg:table-cell">
                    Website
                  </th>
                  <th className="w-[140px] xl:w-[160px] 2xl:w-[180px] px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wide hidden xl:table-cell">
                    Laatste contact
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  // Enhanced loading skeleton
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="sticky left-0 z-10 w-[280px] xl:w-[320px] 2xl:w-[360px] px-4 py-3 bg-white border-r border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                            <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-12 mx-auto" />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-16 mx-auto" />
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                      </td>
                    </tr>
                  ))
                ) : error ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-red-500">
                      Fout bij laden van bedrijven
                    </td>
                  </tr>
                ) : companies.length ? (
                  companies.map((company) => {
                    const location = [company.city, company.state, company.country].filter(Boolean).join(', ') || '—';
                    const lastContactDate = company.lastContactAt ? new Date(company.lastContactAt) : null;
                    
                    return (
                      <tr 
                        key={company._id} 
                        className="hover:bg-gray-50 transition-colors group"
                      >
                        {/* Bedrijf - Sticky */}
                        <td className="sticky left-0 z-10 w-[280px] xl:w-[320px] 2xl:w-[360px] px-4 py-3 bg-white group-hover:bg-gray-50 border-r border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full overflow-hidden bg-muted flex items-center justify-center text-xs font-medium">
                              {company.domain ? (
                                <img 
                                  src={`https://logo.clearbit.com/${company.domain}`} 
                                  alt="Company logo" 
                                  className="h-full w-full object-cover" 
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>';
                                  }}
                                />
                              ) : (
                                <Building2 className="w-4 h-4 text-gray-400" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <Link to={`/accounts/${company._id}`} className="font-medium text-foreground truncate text-sm hover:underline">
                                {company.name}
                              </Link>
                              <div className="text-xs truncate text-muted-foreground">{company.domain || '—'}</div>
                            </div>
                          </div>
                        </td>

                        {/* Industrie */}
                        <td className="px-4 py-3">
                          <div className="w-[200px] xl:w-[250px] 2xl:w-[300px]">
                            <div className="text-sm font-medium truncate text-foreground/90">{company.industryLabel || '—'}</div>
                            {company.subindustryLabel && (
                              <Badge variant="secondary" className="mt-0.5 text-xs">{company.subindustryLabel}</Badge>
                            )}
                          </div>
                        </td>

                        {/* Contacten */}
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className="font-mono">
                            {company.contactCount}
                          </Badge>
                        </td>

                        {/* Grootte */}
                        <td className="px-4 py-3 text-center">
                          {company.companySize ? (
                            <Badge variant="secondary" className="font-mono">
                              {company.companySize.toLocaleString()}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Locatie */}
                        <td className="px-4 py-3 hidden md:table-cell">
                          <div className="text-sm text-foreground/80 truncate max-w-[200px]">{location}</div>
                        </td>

                        {/* Website */}
                        <td className="px-4 py-3 hidden lg:table-cell">
                          {company.website ? (
                            <a
                              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-muted-foreground hover:underline text-sm truncate block max-w-[200px]"
                            >
                              {company.website.replace(/^https?:\/\//, '')}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>

                        {/* Laatste contact */}
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <div className="text-sm text-muted-foreground">
                            {lastContactDate ? lastContactDate.toLocaleDateString() : '—'}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                      Geen bedrijven gevonden
                    </td>
                  </tr>
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
  )
}