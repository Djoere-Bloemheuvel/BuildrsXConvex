import { useState, useMemo } from 'react'
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { ChevronsUpDown, Check, Plus, Package, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useConvexAuth } from '@/hooks/useConvexAuth'
import { useToast } from '@/hooks/use-toast'

type Option = { id: string; name: string }

export default function PropositionSelect({ value, onChange, placeholder = 'Kies propositie…' }: { value?: string | null; onChange: (id: string) => void, placeholder?: string }) {
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const { getClientId } = useConvexAuth()
  const { toast } = useToast()
  const [draftName, setDraftName] = useState('')
  const [draftDescription, setDraftDescription] = useState('')
  const [draftOfferType, setDraftOfferType] = useState<'service' | 'product'>('service')
  const [isCreating, setIsCreating] = useState(false)

  const clientId = getClientId()
  
  // Fetch propositions from Convex
  const propositionsData = useQuery(api.propositions.list, 
    clientId ? { clientId } : "skip"
  )
  
  const createMutation = useMutation(api.propositions.create)

  const options: Option[] = useMemo(() => {
    return (propositionsData ?? []).map(p => ({ 
      id: p._id, 
      name: p.name 
    }))
  }, [propositionsData])

  const add = async () => {
    if (!draftName.trim() || !clientId || isCreating) return
    
    const propositionName = draftName.trim()
    setIsCreating(true)
    
    try {
      const propositionId = await createMutation({
        name: propositionName,
        description: draftDescription.trim() || undefined,
        offerType: draftOfferType,
        clientId,
      })
      
      // Smooth transition: first select the proposition
      onChange(propositionId)
      
      // Reset form state
      setDraftName('')
      setDraftDescription('')
      setDraftOfferType('service')
      
      // Close with a short delay for smoother UX
      setTimeout(() => {
        setCreateOpen(false)
        setIsCreating(false)
      }, 200)
      
      // Show user-friendly toast after closing
      setTimeout(() => {
        toast({
          title: '✅ Propositie opgeslagen',
          description: `${propositionName} is klaar voor gebruik in campagnes`
        })
      }, 400)
      
    } catch (error: any) {
      setIsCreating(false)
      toast({
        title: 'Kon propositie niet opslaan',
        description: 'Probeer het opnieuw of neem contact op'
      })
    }
  }

  const handleCancel = () => {
    // Reset form with smooth transition
    setDraftName('')
    setDraftDescription('')
    setDraftOfferType('service')
    setIsCreating(false)
    
    setTimeout(() => {
      setCreateOpen(false)
    }, 100)
  }

  const selected = useMemo(() => {
    const vid = (value ?? '') as string
    return options.find(o => o.id === vid)?.name
  }, [options, value])

  return (
    <div className="flex items-center gap-2 w-full">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            role="combobox" 
            aria-expanded={open} 
            className="w-full justify-between h-12 bg-white/90 border-2 border-slate-200/60 hover:border-blue-300 hover:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 shadow-sm transition-all duration-200 font-medium"
          >
            <span className={selected ? "text-slate-900" : "text-slate-500"}>
              {selected || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 text-slate-400" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[380px] p-0 max-h-[70vh] overflow-auto bg-white/95 backdrop-blur-xl border-0 shadow-2xl ring-1 ring-slate-200/50">
          <Command className="bg-transparent">
            <div className="border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-blue-50/30 px-4 py-3">
              <CommandInput 
                placeholder="Zoek propositie..." 
                className="border-0 bg-transparent text-slate-700 placeholder:text-slate-500 focus:ring-0 font-medium"
              />
            </div>
            <CommandList className="max-h-72 overflow-auto">
              <CommandEmpty className="py-8 text-center text-slate-500">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Package className="w-4 h-4 text-slate-400" />
                  </div>
                  <span className="text-sm font-medium">Geen proposities gevonden</span>
                </div>
              </CommandEmpty>
              
              {options.length > 0 && (
                <CommandGroup>
                  <div className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-100/80 bg-slate-50/30">
                    Beschikbare Proposities
                  </div>
                  {options.map(o => (
                    <CommandItem 
                      key={o.id} 
                      value={o.name} 
                      onSelect={() => { onChange(o.id); setOpen(false) }}
                      className="px-4 py-3 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-b border-slate-50/50 last:border-b-0"
                    >
                      <div className="flex items-center w-full">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 mr-3 flex-shrink-0">
                          <Package className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-slate-900 truncate">{o.name}</div>
                          <div className="text-xs text-slate-500 mt-0.5">Propositie beschikbaar</div>
                        </div>
                        <Check className={cn('w-5 h-5 text-blue-600 flex-shrink-0', value === o.id ? 'opacity-100' : 'opacity-0')} />
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              
              <CommandGroup>
                <div className="border-t border-slate-200/50 bg-gradient-to-r from-slate-50/50 to-blue-50/20">
                  <CommandItem 
                    onSelect={() => { setCreateOpen(true); setOpen(false) }}
                    className="px-4 py-4 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200"
                  >
                    <div className="flex items-center w-full">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-100 to-emerald-200 mr-3">
                        <Plus className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">Nieuwe propositie aanmaken</div>
                        <div className="text-xs text-slate-500 mt-0.5">Maak een nieuwe propositie voor je campagnes</div>
                      </div>
                    </div>
                  </CommandItem>
                </div>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-4xl w-full h-[85vh] bg-background/95 backdrop-blur-xl border-0 shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 pb-6">
            <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-white">
              <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                <Package className="w-5 h-5 text-white" />
              </div>
              Nieuwe Propositie
            </DialogTitle>
            <p className="text-blue-100 mt-2">
              Maak een nieuwe propositie aan voor je email campagnes
            </p>
          </DialogHeader>
          
          <ScrollArea className="flex-1 py-6 px-8 max-h-[60vh]">
            <div className="mx-8 space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Propositie Naam *
              </label>
              <Input 
                value={draftName} 
                onChange={e=>setDraftName(e.target.value)} 
                placeholder="Bijv. LinkedIn Outbound Service, SaaS Sales Funnel Setup"
                className="bg-white/90 dark:bg-slate-800/90 border-slate-200/50 dark:border-slate-700/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Type Aanbieding
              </label>
              <Select value={draftOfferType} onValueChange={(v)=>setDraftOfferType(v as 'service'|'product')}>
                <SelectTrigger className="bg-white/90 dark:bg-slate-800/90 border-slate-200/50 dark:border-slate-700/50 focus:border-blue-500 dark:focus:border-blue-400">
                  <SelectValue placeholder="Selecteer type aanbieding" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50">
                  <SelectItem value="service" className="focus:bg-blue-50 dark:focus:bg-blue-950/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Dienstverlening
                    </div>
                  </SelectItem>
                  <SelectItem value="product" className="focus:bg-blue-50 dark:focus:bg-blue-950/30">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      Product
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Beschrijving
              </label>
              <Textarea 
                value={draftDescription} 
                onChange={e=>setDraftDescription(e.target.value)} 
                placeholder="Uitgebreide omschrijving van je propositie en wat het oplevert voor klanten..."
                rows={6}
                className="bg-white/90 dark:bg-slate-800/90 border-slate-200/50 dark:border-slate-700/50 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 resize-none"
              />
            </div>
            </div>
          </ScrollArea>
          
          <DialogFooter className="gap-3 pt-6 px-16 pb-8 border-t border-slate-200/50 dark:border-slate-700/50 bg-slate-50/30 dark:bg-slate-900/30">
            <Button 
              variant="outline" 
              onClick={handleCancel}
              disabled={isCreating}
              className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200"
            >
              Annuleren
            </Button>
            <Button 
              disabled={!draftName.trim() || isCreating} 
              onClick={add}
              className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 min-w-[120px]"
            >
              {isCreating ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Opslaan...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4 mr-2" />
                  Aanmaken
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}