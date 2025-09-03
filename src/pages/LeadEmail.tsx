import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from 'react-router-dom';

import { useConvexAuth } from '@/hooks/useConvexAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Sparkles, Mail, Calendar, Users, Target, Rocket, Brain, Zap, TrendingUp, Star, Search, Settings, Filter, BarChart3, Activity, MoreHorizontal, Play, Pause, Eye, ChevronsUpDown, Check, Package } from 'lucide-react';
import EmailStatsGrid from '@/components/email/EmailStatsGrid';
import EmailCampaignsTable from '@/components/email/EmailCampaignsTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { MultiSelect, type MultiOption } from '@/components/ui/MultiSelect';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import PropositionSelect from '@/components/lead/PropositionSelect';
import SmartAssignmentQueue from '@/components/email/SmartAssignmentQueue';

export default function LeadEmail() {
  const { user, getClientId } = useConvexAuth();
  // Use real client ID from authenticated user
  const profile = { client_id: getClientId() };
  const { toast } = useToast();
  const navigate = useNavigate();
  const [openNew, setOpenNew] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [processingOpen, setProcessingOpen] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [selectedTab, setSelectedTab] = useState('dashboard');
  const [search, setSearch] = useState('');
  // Audience filter (verplicht)
  const [audFunctions, setAudFunctions] = useState<string[]>([]);
  const [audIndustries, setAudIndustries] = useState<string[]>([]);
  const [audSubindustries, setAudSubindustries] = useState<string[]>([]);
  const [audCountry, setAudCountry] = useState<string[]>([]);
  const [audState, setAudState] = useState<string[]>([]);
  const [audSizeMin, setAudSizeMin] = useState('');
  const [audSizeMax, setAudSizeMax] = useState('');
  const [propositionId, setPropositionId] = useState<string | null>(null);
  const [campaignGoal, setCampaignGoal] = useState<string>('Online Meeting van 30 minuten');
  const [customGoal, setCustomGoal] = useState('');
  const [goalDropdownOpen, setGoalDropdownOpen] = useState(false);
  const [isSmartAssigning, setIsSmartAssigning] = useState(false);

  // Campaign goal options
  const campaignGoalOptions: MultiOption[] = [
    { label: 'Online Meeting van 30 minuten', value: 'Online Meeting van 30 minuten' },
    { label: 'Anders (custom)', value: 'custom' }
  ];

  const handleCampaignGoalChange = (values: string[]) => {
    setCampaignGoal(values[0] || '');
    // If custom is deselected, clear the custom goal
    if (!values.includes('custom')) {
      setCustomGoal('');
    }
  };

  // Industry options (statisch uit DB-lijst die je gaf)
  const industryOptions: MultiOption[] = [{
    label: 'Bouw, Installatie & Techniek',
    value: 'bouw-installatie'
  }, {
    label: 'Consultancy & Strategie',
    value: 'consultancy'
  }, {
    label: 'E-commerce & D2C',
    value: 'ecommerce-d2c'
  }, {
    label: 'Energie & Duurzaamheid',
    value: 'energie-duurzaam'
  }, {
    label: 'Financiële & Fiscale Dienstverlening',
    value: 'financieel'
  }, {
    label: 'Hospitality, Events & Toerisme',
    value: 'hospitality-events'
  }, {
    label: 'HR, Recruitment & Detachering',
    value: 'hr-recruitment'
  }, {
    label: 'Industrie & Productiebedrijven',
    value: 'industrie-productie'
  }, {
    label: 'Legal & Advocatuur',
    value: 'legal'
  }, {
    label: 'Logistiek & Transport',
    value: 'logistiek-transport'
  }, {
    label: 'Marketing, Branding & Design',
    value: 'marketing-creatief'
  }, {
    label: 'Onderwijs & Opleidingen',
    value: 'onderwijs-opleidingen'
  }, {
    label: 'Overheid & Non-profit',
    value: 'overheid-nonprofit'
  }, {
    label: 'Retail & Groothandel',
    value: 'retail-groothandel'
  }, {
    label: 'Sales & Leadgeneratie',
    value: 'sales-leadgen'
  }, {
    label: 'Softwarebedrijven & SaaS',
    value: 'software-saas'
  }, {
    label: 'Vastgoed & Makelaardij',
    value: 'vastgoed'
  }, {
    label: 'Zorginstellingen & GGZ',
    value: 'zorg-ggz'
  }];

  // Functie opties (beslissers)
  const functionOptions: MultiOption[] = [{
    label: 'Owner/Founder',
    value: 'Owner/Founder'
  }, {
    label: 'Marketing Decision Makers',
    value: 'Marketing Decision Makers'
  }, {
    label: 'Sales Decision Makers',
    value: 'Sales Decision Makers'
  }, {
    label: 'Business Development Decision Makers',
    value: 'Business Development Decision Makers'
  }, {
    label: 'Operational Decision Makers',
    value: 'Operational Decision Makers'
  }, {
    label: 'Technical Decision Makers',
    value: 'Technical Decision Makers'
  }, {
    label: 'Financial Decision Makers',
    value: 'Financial Decision Makers'
  }, {
    label: 'HR Decision Makers',
    value: 'HR Decision Makers'
  }, {
    label: 'Product & Innovation Decision Makers',
    value: 'Product & Innovation Decision Makers'
  }, {
    label: 'Customer Success & Support Decision Makers',
    value: 'Customer Success & Support Decision Makers'
  }];
  const subindustryByParent: Record<string, MultiOption[]> = {
    'bouw-installatie': [{
      label: 'Bouwmaterialen',
      value: 'bouwmaterialen'
    }, {
      label: 'Duurzame Installaties',
      value: 'duurzame-installaties'
    }, {
      label: 'Elektrotechnische Installaties',
      value: 'elektrotechnische-installaties'
    }, {
      label: 'Installatietechniek',
      value: 'installatietechniek'
    }, {
      label: 'Sanitair',
      value: 'sanitair'
    }],
    consultancy: [{
      label: 'Financial Consultancy',
      value: 'financial-consultancy'
    }, {
      label: 'HR Consultancy',
      value: 'hr-consultancy'
    }, {
      label: 'IT Consultancy',
      value: 'it-consultancy'
    }, {
      label: 'Management Consultancy',
      value: 'management-consultancy'
    }, {
      label: 'Marketing Consultancy',
      value: 'marketing-consultancy'
    }],
    'ecommerce-d2c': [{
      label: 'Digital Marketing',
      value: 'digital-marketing'
    }, {
      label: 'Klantenservice',
      value: 'klantenservice'
    }, {
      label: 'Logistiek & Fulfilment',
      value: 'logistiek-en-fulfilment'
    }, {
      label: 'Productontwikkeling',
      value: 'productontwikkeling'
    }, {
      label: 'Webshops',
      value: 'webshops'
    }],
    'energie-duurzaam': [{
      label: 'Duurzame Energie Installaties',
      value: 'duurzame-energie-installaties'
    }, {
      label: 'Energiebeheer',
      value: 'energiebeheer'
    }, {
      label: 'Warmtepompen',
      value: 'warmtepompen'
    }, {
      label: 'Windenergie',
      value: 'windenergie'
    }, {
      label: 'Zonne-energie',
      value: 'zonne-energie'
    }],
    financieel: [{
      label: 'Accountancy',
      value: 'accountancy'
    }, {
      label: 'Belastingadvies',
      value: 'belastingadvies'
    }, {
      label: 'Corporate Finance',
      value: 'corporate-finance'
    }, {
      label: 'Financiële Adviesdiensten',
      value: 'financiële-adviesdiensten'
    }, {
      label: 'Verzekeringen',
      value: 'verzekeringen'
    }],
    'hospitality-events': [{
      label: 'Conferentiecentra',
      value: 'conferentiecentra'
    }, {
      label: 'Entertainment & Shows',
      value: 'entertainment'
    }, {
      label: 'Evenementen Marketing',
      value: 'evenementenmarketing'
    }, {
      label: 'Evenementen Organisatie',
      value: 'evenementenorganisatie'
    }, {
      label: 'Horeca & Gastvrijheid',
      value: 'horeca'
    }],
    'hr-recruitment': [{
      label: 'Detachering & Interim',
      value: 'detachering-interim'
    }, {
      label: 'Employer Branding',
      value: 'employer-branding'
    }, {
      label: 'Outplacement & Loopbaanbegeleiding',
      value: 'outplacement-loopbaan'
    }, {
      label: 'Recruitment Technologie',
      value: 'recruitment-tech'
    }, {
      label: 'Uitzenden & Flexwerk',
      value: 'uitzenden-flexwerk'
    }, {
      label: 'Werving & Selectie',
      value: 'werving-selectie'
    }],
    'industrie-productie': [{
      label: 'Chemische Industrie',
      value: 'chemische-industrie'
    }, {
      label: 'Hightech Productie',
      value: 'hightech-productie'
    }, {
      label: 'Kunststofproductie',
      value: 'kunststofproductie'
    }, {
      label: 'Maakindustrie',
      value: 'maakindustrie'
    }, {
      label: 'Machinebouw',
      value: 'machinebouw'
    }, {
      label: 'Metaalbewerking',
      value: 'metaalbewerking'
    }, {
      label: 'Voedingsmiddelenindustrie',
      value: 'voedingsmiddelenindustrie'
    }],
    legal: [{
      label: 'Advocatenkantoren',
      value: 'advocatenkantoren'
    }, {
      label: 'Arbeidsrecht & HR-juridisch',
      value: 'arbeidsrecht-hr'
    }, {
      label: 'Compliance & Privacy',
      value: 'compliance-privacy'
    }, {
      label: 'Mediation & Conflictoplossing',
      value: 'mediation-conflictoplossing'
    }, {
      label: 'Notarissen & Vastgoedjuristen',
      value: 'notarissen-vastgoedjuristen'
    }],
    'logistiek-transport': [{
      label: 'E-commerce Fulfilment',
      value: 'ecommerce-fulfilment'
    }, {
      label: 'Internationaal Transport',
      value: 'internationaal-transport'
    }, {
      label: 'Last Mile & Stadslogistiek',
      value: 'last-mile-logistiek'
    }, {
      label: 'Logistieke Dienstverlening',
      value: 'logistieke-dienstverlening'
    }, {
      label: 'Transportbedrijven',
      value: 'transportbedrijven'
    }],
    'marketing-creatief': [{
      label: 'Branding & Design',
      value: 'branding-design'
    }, {
      label: 'Full Service Marketingbureau',
      value: 'full-service'
    }, {
      label: 'Outbound & Leadgeneratie',
      value: 'outbound-leadgen'
    }, {
      label: 'Performance Marketing',
      value: 'performance-marketing'
    }, {
      label: 'SEO & Content Bureaus',
      value: 'seo-content'
    }, {
      label: 'Social Media Bureaus',
      value: 'social-media'
    }, {
      label: 'Webdesign & Development',
      value: 'webdevelopment'
    }],
    'onderwijs-opleidingen': [{
      label: 'Bedrijfstraining & Coaching',
      value: 'bedrijfstraining-coaching'
    }, {
      label: 'Online Opleiders & EdTech',
      value: 'online-opleiders-edtech'
    }, {
      label: 'Scholen & Onderwijsinstellingen',
      value: 'scholen-onderwijsinstellingen'
    }, {
      label: 'Scholingsadvies & Opleidingsintermediairs',
      value: 'scholingsadvies-intermediairs'
    }, {
      label: 'Taaltraining & Communicatie',
      value: 'taaltraining-communicatie'
    }, {
      label: 'Technische & IT-Opleidingen',
      value: 'technische-it-opleidingen'
    }],
    'overheid-nonprofit': [{
      label: 'Brancheorganisaties & Verenigingen',
      value: 'brancheorganisaties-verenigingen'
    }, {
      label: 'Gemeenten & Lokale Overheid',
      value: 'gemeenten-lokale-overheid'
    }, {
      label: 'Ministeries & Rijksoverheid',
      value: 'ministeries-rijksoverheid'
    }, {
      label: 'Ondersteunende Publieke Diensten',
      value: 'ondersteunende-publieke-diensten'
    }, {
      label: 'Stichtingen & Goede Doelen',
      value: 'stichtingen-goede-doelen'
    }],
    'retail-groothandel': [{
      label: 'E-commerce Retailers',
      value: 'e-commerce-retailers'
    }, {
      label: 'Fysieke Retailketens',
      value: 'fysieke-retailketens'
    }, {
      label: 'Groothandels & Distributeurs',
      value: 'groothandels-distributeurs'
    }, {
      label: 'Retail Technologie & Services',
      value: 'retail-technologie-services'
    }, {
      label: 'Specialistische Retail',
      value: 'specialistische-retail'
    }],
    'sales-leadgen': [{
      label: 'B2B Leadgeneratie',
      value: 'b2b-leadgeneratie'
    }, {
      label: 'Cold Calling & Acquisitie',
      value: 'cold-calling'
    }, {
      label: 'Outbound Leadgeneratie',
      value: 'outbound-leadgeneratie'
    }, {
      label: 'Sales-as-a-Service',
      value: 'sales-as-a-service'
    }],
    'software-saas': [{
      label: 'Branchegerichte SaaS',
      value: 'vertical-saas'
    }, {
      label: 'Customer Support & CX Software',
      value: 'customer-support-cx-software'
    }, {
      label: 'E-commerce SaaS Tools',
      value: 'ecommerce-saas'
    }, {
      label: 'Finance & Accounting Software',
      value: 'finance-accounting-software'
    }, {
      label: 'HR & Recruitment Software',
      value: 'hr-recruitment-software'
    }, {
      label: 'Marketing & Sales Software',
      value: 'marketing-sales-software'
    }, {
      label: 'Operations & Productivity Software',
      value: 'operations-productivity-software'
    }, {
      label: 'Platform & API-first Tools',
      value: 'platform-api-tools'
    }, {
      label: 'Projectmanagement & Collaboration',
      value: 'projectmanagement-tools'
    }],
    vastgoed: [{
      label: 'Commercieel Vastgoedbeheer',
      value: 'commercieel-vastgoedbeheer'
    }, {
      label: 'Makelaars & Taxateurs',
      value: 'makelaars-taxateurs'
    }, {
      label: 'Proptech & Vastgoedsoftware',
      value: 'proptech-software'
    }, {
      label: 'Vastgoedinvesteringen & Beleggingsfondsen',
      value: 'vastgoedinvesteringen'
    }, {
      label: 'Vastgoedontwikkeling',
      value: 'vastgoedontwikkeling'
    }, {
      label: 'Woningverhuur & Beheer',
      value: 'woningverhuur-beheer'
    }],
    'zorg-ggz': [{
      label: 'Diagnostiek & Labdiensten',
      value: 'diagnostiek-labdiensten'
    }, {
      label: 'Huisartsen & Eerstelijnszorg',
      value: 'huisartsen-eerstelijnszorg'
    }, {
      label: 'Paramedische Praktijken',
      value: 'paramedische-praktijken'
    }, {
      label: 'Specialistische GGZ & Jeugdzorg',
      value: 'specialistische-ggz-jeugdzorg'
    }, {
      label: 'Zorginstellingen & Thuiszorg',
      value: 'zorginstellingen-thuiszorg'
    }, {
      label: 'Zorgsoftware & EPD-leveranciers',
      value: 'zorgsoftware-epd'
    }]
  };

  // Map elke subindustry slug -> label (globaal), zodat we labels kunnen opslaan in Supabase
  const subLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const opts of Object.values(subindustryByParent)) {
      for (const o of opts) map.set(o.value, o.label);
    }
    return map;
  }, []);
  const subindustryOptionsFiltered: MultiOption[] = useMemo(() => {
    // Toon subindustries voor alle geselecteerde parent-industries (uniek samenvoegen)
    const set = new Map<string, MultiOption>();
    for (const parent of audIndustries) {
      for (const opt of subindustryByParent[parent] || []) set.set(opt.value, opt);
    }
    return Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [audIndustries]);

  // Landenlijst: alle ondersteunde regio-codes via Intl (valt terug op subset)
  const countryOptions: MultiOption[] = useMemo(() => {
    try {
      const codes = (Intl as any).supportedValuesOf?.('region') as string[] | undefined;
      const regionNames = new (Intl as any).DisplayNames(['nl'], {
        type: 'region'
      });
      const list = codes && regionNames ? codes.map(code => ({
        value: code,
        label: regionNames.of(code) || code
      })) : [{
        label: 'Nederland',
        value: 'NL'
      }, {
        label: 'België',
        value: 'BE'
      }, {
        label: 'Duitsland',
        value: 'DE'
      }, {
        label: 'Frankrijk',
        value: 'FR'
      }, {
        label: 'Verenigd Koninkrijk',
        value: 'GB'
      }, {
        label: 'Verenigde Staten',
        value: 'US'
      }, {
        label: 'Spanje',
        value: 'ES'
      }, {
        label: 'Italië',
        value: 'IT'
      }, {
        label: 'Zweden',
        value: 'SE'
      }, {
        label: 'Denemarken',
        value: 'DK'
      }];
      return list.sort((a, b) => a.label.localeCompare(b.label));
    } catch {
      return [{
        label: 'Nederland',
        value: 'NL'
      }, {
        label: 'België',
        value: 'BE'
      }, {
        label: 'Duitsland',
        value: 'DE'
      }, {
        label: 'Frankrijk',
        value: 'FR'
      }, {
        label: 'Verenigd Koninkrijk',
        value: 'GB'
      }, {
        label: 'Verenigde Staten',
        value: 'US'
      }];
    }
  }, []);

  // Map country value -> label om labels door te sturen zoals ze in de UI getoond worden
  const countryLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const o of countryOptions) map.set(o.value, o.label);
    return map;
  }, [countryOptions]);
  const statesByCountry: Record<string, MultiOption[]> = {
    NL: [{
      label: 'Noord-Holland',
      value: 'noord-holland'
    }, {
      label: 'Zuid-Holland',
      value: 'zuid-holland'
    }, {
      label: 'Utrecht',
      value: 'utrecht'
    }, {
      label: 'Noord-Brabant',
      value: 'noord-brabant'
    }, {
      label: 'Gelderland',
      value: 'gelderland'
    }, {
      label: 'Overijssel',
      value: 'overijssel'
    }, {
      label: 'Groningen',
      value: 'groningen'
    }, {
      label: 'Friesland',
      value: 'friesland'
    }, {
      label: 'Drenthe',
      value: 'drenthe'
    }, {
      label: 'Flevoland',
      value: 'flevoland'
    }, {
      label: 'Zeeland',
      value: 'zeeland'
    }, {
      label: 'Limburg',
      value: 'limburg'
    }],
    BE: [{
      label: 'Antwerpen',
      value: 'antwerpen'
    }, {
      label: 'Oost-Vlaanderen',
      value: 'oost-vlaanderen'
    }, {
      label: 'West-Vlaanderen',
      value: 'west-vlaanderen'
    }, {
      label: 'Vlaams-Brabant',
      value: 'vlaams-brabant'
    }, {
      label: 'Limburg',
      value: 'limburg-be'
    }, {
      label: 'Brussel Hoofdstedelijk Gewest',
      value: 'brussel'
    }, {
      label: 'Henegouwen',
      value: 'henegouwen'
    }, {
      label: 'Luik',
      value: 'luik'
    }, {
      label: 'Luxemburg',
      value: 'luxemburg'
    }, {
      label: 'Namen',
      value: 'namen'
    }],
    DE: [{
      label: 'Bayern',
      value: 'bayern'
    }, {
      label: 'Berlin',
      value: 'berlin'
    }],
    FR: [{
      label: 'Île-de-France',
      value: 'idf'
    }, {
      label: 'Provence-Alpes-Côte d\'Azur',
      value: 'paca'
    }],
    GB: [{
      label: 'England',
      value: 'england'
    }, {
      label: 'Scotland',
      value: 'scotland'
    }, {
      label: 'Wales',
      value: 'wales'
    }],
    US: [{
      label: 'California',
      value: 'california'
    }, {
      label: 'New York',
      value: 'new-york'
    }]
  };
  const stateLabelByValue = useMemo(() => {
    const map = new Map<string, string>();
    for (const list of Object.values(statesByCountry)) {
      for (const o of list) map.set(o.value, o.label);
    }
    return map;
  }, []);
  const stateOptionsFiltered: MultiOption[] = useMemo(() => {
    const set = new Map<string, MultiOption>();
    for (const c of audCountry) {
      for (const s of statesByCountry[c] || []) set.set(s.value, s);
    }
    return Array.from(set.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [audCountry]);
  // Automatisch toewijzen (versturen naar vaste n8n webhooks)
  const [assignOpen, setAssignOpen] = useState(false);
  const [dailyCount, setDailyCount] = useState<string>(() => {
    const raw = localStorage.getItem('n8nDailyCount');
    return raw || '';
  });
  const [isAutomationEnabled, setIsAutomationEnabled] = useState<boolean>(() => {
    return localStorage.getItem('n8nAutomationEnabled') === 'true';
  });
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | undefined>(() => localStorage.getItem('n8nCampaignId') || undefined);
  // Email campaigns from Convex
  const campaignsData = useQuery(api.campaigns.list, 
    profile?.client_id ? { 
      clientId: profile.client_id as any,
      type: "email" 
    } : "skip"
  );

  // Get propositions data
  const propositionsData = useQuery(api.propositions.list, 
    profile?.client_id ? { 
      clientId: profile.client_id as any 
    } : "skip"
  );

  // Auto-fill description when proposition is selected
  useEffect(() => {
    if (propositionId && propositionsData) {
      const selectedProposition = propositionsData.find(p => p._id === propositionId);
      if (selectedProposition) {
        setDescription(selectedProposition.description || '');
      }
    } else {
      setDescription('');
    }
  }, [propositionId, propositionsData]);

  // Add mock stats for demonstration and compatibility id field
  const campaignsWithStats = useMemo(() => {
    return (campaignsData ?? []).map((campaign: any) => ({
      ...campaign,
      id: campaign._id, // Add backward compatibility id field
      stats: {
        sent: Math.floor(Math.random() * 1000) + 100,
        replies: Math.floor(Math.random() * 50) + 5,
        replyRate: Math.floor(Math.random() * 20) + 5,
        conversions: Math.floor(Math.random() * 10) + 1
      }
    }));
  }, [campaignsData]);

  // Get real-time email candidates data (all eligible candidates, not just those with suggested campaigns)
  const emailCandidatesData = useQuery(api.candidateViews.coldEmailCandidates, 
    profile?.client_id ? { 
      clientId: profile.client_id as any,
      includeAssignable: false  // Show ALL eligible candidates, not just those already assigned
    } : "skip"
  );
  
  // Get comprehensive candidate statistics with filtering breakdown
  const candidateStatsData = useQuery(api.candidateViews.coldEmailCandidatesStats, 
    profile?.client_id ? { 
      clientId: profile.client_id as any
    } : "skip"
  );
  
  // 3 main tracking categories
  const eligibleCandidatesCount = candidateStatsData?.eligibleCandidates || 0;
  const inQueueCount = candidateStatsData?.inQueue || 0;
  const inCampaignsCount = candidateStatsData?.inCampaigns || 0;
  
  // Calculate breakdown stats from real candidates data
  const candidatesStats = useMemo(() => {
    if (!emailCandidatesData) return { coldPercentage: 0, warmPercentage: 0 };
    
    const totalCandidates = emailCandidatesData.length;
    if (totalCandidates === 0) return { coldPercentage: 0, warmPercentage: 0 };
    
    const coldCount = emailCandidatesData.filter(c => c.status === 'cold').length;
    const warmCount = emailCandidatesData.filter(c => c.status === 'warm').length;
    
    return {
      coldPercentage: Math.round((coldCount / totalCandidates) * 100),
      warmPercentage: Math.round((warmCount / totalCandidates) * 100)
    };
  }, [emailCandidatesData]);

  // Calculate aggregated stats
  const aggregatedStats = useMemo(() => {
    const campaigns = campaignsWithStats ?? [];
    const totalSent = campaigns.reduce((sum, c) => sum + (c.stats?.sent || 0), 0);
    const totalReplies = campaigns.reduce((sum, c) => sum + (c.stats?.replies || 0), 0);
    const totalConversions = campaigns.reduce((sum, c) => sum + (c.stats?.conversions || 0), 0);
    const replyRate = totalSent > 0 ? Number((totalReplies / totalSent * 100).toFixed(1)) : 0;
    return {
      totalSent,
      replyRate,
      replies: totalReplies,
      conversions: totalConversions
    };
  }, [campaignsWithStats]);
  const createCampaignWithWebhook = useAction(api.campaigns.createWithWebhook);

  const handleCreateCampaign = async () => {
    try {
      console.log('🎯 Frontend: Starting campaign creation via Convex action');
      
      if (!name.trim()) throw new Error('Naam is verplicht');
      if (!propositionId) throw new Error('Propositie is verplicht');
      if (!profile?.client_id) throw new Error('Client ID is vereist');
      
      // Build targeting criteria
      const company_size_min = audSizeMin.trim() ? Number(audSizeMin) : undefined;
      const company_size_max = audSizeMax.trim() ? Number(audSizeMax) : undefined;
      
      if ((audSizeMin && Number.isNaN(company_size_min)) || (audSizeMax && Number.isNaN(company_size_max))) {
        throw new Error('Bedrijfsgrootte moet een nummer zijn');
      }
      
      const hasAny = audFunctions.length > 0 || audIndustries.length > 0 || audSubindustries.length > 0 || audCountry.length > 0 || audState.length > 0 || company_size_min !== undefined || company_size_max !== undefined;
      if (!hasAny) throw new Error('Audience filter is verplicht: vul minimaal één targetingveld in');

      setProcessingOpen(true);
      const started = Date.now();
      const total = 8000;
      const interval = window.setInterval(() => {
        const elapsed = Date.now() - started;
        const pct = Math.max(5, Math.min(99, Math.round((elapsed / total) * 100)));
        setProcessingProgress(pct);
      }, 200);
      
      const campaignData = {
        name: name.trim(),
        description: description.trim() || undefined,
        status: 'draft' as const,
        type: 'email' as const,
        clientId: profile.client_id,
        propositionId: propositionId,
        targetingCriteria: {
          functionGroups: audFunctions,
          industries: audIndustries,
          subindustries: audSubindustries,
          countries: audCountry,
          states: audState,
          companySizeMin: company_size_min,
          companySizeMax: company_size_max
        },
        settings: {
          dailyMessageLimit: 100
        },
        campaignGoal: campaignGoal,
        customGoal: customGoal
      };
      
      // Use the new action that handles both campaign creation and webhook (server-side, no CORS)
      console.log('📞 Frontend: Calling createWithWebhook action...', { campaignData });
      const campaignId = await createCampaignWithWebhook(campaignData);
      console.log('✅ Frontend: Campaign created successfully with ID:', campaignId);
      
      const finish = () => {
        setProcessingProgress(100);
        window.clearInterval(interval);
        setTimeout(() => {
          setProcessingOpen(false);
          setOpenNew(false);
          setName('');
          setDescription('');
          setAudFunctions([]);
          setAudIndustries([]);
          setAudSubindustries([]);
          setAudCountry([]);
          setAudState([]);
          setAudSizeMin('');
          setAudSizeMax('');
          setPropositionId(null);
          setCampaignGoal('Online Meeting van 30 minuten');
          setCustomGoal('');
          
          toast({ 
            title: 'Email Campaign Created', 
            description: 'Your campaign is ready to be configured and launched.' 
          });
          
          if (campaignId) navigate(`/lead-engine/email/${campaignId}`);
        }, 500);
      };
      
      setTimeout(finish, total);
    } catch (error: any) {
      console.error('❌ Frontend: Error in handleCreateCampaign:', error);
      setProcessingOpen(false);
      toast({ title: 'Mislukt', description: error?.message ?? 'Onbekende fout' });
    }
  };

  const createMutation = {
    isPending: false,
    mutate: handleCreateCampaign
  };

  // helper: map campaign_id -> proposition_id
  const campaignToProposition = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const c of campaignsData ?? []) map.set(c._id, c.propositionId ?? null);
    return map;
  }, [campaignsData]);

  // Smart Assignment action - assigns candidates to their suggested campaigns
  const smartAssignAction = useAction(api.campaigns.smartAssignCandidates);
  
  const handleSmartAssignment = async () => {
    if (!profile?.client_id) {
      toast({ title: 'Error', description: 'Client ID is required' });
      return;
    }
    
    setIsSmartAssigning(true);
    
    try {
      const dailyLimitNumber = dailyCount ? Number(dailyCount) : undefined;
      
      console.log('🚀 Starting Smart Assignment:', { 
        clientId: profile.client_id, 
        dailyLimit: dailyLimitNumber 
      });
      
      const result = await smartAssignAction({
        clientId: profile.client_id as any,
        dailyLimit: dailyLimitNumber,
      });
      
      if (result.success) {
        toast({ 
          title: 'Smart Assignment Queued! 📋', 
          description: `${result.queuedForAssignment} candidates queued for assignment. Processing morgen om 08:00.` 
        });
        
        if (result.skipped > 0) {
          console.log(`⚠️ ${result.skipped} candidates were skipped (already queued or already assigned)`);
        }
        
        if (result.errors.length > 0) {
          console.warn('⚠️ Some candidates had queueing issues:', result.errors);
        }
      } else {
        toast({ 
          title: 'Queueing Failed', 
          description: result.errors.join('. ') || 'Some candidates could not be queued for assignment.' 
        });
      }
      
    } catch (error: any) {
      console.error('❌ Smart Assignment failed:', error);
      toast({ 
        title: 'Assignment Failed', 
        description: error?.message || 'An unexpected error occurred during smart assignment.' 
      });
    } finally {
      setIsSmartAssigning(false);
    }
  };
  
  const dispatchMutation = {
    isPending: isSmartAssigning,
    mutate: handleSmartAssignment,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      {/* Modern Header - Exact ABM style */}
      <div className="border-b bg-white/80 backdrop-blur-xl sticky top-0 z-40 -ml-6 w-[102.5%] -mt-6">
        <div className="px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 bg-clip-text text-transparent">
                Email Campaigns
              </h1>
              <p className="text-slate-600 mt-1 font-medium">
                Geautomatiseerde email outreach en lead nurturing
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoek campagnes, doelgroepen..."
                  className="pl-10 w-80 h-11 bg-white/60 border-slate-200 focus:bg-white"
                />
              </div>
              <Dialog open={openNew} onOpenChange={setOpenNew}>
                <DialogTrigger asChild>
                  <Button 
                    className="h-11 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nieuwe Campagne
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl w-full h-[90vh] bg-background/95 backdrop-blur-xl border-0 shadow-2xl p-0 overflow-hidden">
                  <DialogHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-8 pb-6">
                    <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-white">
                      <div className="p-2 bg-white/20 backdrop-blur-sm rounded-lg">
                        <Mail className="w-5 h-5 text-white" />
                      </div>
                      Nieuwe Email Campagne
                    </DialogTitle>
                    <p className="text-blue-100 mt-2">
                      Creëer een nieuwe email outreach campagne om je doelgroep te bereiken
                    </p>
                  </DialogHeader>

                  <ScrollArea className="max-h-[calc(90vh-220px)] pr-6">
                    <div className="space-y-6 px-8 py-4">
                      {/* Campaign Name Section */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-600" />
                          <label className="text-sm font-medium">
                            Campagnenaam *
                          </label>
                        </div>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Geef je campagne een herkenbare naam..." className="h-11" />
                      </div>

                      {/* Proposition + Campaign Goal Selection (side by side) */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Proposition Selection */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            <label className="text-sm font-medium">
                              Propositie *
                            </label>
                          </div>
                          <PropositionSelect 
                            value={propositionId || undefined} 
                            onChange={setPropositionId}
                          />
                          {!propositionId && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              Selecteer een propositie om de campagne omschrijving automatisch in te vullen
                            </p>
                          )}
                        </div>

                        {/* Campaign Goal Selection */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Target className="w-4 h-4 text-blue-600" />
                            <label className="text-sm font-medium">
                              Doel van de campagne
                            </label>
                          </div>
                          <Popover open={goalDropdownOpen} onOpenChange={setGoalDropdownOpen}>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                role="combobox" 
                                aria-expanded={goalDropdownOpen} 
                                className="w-full justify-between h-12 bg-white/90 border-2 border-slate-200/60 hover:border-blue-300 hover:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-100 shadow-sm transition-all duration-200 font-medium"
                              >
                                <span className={campaignGoal ? "text-slate-900" : "text-slate-500"}>
                                  {campaignGoal === 'custom' 
                                    ? customGoal || 'Anders (custom)' 
                                    : campaignGoal || "Selecteer het doel van je campagne"
                                  }
                                </span>
                                <ChevronsUpDown className="ml-2 h-4 w-4 text-slate-400" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[380px] p-0 max-h-[300px] overflow-auto bg-white/95 backdrop-blur-xl border-0 shadow-2xl ring-1 ring-slate-200/50">
                              <Command className="bg-transparent">
                                <div className="border-b border-slate-200/50 bg-gradient-to-r from-slate-50 to-blue-50/30 px-4 py-3">
                                  <div className="text-sm font-medium text-slate-700">Selecteer campagne doel</div>
                                </div>
                                <CommandList className="max-h-48 overflow-auto">
                                  <CommandGroup>
                                    <div className="px-3 py-2 text-xs font-semibold text-slate-600 uppercase tracking-wider border-b border-slate-100/80 bg-slate-50/30">
                                      Beschikbare Doelen
                                    </div>
                                    
                                    {campaignGoalOptions.map(option => (
                                      <CommandItem 
                                        key={option.value} 
                                        onSelect={() => {
                                          setCampaignGoal(option.value);
                                          if (option.value !== 'custom') {
                                            setCustomGoal('');
                                          }
                                          setGoalDropdownOpen(false);
                                        }}
                                        className="px-4 py-3 cursor-pointer hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border-b border-slate-50/50 last:border-b-0"
                                      >
                                        <div className="flex items-center w-full">
                                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 mr-3 flex-shrink-0">
                                            <Target className="w-4 h-4 text-blue-600" />
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="font-medium text-slate-900 truncate">{option.label}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">
                                              {option.value === 'custom' ? 'Eigen doel invullen' : 'Standaard campagne doel'}
                                            </div>
                                          </div>
                                          <Check className={cn('w-5 h-5 text-blue-600 flex-shrink-0', campaignGoal === option.value ? 'opacity-100' : 'opacity-0')} />
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          
                          {campaignGoal === 'custom' && (
                            <div className="mt-2">
                              <Input 
                                value={customGoal}
                                onChange={(e) => setCustomGoal(e.target.value)}
                                placeholder="Beschrijf je custom campagne doel..."
                                className="h-11 bg-white/90 border-slate-200/60 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Audience Filter (verplicht) */}
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-blue-600" />
                          <label className="text-sm font-medium">Audience (verplicht)</label>
                        </div>
                        
                        {/* Row 1: Functies (volle breedte, MultiSelect) */}
                        <div className="space-y-1">
                          <label className="text-sm text-muted-foreground">Functies</label>
                          <div className="min-h-[44px]">
                            <MultiSelect options={functionOptions} value={audFunctions} onChange={setAudFunctions} placeholder="Kies 1 of meer functies" />
                          </div>
                        </div>
                        
                        {/* Row 2: Industrie + Subindustrie naast elkaar */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">Industrie</label>
                            <div className="min-h-[44px]">
                              <MultiSelect options={industryOptions} value={audIndustries} onChange={setAudIndustries} placeholder="Kies 1 of meer industrieën" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">Subindustrie</label>
                            <div className="min-h-[44px]">
                              <MultiSelect options={subindustryOptionsFiltered} value={audSubindustries} onChange={setAudSubindustries} placeholder={audIndustries.length ? 'Kies 1 of meer subindustrieën' : 'Kies eerst industrie(en)'} disabled={audIndustries.length === 0} />
                            </div>
                          </div>
                        </div>
                        
                        {/* Row 3: Land / Provincie */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">Land</label>
                            <div className="min-h-[44px]">
                              <MultiSelect options={countryOptions} value={audCountry} onChange={v => {
                              setAudCountry(v);
                              setAudState([]);
                            }} placeholder="Kies 1 of meer landen" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">Provincie</label>
                            <div className="min-h-[44px]">
                              <MultiSelect options={stateOptionsFiltered} value={audState} onChange={setAudState} placeholder={audCountry.length ? 'Kies 1 of meer provincies' : 'Kies eerst land(en)'} disabled={audCountry.length === 0} />
                            </div>
                          </div>
                        </div>

                        {/* Row 4: Company sizes */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">Company size min</label>
                            <Input type="number" inputMode="numeric" placeholder="10" value={audSizeMin} onChange={e => setAudSizeMin(e.target.value)} className="h-11" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-sm text-muted-foreground">Company size max</label>
                            <Input type="number" inputMode="numeric" placeholder="500" value={audSizeMax} onChange={e => setAudSizeMax(e.target.value)} className="h-11" />
                          </div>
                        </div>

                      </div>

                      {/* Campaign Description Section - Auto-filled from Proposition */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-blue-600" />
                          <label className="text-sm font-medium">
                            Campagne Omschrijving
                          </label>
                          {propositionId && (
                            <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                              Automatisch ingevuld
                            </Badge>
                          )}
                        </div>
                        <Textarea 
                          value={description} 
                          readOnly
                          placeholder={propositionId ? "Omschrijving wordt automatisch ingevuld vanuit de geselecteerde propositie..." : "Selecteer eerst een propositie om de omschrijving te tonen..."}
                          rows={6} 
                          className="resize-none bg-white border-slate-200 cursor-not-allowed text-slate-700" 
                        />
                        {propositionId && (
                          <p className="text-xs text-blue-600 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            Deze omschrijving is automatisch overgenomen uit je propositie
                          </p>
                        )}
                      </div>

                    </div>
                  </ScrollArea>

                  <DialogFooter className="p-6 pt-4 gap-3 bg-gray-50/50 dark:bg-slate-900/50 border-t">
                    <Button variant="outline" onClick={() => setOpenNew(false)} className="min-w-[120px]">
                      Annuleren
                    </Button>
                    <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !name.trim() || !propositionId} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white min-w-[180px]">
                      {createMutation.isPending ? <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Aanmaken...
                        </div> : <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Campagne Aanmaken
                        </>}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <div>
            <TabsList className="h-12 bg-slate-100 p-1">
              <TabsTrigger value="dashboard" className="h-10 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Target className="w-4 h-4 mr-2" />
                Campagnes
              </TabsTrigger>
              <TabsTrigger value="analytics" className="h-10 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </TabsTrigger>
              <TabsTrigger value="smart-assign" className="h-10 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Brain className="w-4 h-4 mr-2" />
                Smart Assign
              </TabsTrigger>
              <TabsTrigger value="settings" className="h-10 px-6 data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                <Settings className="w-4 h-4 mr-2" />
                Instellingen
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>
      </div>

      <div className="py-8">
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsContent value="dashboard" className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-blue-100">Berichten Verzonden</CardTitle>
                      <Mail className="w-5 h-5 text-blue-200" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {campaignsData !== undefined ? (
                      <div className="text-3xl font-bold">{aggregatedStats.totalSent.toLocaleString()}</div>
                    ) : (
                      <div className="flex items-center justify-center h-8">
                        <div className="w-6 h-6 border-2 border-blue-200 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                    <p className="text-blue-200 text-sm">alle campagnes samen</p>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-emerald-100">Reactiepercentage</CardTitle>
                      <TrendingUp className="w-5 h-5 text-emerald-200" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {campaignsData !== undefined ? (
                      <div className="text-3xl font-bold">{aggregatedStats.replyRate}%</div>
                    ) : (
                      <div className="flex items-center justify-center h-8">
                        <div className="w-6 h-6 border-2 border-emerald-200 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                    <p className="text-emerald-200 text-sm">gemiddeld reactiepercentage</p>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-orange-100">Reacties Ontvangen</CardTitle>
                      <Users className="w-5 h-5 text-orange-200" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {campaignsData !== undefined ? (
                      <div className="text-3xl font-bold">{aggregatedStats.replies.toLocaleString()}</div>
                    ) : (
                      <div className="flex items-center justify-center h-8">
                        <div className="w-6 h-6 border-2 border-orange-200 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                    <p className="text-orange-200 text-sm">totale replies</p>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-purple-100">Conversies</CardTitle>
                      <Target className="w-5 h-5 text-purple-200" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {campaignsData !== undefined ? (
                      <div className="text-3xl font-bold">{aggregatedStats.conversions.toLocaleString()}</div>
                    ) : (
                      <div className="flex items-center justify-center h-8">
                        <div className="w-6 h-6 border-2 border-purple-200 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                    <p className="text-purple-200 text-sm">succesvolle leads</p>
                  </CardContent>
                </Card>
            </div>

            {/* Active Campaigns */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Actieve Campagnes</h2>
                  <p className="text-slate-600">Lopende email outreach campagnes</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filteren
                  </Button>
                  <Button variant="outline" size="sm">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Exporteren
                  </Button>
                </div>
              </div>

              {/* Enhanced Campaign Table */}
              <EmailCampaignsTable 
                campaigns={campaignsWithStats ?? []} 
                isLoading={campaignsData === undefined} 
                onDeleted={() => {}}
              />
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-8">
            <div>
              <div className="text-center py-16">
                <div className="p-4 bg-muted/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Analytics komen binnenkort</h3>
                <p className="text-muted-foreground">Uitgebreide analytics en rapportages worden binnenkort beschikbaar.</p>
              </div>
            </div>
          </TabsContent>

          {/* Smart Assign Tab */}
          <TabsContent value="smart-assign" className="space-y-8">
            <div>
              {/* Header Section */}
              <div className="text-center mb-8">
                <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full w-20 h-20 mx-auto mb-6 flex items-center justify-center">
                  <Brain className="w-10 h-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Smart Assign</h2>
                <p className="text-slate-600 max-w-2xl mx-auto">
                  Automatische kandidaat selectie en toewijzing aan campagnes met AI-powered matching
                </p>
              </div>

              {/* Hoofdstatistieken - 3 Categorieën */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* 1. Beschikbare Kandidaten */}
                <Card className="border-0 bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-green-100">Beschikbare Kandidaten</CardTitle>
                      <Users className="w-5 h-5 text-green-200" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {candidateStatsData !== undefined ? (
                      <div className="text-3xl font-bold">{eligibleCandidatesCount.toLocaleString()}</div>
                    ) : (
                      <div className="flex items-center justify-center h-8">
                        <div className="w-6 h-6 border-2 border-green-200 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                    <p className="text-green-200 text-sm">klaar voor toewijzing aan queue</p>
                  </CardContent>
                </Card>

                {/* 2. In Wachtrij */}
                <Card className="border-0 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-amber-100">In Wachtrij</CardTitle>
                      <Activity className="w-5 h-5 text-amber-200" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {candidateStatsData !== undefined ? (
                      <div className="text-3xl font-bold">{inQueueCount.toLocaleString()}</div>
                    ) : (
                      <div className="flex items-center justify-center h-8">
                        <div className="w-6 h-6 border-2 border-amber-200 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                    <p className="text-amber-200 text-sm">wachten op verwerking</p>
                  </CardContent>
                </Card>

                {/* 3. In Campagne */}
                <Card className="border-0 bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-medium text-blue-100">In Campagne</CardTitle>
                      <Target className="w-5 h-5 text-blue-200" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    {candidateStatsData !== undefined ? (
                      <div className="text-3xl font-bold">{inCampaignsCount.toLocaleString()}</div>
                    ) : (
                      <div className="flex items-center justify-center h-8">
                        <div className="w-6 h-6 border-2 border-blue-200 border-t-white rounded-full animate-spin"></div>
                      </div>
                    )}
                    <p className="text-blue-200 text-sm">actief in email campagnes</p>
                  </CardContent>
                </Card>
              </div>

              {/* Extra Informatie - Secundaire Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Actieve Email Campagnes</p>
                        <p className="text-2xl font-bold text-slate-900">{(campaignsWithStats ?? []).length}</p>
                      </div>
                      <Mail className="w-8 h-8 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-50 border-slate-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-slate-600">Dagelijkse Verwerkingslimiet</p>
                        <p className="text-2xl font-bold text-slate-900">{dailyCount || 'Geen limiet'}</p>
                      </div>
                      <Zap className="w-8 h-8 text-slate-400" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Kandidaat Filter Overzicht - Progressive Loading */}
                <Card className="mb-8">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg text-slate-800">Kandidaat Filter Overzicht</CardTitle>
                        <p className="text-sm text-slate-600">Gedetailleerd overzicht van filter stappen</p>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <div className="text-center">
                          {candidateStatsData ? (
                            <div className="font-semibold text-blue-600">{candidateStatsData.activeCampaignsCount}</div>
                          ) : (
                            <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                          )}
                          <div className="text-slate-500">Actieve Campagnes</div>
                        </div>
                        <div className="text-center">
                          {candidateStatsData ? (
                            <div className="font-semibold text-orange-600">{candidateStatsData.abmCompaniesCount}</div>
                          ) : (
                            <div className="w-6 h-6 border-2 border-orange-200 border-t-orange-600 rounded-full animate-spin"></div>
                          )}
                          <div className="text-slate-500">ABM Bedrijven</div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {candidateStatsData ? (
                        candidateStatsData.breakdown.map((stage, index) => {
                          const isLastStage = index === candidateStatsData.breakdown.length - 1;
                          const previousCount = index > 0 ? candidateStatsData.breakdown[index - 1].count : stage.count;
                          const dropoffCount = index > 0 ? previousCount - stage.count : 0;
                          const dropoffPercentage = index > 0 && previousCount > 0 ? Math.round((dropoffCount / previousCount) * 100) : 0;
                          
                          return (
                            <div key={stage.stage} className={`flex justify-between items-center py-3 px-4 rounded-lg ${isLastStage ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}`}>
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className={`text-sm font-medium ${isLastStage ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {stage.stage}
                                  </span>
                                  {dropoffCount > 0 && (
                                    <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded">
                                      -{dropoffCount} ({dropoffPercentage}%)
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">{stage.description}</p>
                              </div>
                              <div className="text-right">
                                <span className={`text-lg font-bold ${isLastStage ? 'text-blue-600' : 'text-slate-800'}`}>
                                  {stage.count.toLocaleString()}
                                </span>
                                <div className="text-xs text-slate-400">
                                  {Math.round((stage.count / candidateStatsData.breakdown[0].count) * 100)}%
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        // Loading skeleton for breakdown
                        [1, 2, 3, 4, 5].map((i) => (
                          <div key={i} className="flex justify-between items-center py-3 px-4 rounded-lg bg-slate-50">
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/3 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded animate-pulse w-1/4"></div>
                            </div>
                            <div className="text-right">
                              <div className="h-6 bg-gray-200 rounded animate-pulse w-16 mb-1"></div>
                              <div className="h-3 bg-gray-200 rounded animate-pulse w-8"></div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

              {/* Hoofd Controle Paneel */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Toewijzing Controle */}
                <Card className="border-slate-200 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Brain className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-slate-800">Slimme Toewijzing</CardTitle>
                        <p className="text-sm text-slate-600">AI-gestuurde kandidaat toewijzing</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Automation Toggle */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Automatisering
                      </label>
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Slimme Toewijzing Inschakelen</p>
                          <p className="text-xs text-slate-500">Automatische kandidaat toewijzing aan campagnes</p>
                        </div>
                        <Switch 
                          checked={isAutomationEnabled}
                          onCheckedChange={(checked) => {
                            setIsAutomationEnabled(checked);
                            localStorage.setItem('n8nAutomationEnabled', String(checked));
                          }}
                        />
                      </div>
                    </div>

                    {isAutomationEnabled && (
                      <>
                        {/* Daily Limit Control */}
                        <div className="space-y-3">
                          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Dagelijkse Limiet
                          </label>
                          <div className="relative">
                            <Input
                              type="number"
                              value={dailyCount}
                              onChange={e => {
                                const val = e.target.value;
                                setDailyCount(val);
                                localStorage.setItem('n8nDailyCount', val);
                              }}
                              placeholder="Bijv. 50"
                              className="h-12 border-2 pr-16"
                              min="1"
                              max="500"
                            />
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-slate-500">
                              / dag
                            </div>
                          </div>
                          <p className="text-xs text-slate-500">Aantal kandidaten per dag automatisch toewijzen (laat leeg voor onbeperkt)</p>
                        </div>

                        {/* Smart Assignment Info */}
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <h4 className="text-sm font-medium text-green-800 mb-2">Slimme Toewijzing</h4>
                          <p className="text-sm text-green-600">
                            Het systeem wijst automatisch elke kandidaat toe aan hun best passende campagne op basis van strikte criteria.
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-xs text-green-600">
                            <span>✅ Strikte filtering</span>
                            <span>•</span>
                            <span>✅ Campagne geschiedenis</span>
                            <span>•</span>
                            <span>✅ Cooldown periodes</span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Assignment Button */}
                    <Button 
                      onClick={() => dispatchMutation.mutate()}
                      disabled={dispatchMutation.isPending || !isAutomationEnabled}
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-12 text-base font-medium"
                    >
                      {dispatchMutation.isPending ? (
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Toewijzen...
                        </div>
                      ) : !isAutomationEnabled ? (
                        <>
                          <Zap className="w-5 h-5 mr-2" />
                          Automatisering Uitgeschakeld
                        </>
                      ) : (
                        <>
                          <Brain className="w-5 h-5 mr-2" />
                          Start Slimme Toewijzing
                        </>
                      )}
                    </Button>

                    {!isAutomationEnabled && (
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                        <h4 className="text-sm font-medium text-amber-800 mb-2">Automatisering Uitgeschakeld</h4>
                        <p className="text-sm text-amber-600">
                          Schakel automatisering in om candidates automatisch toe te wijzen aan campagnes op basis van intelligente matching.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Candidate Preview */}
                <Card className="border-slate-200 shadow-lg">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <Users className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg text-slate-800">Candidate Pool</CardTitle>
                        <p className="text-sm text-slate-600">Overzicht beschikbare prospects</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Loading State */}
                    {!emailCandidatesData ? (
                      <div className="text-center py-8">
                        <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-500">Laden van candidates...</p>
                      </div>
                    ) : emailCandidatesData.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="p-3 bg-orange-100 rounded-full w-12 h-12 mx-auto mb-4 flex items-center justify-center">
                          <Search className="w-6 h-6 text-orange-600" />
                        </div>
                        <h4 className="font-medium text-slate-800 mb-2">Geen Candidates Beschikbaar</h4>
                        <p className="text-sm text-slate-600">Momenteel zijn er geen qualified candidates voor assignment.</p>
                      </div>
                    ) : (
                      <>
                        {/* Candidate Stats */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
                            <div className="text-2xl font-bold text-blue-700">{eligibleCandidatesCount}</div>
                            <div className="text-sm text-blue-600">Beschikbare Kandidaten</div>
                          </div>
                          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
                            <div className="text-2xl font-bold text-green-700">{dailyCount ? Math.min(Number(dailyCount), eligibleCandidatesCount) : eligibleCandidatesCount}</div>
                            <div className="text-sm text-green-600">{dailyCount ? 'Volgende Toewijzing' : 'Alle Beschikbaar'}</div>
                          </div>
                        </div>

                        {/* Quality Indicators */}
                        <div className="space-y-3">
                          <h4 className="text-sm font-medium text-slate-700">Kwaliteit Indicators</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Verified Email</span>
                              <Badge variant="outline" className="text-green-600">100%</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">Company Enriched</span>
                              <Badge variant="outline" className="text-blue-600">100%</Badge>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-slate-600">No Recent Contact</span>
                              <Badge variant="outline" className="text-purple-600">Verified</Badge>
                            </div>
                          </div>
                        </div>

                        {/* Preview Button */}
                        <Button 
                          variant="outline" 
                          className="w-full border-2 border-slate-200 hover:bg-slate-50"
                          onClick={() => {
                            toast({ 
                              title: 'Kandidaat Preview', 
                              description: `Preview van ${eligibleCandidatesCount} beschikbare kandidaten` 
                            });
                          }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          Preview Kandidaten ({eligibleCandidatesCount})
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* How It Works Section */}
              <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Star className="w-6 h-6 text-amber-500" />
                    <CardTitle className="text-xl text-slate-800">Hoe Smart Assign werkt</CardTitle>
                  </div>
                  <p className="text-slate-600 mt-2">
                    Onze AI-powered assignment engine zorgt voor optimale kandidaat-campagne matching
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="text-center space-y-4">
                      <div className="p-4 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl w-16 h-16 mx-auto flex items-center justify-center">
                        <Brain className="w-8 h-8 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-2">AI Analyse</h4>
                        <p className="text-sm text-slate-600">Analyseert campagne criteria en vindt matching prospects</p>
                      </div>
                    </div>
                    <div className="text-center space-y-4">
                      <div className="p-4 bg-gradient-to-br from-green-100 to-green-200 rounded-xl w-16 h-16 mx-auto flex items-center justify-center">
                        <Target className="w-8 h-8 text-green-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-2">Smart Targeting</h4>
                        <p className="text-sm text-slate-600">Selecteert hoogwaardige candidates op basis van fit score</p>
                      </div>
                    </div>
                    <div className="text-center space-y-4">
                      <div className="p-4 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl w-16 h-16 mx-auto flex items-center justify-center">
                        <Activity className="w-8 h-8 text-purple-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-2">Timing Optimalisatie</h4>
                        <p className="text-sm text-slate-600">Respecteert cooldown periodes en optimale send times</p>
                      </div>
                    </div>
                    <div className="text-center space-y-4">
                      <div className="p-4 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl w-16 h-16 mx-auto flex items-center justify-center">
                        <Zap className="w-8 h-8 text-orange-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-800 mb-2">Auto Assignment</h4>
                        <p className="text-sm text-slate-600">Wijst automatisch toe met real-time tracking</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Smart Assignment Tab */}
          <TabsContent value="smart-assign" className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Smart Assignment Queue Status */}
              <div className="lg:col-span-1">
                <SmartAssignmentQueue clientId={profile.client_id || ''} />
              </div>

              {/* Smart Assignment Control Panel */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Smart Assignment Control
                    </CardTitle>
                    <p className="text-muted-foreground">
                      Automatisch kandidaten toewijzen aan de best passende campagnes
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Daily Limit Setting */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Dagelijkse Limiet</label>
                      <Input
                        type="number"
                        value={dailyCount}
                        onChange={(e) => setDailyCount(e.target.value)}
                        placeholder="50"
                        className="max-w-xs"
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum aantal contacten om toe te wijzen (leeg = onbeperkt)
                      </p>
                    </div>

                    {/* Assignment Action */}
                    <div className="pt-4 border-t">
                      <Button
                        onClick={handleSmartAssignment}
                        disabled={isSmartAssigning}
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white min-w-[200px]"
                      >
                        {isSmartAssigning ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Bezig met toewijzen...
                          </div>
                        ) : (
                          <>
                            <Zap className="w-4 h-4 mr-2" />
                            Start Smart Assignment
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground mt-2">
                        Voegt kandidaten toe aan de wachtrij voor toewijzing morgen om 08:00
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-8">
            <div>
              <div className="text-center py-16">
                <div className="p-4 bg-muted/30 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <Settings className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">Instellingen komen binnenkort</h3>
                <p className="text-muted-foreground">Campagne instellingen en automatiseringen worden binnenkort beschikbaar.</p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Premium Processing Modal */}
      <Dialog open={processingOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-0 shadow-xl">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="absolute inset-0 opacity-20" style={{backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%236366f1\" fill-opacity=\"0.03\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"1.5\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')"}}></div>
            <div className="absolute top-0 left-0 w-24 h-24 bg-blue-100/30 rounded-full blur-2xl animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-indigo-100/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          </div>
          
          {/* Content */}
          <div className="relative z-10 p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="relative mx-auto mb-6">
                {/* Main Loading Icon */}
                <div className="w-16 h-16 mx-auto relative">
                  <div className="absolute inset-0 rounded-full border-3 border-slate-200/40"></div>
                  <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-blue-500 border-r-blue-500 animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-2 border-slate-300/30"></div>
                  <div className="absolute inset-3 rounded-full bg-blue-50/70 backdrop-blur-sm flex items-center justify-center">
                    <Brain className="w-6 h-6 text-blue-600 animate-pulse" />
                  </div>
                </div>
                
                {/* Floating particles */}
                <div className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-blue-400/40 rounded-full animate-bounce delay-300"></div>
                <div className="absolute -top-0.5 -right-2 w-1 h-1 bg-indigo-400/30 rounded-full animate-bounce delay-700"></div>
                <div className="absolute -bottom-2 left-2 w-0.5 h-0.5 bg-blue-500/30 rounded-full animate-bounce delay-500"></div>
                <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-slate-400/20 rounded-full animate-bounce delay-1000"></div>
              </div>
              
              <DialogTitle className="text-2xl font-semibold text-slate-800 mb-3 tracking-tight">
                Email Campagne wordt voorbereid
              </DialogTitle>
              <p className="text-slate-600 text-base max-w-sm mx-auto leading-relaxed">
                Onze AI configureert je targeting criteria en optimaliseert je campagne instellingen
              </p>
            </div>

            {/* Progress Section */}
            <div className="space-y-6">
              {/* Current Step */}
              <div className="text-center">
                <div className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/70 backdrop-blur-sm rounded-full border border-slate-200/50 shadow-sm">
                  <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-slate-700 font-medium text-sm">Preparing campaign structure...</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-3">
                <div className="relative">
                  <div className="w-full h-2.5 bg-slate-200/50 backdrop-blur-sm rounded-full overflow-hidden border border-slate-200/30">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-700 ease-out rounded-full relative overflow-hidden"
                      style={{ width: `${processingProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-slate-500 text-sm">Voortgang</span>
                    <span className="text-slate-700 font-semibold text-sm">{processingProgress}%</span>
                  </div>
                </div>
              </div>

              {/* Steps Preview */}
              <div className="grid grid-cols-3 gap-3 mt-6">
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 bg-blue-50/80 backdrop-blur-sm rounded-lg border border-blue-100/50 flex items-center justify-center">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <p className="text-slate-700 text-xs font-medium">Targeting</p>
                  <p className="text-slate-500 text-xs">Instellen</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 bg-indigo-50/80 backdrop-blur-sm rounded-lg border border-indigo-100/50 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-600" />
                  </div>
                  <p className="text-slate-700 text-xs font-medium">AI Content</p>
                  <p className="text-slate-500 text-xs">Genereren</p>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 mx-auto mb-2 bg-emerald-50/80 backdrop-blur-sm rounded-lg border border-emerald-100/50 flex items-center justify-center">
                    <Rocket className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-slate-700 text-xs font-medium">Campaign</p>
                  <p className="text-slate-500 text-xs">Activeren</p>
                </div>
              </div>

              {/* Bottom Note */}
              <div className="text-center pt-4 border-t border-slate-200/30">
                <p className="text-slate-500 text-sm">
                  Dit proces duurt ongeveer 30-45 seconden en sluit automatisch wanneer klaar
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}