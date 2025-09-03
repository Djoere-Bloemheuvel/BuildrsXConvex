import { useState } from 'react'
import { useMutation, useAction } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Switch } from '@/components/ui/switch'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Search, Mail, Calendar, TrendingUp, Users, MoreHorizontal, Play, Pause, Square, FileText } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'

interface Campaign {
  _id: string
  _creationTime: number
  name: string
  status?: string
  propositionId?: string
  clientId?: string
  stats?: {
    sent: number
    replies: number
    replyRate: number
    conversions: number
  }
  // For backward compatibility with LeadEmail.tsx
  id?: string
}

interface EmailCampaignsTableProps {
  campaigns: Campaign[]
  isLoading: boolean
  onDeleted?: () => void
}

export default function EmailCampaignsTable({ campaigns, isLoading, onDeleted }: EmailCampaignsTableProps) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const { toast } = useToast()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [activateOpen, setActivateOpen] = useState(false)
  const [campaignToActivate, setCampaignToActivate] = useState<Campaign | null>(null)
  const [isActivating, setIsActivating] = useState(false)
  const [pendingActivations, setPendingActivations] = useState<Set<string>>(new Set())

  // Convex mutations
  const updateCampaign = useMutation(api.campaigns.update)
  const deleteCampaign = useMutation(api.campaigns.remove)
  const toggleCampaignStatus = useAction(api.campaigns.toggleCampaignStatus)

  const PROD_ACTIVATE_URL = 'https://djoere.app.n8n.cloud/webhook/fa247cd3-e9e9-4f14-a2c6-f4cfaa9aaaa7'
  const TEST_PAUSE_URL = 'https://djoere.app.n8n.cloud/webhook-test/35e339b3-3da7-4b5b-aa45-79b98dbc4bb9'
  const PROD_PAUSE_URL = 'https://djoere.app.n8n.cloud/webhook/35e339b3-3da7-4b5b-aa45-79b98dbc4bb9'
  const TIMEOUT_MS = 15000

  const sendWebhook = async (url: string, payload: any, name: string) => {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        keepalive: true,
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
      if (!res.ok) {
        const text = await res.text().catch(()=>'')
        throw new Error(`${name} webhook fout: ${res.status} ${text}`)
      }
      return true
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        throw new Error(`${name} webhook timeout na ${TIMEOUT_MS/1000}s`)
      }
      throw err
    } finally {
      window.clearTimeout(timer)
    }
  }

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
      case 'paused':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20'
      case 'stopped':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Play className="w-3 h-3" />
      case 'paused':
        return <Pause className="w-3 h-3" />
      case 'stopped':
        return <Square className="w-3 h-3" />
      default:
        return <FileText className="w-3 h-3" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'running':
        return 'Actief'
      case 'paused':
        return 'Gepauzeerd'
      case 'stopped':
        return 'Gestopt'
      default:
        return 'Concept'
    }
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8">
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-6 px-6 sm:px-8 pt-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold text-foreground">
              E-mail Campagnes
            </h2>
            <p className="text-muted-foreground">
              Beheer en volg je e-mail campagnes • {campaigns.length} totaal
            </p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Zoek campagnes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-11 h-11 bg-background/60 border-border/60 focus:border-primary/50 focus:ring-primary/20 rounded-xl"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="font-semibold text-muted-foreground h-14 px-6 sm:px-8">Campagne</TableHead>
                <TableHead className="font-semibold text-muted-foreground h-14">Status</TableHead>
                <TableHead className="font-semibold text-muted-foreground h-14">Actief</TableHead>
                <TableHead className="font-semibold text-muted-foreground h-14">Verstuurde E-mails</TableHead>
                <TableHead className="font-semibold text-muted-foreground h-14">Reply Rate</TableHead>
                <TableHead className="font-semibold text-muted-foreground h-14">Reacties</TableHead>
                <TableHead className="font-semibold text-muted-foreground h-14">Conversies</TableHead>
                <TableHead className="font-semibold text-muted-foreground h-14">Aangemaakt</TableHead>
                <TableHead className="w-16 h-14"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign) => (
                <TableRow 
                  key={campaign._id}
                  className="border-border/30 hover:bg-muted/30 cursor-pointer transition-all duration-200 group"
                  onClick={() => navigate(`/lead-engine/email/${campaign._id}`)}
                >
                  <TableCell className="px-6 sm:px-8 py-6">
                    <div className="space-y-2">
                      <div className="font-semibold text-foreground text-base group-hover:text-primary transition-colors">
                        {campaign.name}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 text-primary/60" />
                        {campaign.propositionId ? `Propositie: ${campaign.propositionId}` : 'Geen propositie'}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                   <Badge variant="outline" className={`${getStatusColor(campaign.status || 'draft')} px-3 py-1.5 text-sm font-medium rounded-full`}>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(campaign.status || 'draft')}
                        {getStatusLabel(campaign.status || 'draft')}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <span className="font-semibold text-foreground text-base">
                        {campaign.stats?.sent?.toLocaleString() || '0'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl">
                        <TrendingUp className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-base">
                          {campaign.stats?.replyRate || '0'}%
                        </span>
                        <span className="text-xs text-muted-foreground">reply rate</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="font-semibold text-foreground text-base">
                      {campaign.stats?.replies?.toLocaleString() || '0'}
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-primary/10 rounded-xl">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground text-base">
                          {campaign.stats?.conversions?.toLocaleString() || '0'}
                        </span>
                        <span className="text-xs text-muted-foreground">meetings</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6">
                    <span className="text-muted-foreground">
                      {campaign._creationTime ? formatDate(campaign._creationTime) : '—'}
                    </span>
                  </TableCell>
                  <TableCell className="py-6" onClick={(e)=>e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Switch
                        className="data-[state=checked]:bg-emerald-500 data-[state=unchecked]:bg-muted"
                        checked={(campaign.status === 'active' || campaign.status === 'actief') && !pendingActivations.has(campaign._id)}
                        disabled={pendingActivations.has(campaign._id)}
                        onCheckedChange={async (checked) => {
                          // Add to pending set
                          setPendingActivations(prev => {
                            const next = new Set(prev)
                            next.add(campaign._id)
                            return next
                          })
                          
                          try {
                            // Use our new toggle mutation with Instantly API integration
                            const result = await toggleCampaignStatus({ 
                              campaignId: campaign._id as any
                            })
                            
                            toast({ 
                              title: `Campagne ${result.newStatus === 'active' ? 'geactiveerd' : 'gepauzeerd'}! ✅`,
                              description: `${result.campaignName} is nu ${result.newStatus === 'active' ? 'actief' : 'gepauzeerd'} en gesynchroniseerd met externe systemen.`
                            })
                            
                            onDeleted?.() // Refresh the data
                            
                          } catch (err: any) {
                            console.error('Campaign toggle error:', err)
                            
                            // User-friendly error messages (no external service mentions)
                            let errorMessage = 'Er is een onbekende fout opgetreden.'
                            
                            if (err?.message) {
                              if (err.message.includes('External service')) {
                                errorMessage = err.message
                              } else if (err.message.includes('Campaign not found')) {
                                errorMessage = 'Campagne niet gevonden. Ververs de pagina en probeer opnieuw.'
                              } else if (err.message.includes('internet connection')) {
                                errorMessage = 'Controleer je internetverbinding en probeer opnieuw.'
                              } else {
                                errorMessage = 'Status wijziging mislukt. Probeer het opnieuw of neem contact op met support.'
                              }
                            }
                            
                            toast({ 
                              title: 'Status wijziging mislukt', 
                              description: errorMessage,
                              variant: 'destructive'
                            })
                          } finally {
                            // Remove from pending set
                            setPendingActivations(prev => {
                              const next = new Set(prev)
                              next.delete(campaign._id)
                              return next
                            })
                          }
                        }}
                        aria-label="Zet campagne aan/uit"
                      />
                      {pendingActivations.has(campaign._id) && (
                        <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-muted/50 rounded-lg">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card min-w-[140px]">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            navigate(`/lead-engine/email/${campaign._id}`)
                          }} className="hover:bg-muted/50">
                            Bewerken
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => e.stopPropagation()} className="hover:bg-muted/50">
                            Dupliceren
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation()
                              setCampaignToDelete(campaign)
                              setDeleteOpen(true)
                            }}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            Verwijderen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Campagne verwijderen?</AlertDialogTitle>
              <AlertDialogDescription>
                Deze actie kan niet ongedaan worden gemaakt. De campagne "{campaignToDelete?.name}" wordt permanent verwijderd.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Annuleren</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!campaignToDelete) return
                  setIsDeleting(true)
                  try {
                    await deleteCampaign({ id: campaignToDelete._id as any })
                    toast({ title: 'Campagne verwijderd' })
                    setDeleteOpen(false)
                    setCampaignToDelete(null)
                    onDeleted?.()
                  } catch (error: any) {
                    toast({ title: 'Verwijderen mislukt', description: error?.message || 'Onbekende fout' })
                  } finally {
                    setIsDeleting(false)
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={isDeleting}
              >
                {isDeleting ? 'Verwijderen…' : 'Verwijderen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={activateOpen} onOpenChange={(open)=>{
          setActivateOpen(open)
          if (!open && campaignToActivate) {
            setPendingActivations(prev => { const n = new Set(prev); n.delete(campaignToActivate._id); return n })
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Campagne activeren?</AlertDialogTitle>
              <AlertDialogDescription>
                Hierdoor wordt de campagne "{campaignToActivate?.name}" op actief gezet en starten de automations. Deze actie kan impact hebben op lopende workflows.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isActivating}>Annuleren</AlertDialogCancel>
              <AlertDialogAction
                onClick={async () => {
                  if (!campaignToActivate) return
                  setIsActivating(true)
                  try {
                    await updateCampaign({ 
                      id: campaignToActivate._id as any, 
                      status: 'running' 
                    })
                    const webhookPayload = { 
                      client_id: campaignToActivate?.clientId, 
                      campaign_id: campaignToActivate._id, 
                      event: 'campaign_activated' 
                    }
                    await sendWebhook(PROD_ACTIVATE_URL, webhookPayload, 'Prod')
                    toast({ title: 'Campagne geactiveerd' })
                    setPendingActivations(prev => { const n = new Set(prev); n.delete(campaignToActivate._id); return n })
                    onDeleted?.()
                  } catch (err: any) {
                    // Rollback on error
                    try {
                      await updateCampaign({ 
                        id: campaignToActivate._id as any, 
                        status: 'draft' 
                      })
                    } catch {}
                    toast({ title: 'Activeren mislukt', description: err?.message || 'Onbekende fout' })
                    setPendingActivations(prev => { const n = new Set(prev); n.delete(campaignToActivate._id); return n })
                  } finally {
                    setIsActivating(false)
                    setActivateOpen(false)
                    setCampaignToActivate(null)
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={isActivating}
              >
                {isActivating ? 'Activeren…' : 'Activeren'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {filteredCampaigns.length === 0 && (
          <div className="text-center py-20">
            <div className="p-6 bg-muted/30 rounded-2xl w-fit mx-auto mb-6">
              <Mail className="w-20 h-20 text-muted-foreground mx-auto" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-3">
              Geen campagnes gevonden
            </h3>
            <p className="text-muted-foreground text-base max-w-md mx-auto">
              {searchQuery ? 'Probeer een andere zoekterm of pas je filters aan' : 'Maak je eerste e-mail campagne aan om te beginnen met outreach'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
