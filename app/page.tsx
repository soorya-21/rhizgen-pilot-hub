'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { exportToCSV } from '@/lib/exportUtils';
import ReactMarkdown from 'react-markdown';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface Farmer {
  id: string;
  farmer_code: string;
  farmer_name: string;
  village: string;
  field_size_acres: number;
  soil_type: string;
  irrigation_type: string;
  variety: string;
}

interface TreatmentBlock {
  id: string;
  farmer_id: string;
  treatment: 'TC_SEEDLING' | 'CONVENTIONAL_RHIZOME';
  area_acres: number;
  quantity_planted: number;
}

interface HarvestSummary {
  treatment: string;
  avgYieldPerAcre: number;
  avgMarketablePct: number;
  totalHarvestWeight: number;
  recordCount: number;
}

interface ChartDataPoint {
  farmer: string;
  'TC Seedlings (kg/ac)': number;
  'Conventional (kg/ac)': number;
}

interface FarmerSurveyRecord {
  id: string;
  farmer_id: string;
  survey_date: string;
  overall_satisfaction: number;
  perceived_yield_comparison: string;
  ease_of_management: number;
  willingness_to_pay_inr: number;
  repurchase_intent: boolean;
  qualitative_feedback: string | null;
  created_at: string;
  farmers?: {
    farmer_code: string;
    farmer_name: string;
    village: string;
  };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Inline AuthModal with Sign In / Sign Up toggle and Password Show/Hide
function AuthModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    if (mode === 'LOGIN') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      setLoading(false);
      if (error) {
        setErrorMsg(error.message);
      } else {
        onSuccess();
        onClose();
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      setLoading(false);
      if (error) {
        setErrorMsg(error.message);
      } else {
        onSuccess();
        onClose();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-sm w-full shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900">
            {mode === 'LOGIN' ? 'Field Officer Login' : 'Register New Officer'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-lg font-bold"
          >
            ✕
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          {mode === 'LOGIN'
            ? 'Authenticate to record field observations and surveys.'
            : 'Create a new officer account to log trial records.'}
        </p>

        {/* Mode Switch Tabs */}
        <div className="flex border border-slate-200 rounded-lg p-1 bg-slate-50 mt-4">
          <button
            type="button"
            onClick={() => {
              setMode('LOGIN');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              mode === 'LOGIN'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('SIGNUP');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
              mode === 'SIGNUP'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            + New Officer
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@gingertrial.com"
              className="w-full border border-slate-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase">Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] font-medium text-slate-500 hover:text-slate-800"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-lg p-2.5 text-sm pr-10 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs"
              >
                {showPassword ? '🔒' : '👁️'}
              </button>
            </div>
          </div>

          {errorMsg && <p className="text-xs text-rose-600 font-semibold">{errorMsg}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
            >
              {loading
                ? mode === 'LOGIN'
                  ? 'Logging In...'
                  : 'Registering...'
                : mode === 'LOGIN'
                ? 'Sign In'
                : 'Create Officer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [treatmentBlocks, setTreatmentBlocks] = useState<TreatmentBlock[]>([]);
  const [harvestRecords, setHarvestRecords] = useState<any[]>([]);
  const [diseaseRecords, setDiseaseRecords] = useState<any[]>([]);
  const [costRecords, setCostRecords] = useState<any[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [surveysList, setSurveysList] = useState<FarmerSurveyRecord[]>([]);
  const [tcStats, setTcStats] = useState<HarvestSummary | null>(null);
  const [convStats, setConvStats] = useState<HarvestSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Collapsible Section State
  const [isSurveysOpen, setIsSurveysOpen] = useState<boolean>(false);

  // Active Tab View
  const [activeTab, setActiveTab] = useState<'OBSERVATION' | 'HARVEST' | 'SURVEY' | 'AI_ANALYST'>('OBSERVATION');

  // Form Selection
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>('');
  const [selectedTreatment, setSelectedTreatment] = useState<'TC_SEEDLING' | 'CONVENTIONAL_RHIZOME'>('TC_SEEDLING');

  // Observation State
  const [observationDate, setObservationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [plantsPlanted, setPlantsPlanted] = useState<number>(5000);
  const [plantsEstablished, setPlantsEstablished] = useState<number>(4850);
  const [diseaseObserved, setDiseaseObserved] = useState<boolean>(false);
  const [suspectedDisease, setSuspectedDisease] = useState<string>('');
  const [affectedCount, setAffectedCount] = useState<number>(0);
  const [severityRating, setSeverityRating] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');

  // Harvest & Economics State
  const [harvestDate, setHarvestDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [harvestArea, setHarvestArea] = useState<number>(0.2);
  const [totalYieldKg, setTotalYieldKg] = useState<number>(1100);
  const [marketableYieldKg, setMarketableYieldKg] = useState<number>(1050);
  const [inputCostInr, setInputCostInr] = useState<number>(45000);
  const [marketPricePerKg, setMarketPricePerKg] = useState<number>(60);

  // Survey Feedback State
  const [surveySatisfaction, setSurveySatisfaction] = useState<number>(5);
  const [perceivedYield, setPerceivedYield] = useState<string>('MUCH_HIGHER');
  const [easeOfMgmt, setEaseOfMgmt] = useState<number>(4);
  const [wtpInr, setWtpInr] = useState<number>(15);
  const [repurchaseIntent, setRepurchaseIntent] = useState<boolean>(true);
  const [farmerNotes, setFarmerNotes] = useState<string>('');

  // Multi-Turn Streaming Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Hello! I am your AI Trial Research Assistant and Agronomic Economist. Ask me about yields, farmer economics, ROI, or village-level trends across Hassan pilot farms.',
    },
  ]);
  const [userInput, setUserInput] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    loadData();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isStreaming]);

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage(null);
    }, 4000);
  };

  async function loadData() {
    try {
      setLoading(true);

      const { data: farmersData } = await supabase
        .from('farmers')
        .select('*')
        .order('farmer_code', { ascending: true });

      const { data: blocksData } = await supabase
        .from('treatment_blocks')
        .select('*');

      const { data: harvestData } = await supabase
        .from('harvest_records')
        .select('*, treatment_blocks(farmer_id, treatment, area_acres)');

      const { data: diseaseData } = await supabase.from('disease_records').select('*');
      const { data: costData } = await supabase.from('cost_records').select('*');

      const { data: surveysData } = await supabase
        .from('farmer_surveys')
        .select('*, farmers(farmer_code, farmer_name, village)')
        .order('created_at', { ascending: false });

      if (farmersData && farmersData.length > 0) {
        setFarmers(farmersData);
        if (!selectedFarmerId) setSelectedFarmerId(farmersData[0].id);
      }
      if (blocksData) setTreatmentBlocks(blocksData);
      if (harvestData) setHarvestRecords(harvestData);
      if (diseaseData) setDiseaseRecords(diseaseData);
      if (costData) setCostRecords(costData);
      if (surveysData) setSurveysList(surveysData as any);

      if (harvestData && harvestData.length > 0 && farmersData) {
        const structuredChartData: ChartDataPoint[] = farmersData.map((farmer) => {
          const tcRecord = harvestData.find(
            (h: any) => h.treatment_blocks?.farmer_id === farmer.id && h.treatment_blocks?.treatment === 'TC_SEEDLING'
          );
          const convRecord = harvestData.find(
            (h: any) => h.treatment_blocks?.farmer_id === farmer.id && h.treatment_blocks?.treatment === 'CONVENTIONAL_RHIZOME'
          );

          return {
            farmer: farmer.farmer_code.replace('FARMER-', 'F-'),
            'TC Seedlings (kg/ac)': tcRecord ? Math.round(Number(tcRecord.yield_per_acre_kg)) : 0,
            'Conventional (kg/ac)': convRecord ? Math.round(Number(convRecord.yield_per_acre_kg)) : 0,
          };
        });

        setChartData(structuredChartData);

        const tcRecords = harvestData.filter((h: any) => h.treatment_blocks?.treatment === 'TC_SEEDLING');
        const convRecords = harvestData.filter((h: any) => h.treatment_blocks?.treatment === 'CONVENTIONAL_RHIZOME');

        if (tcRecords.length > 0) {
          const avgYield = tcRecords.reduce((acc: number, r: any) => acc + Number(r.yield_per_acre_kg || 0), 0) / tcRecords.length;
          const totalKg = tcRecords.reduce((acc: number, r: any) => acc + Number(r.total_yield_kg || 0), 0);
          const totalMkt = tcRecords.reduce((acc: number, r: any) => acc + Number(r.marketable_yield_kg || 0), 0);
          setTcStats({
            treatment: 'TC Seedlings',
            avgYieldPerAcre: Math.round(avgYield),
            avgMarketablePct: Math.round((totalMkt / (totalKg || 1)) * 100),
            totalHarvestWeight: Math.round(totalKg),
            recordCount: tcRecords.length,
          });
        }

        if (convRecords.length > 0) {
          const avgYield = convRecords.reduce((acc: number, r: any) => acc + Number(r.yield_per_acre_kg || 0), 0) / convRecords.length;
          const totalKg = convRecords.reduce((acc: number, r: any) => acc + Number(r.total_yield_kg || 0), 0);
          const totalMkt = convRecords.reduce((acc: number, r: any) => acc + Number(r.marketable_yield_kg || 0), 0);
          setConvStats({
            treatment: 'Conventional Rhizome',
            avgYieldPerAcre: Math.round(avgYield),
            avgMarketablePct: Math.round((totalMkt / (totalKg || 1)) * 100),
            totalHarvestWeight: Math.round(totalKg),
            recordCount: convRecords.length,
          });
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleExportMasterCSV = () => {
    const MARKET_PRICE = 60;
    const masterRows = farmers.map((f) => {
      const fBlocks = treatmentBlocks.filter((b) => b.farmer_id === f.id);
      const tcBlock = fBlocks.find((b) => b.treatment === 'TC_SEEDLING');
      const convBlock = fBlocks.find((b) => b.treatment === 'CONVENTIONAL_RHIZOME');

      const tcHarvest = harvestRecords.find((h) => h.block_id === tcBlock?.id);
      const convHarvest = harvestRecords.find((h) => h.block_id === convBlock?.id);

      const tcCost = costRecords.filter((c) => c.block_id === tcBlock?.id).reduce((sum, c) => sum + Number(c.amount_inr || 0), 0);
      const convCost = costRecords.filter((c) => c.block_id === convBlock?.id).reduce((sum, c) => sum + Number(c.amount_inr || 0), 0);

      const fSurvey = surveysList.find((s) => s.farmer_id === f.id);

      const tcYieldAc = tcHarvest?.yield_per_acre_kg ? Math.round(Number(tcHarvest.yield_per_acre_kg)) : 0;
      const convYieldAc = convHarvest?.yield_per_acre_kg ? Math.round(Number(convHarvest.yield_per_acre_kg)) : 0;

      const tcNetProfit = tcHarvest ? Math.round(Number(tcHarvest.marketable_yield_kg) * MARKET_PRICE - tcCost) : 0;
      const convNetProfit = convHarvest ? Math.round(Number(convHarvest.marketable_yield_kg) * MARKET_PRICE - convCost) : 0;

      return {
        'Farmer Code': f.farmer_code,
        'Farmer Name': f.farmer_name,
        Village: f.village,
        'Soil Type': f.soil_type || 'Sandy Loam',
        Irrigation: f.irrigation_type || 'Drip',
        'TC Planted Area (Ac)': tcBlock?.area_acres || 0.2,
        'TC Yield (kg/ac)': tcYieldAc,
        'TC Total Harvest (kg)': tcHarvest?.total_yield_kg || 0,
        'TC Cultivation Cost (INR)': tcCost,
        'TC Net Profit (INR)': tcNetProfit,
        'Conv Planted Area (Ac)': convBlock?.area_acres || 0.8,
        'Conv Yield (kg/ac)': convYieldAc,
        'Conv Total Harvest (kg)': convHarvest?.total_yield_kg || 0,
        'Conv Cultivation Cost (INR)': convCost,
        'Conv Net Profit (INR)': convNetProfit,
        'Yield Difference (kg/ac)': tcYieldAc - convYieldAc,
        'Satisfaction Score (1-5)': fSurvey?.overall_satisfaction || 'Pending',
        'WTP (INR/seedling)': fSurvey?.willingness_to_pay_inr || 'Pending',
        'Repurchase Intent': fSurvey?.repurchase_intent ? 'Yes' : 'No/Pending',
      };
    });

    exportToCSV('GingerTrial_Hassan_Master_Dataset', masterRows);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleTreatmentChange = (t: 'TC_SEEDLING' | 'CONVENTIONAL_RHIZOME') => {
    setSelectedTreatment(t);
    if (t === 'TC_SEEDLING') {
      setPlantsPlanted(5000);
      setPlantsEstablished(4850);
      setHarvestArea(0.2);
      setTotalYieldKg(1100);
      setMarketableYieldKg(1050);
    } else {
      setPlantsPlanted(20000);
      setPlantsEstablished(18500);
      setHarvestArea(0.8);
      setTotalYieldKg(3400);
      setMarketableYieldKg(3100);
    }
  };

  const handleSaveObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const targetBlock = treatmentBlocks.find((b) => b.farmer_id === selectedFarmerId && b.treatment === selectedTreatment);

    if (!targetBlock) {
      showStatus('Error: Treatment block not found.');
      return;
    }

    try {
      const { error: estError } = await supabase.from('establishment_records').insert({
        block_id: targetBlock.id,
        observation_date: observationDate,
        plants_planted: Number(plantsPlanted),
        plants_established: Number(plantsEstablished),
        notes: notes || null,
      });

      if (estError) throw estError;

      if (diseaseObserved) {
        const { error: disError } = await supabase.from('disease_records').insert({
          block_id: targetBlock.id,
          observation_date: observationDate,
          disease_observed: true,
          suspected_disease: suspectedDisease || 'Unspecified',
          affected_plants_count: Number(affectedCount),
          severity_rating: Number(severityRating),
          notes: notes || null,
        });
        if (disError) throw disError;
      }

      showStatus('Observation saved successfully!');
      setNotes('');
    } catch (err: any) {
      showStatus(`Error: ${err.message}`);
    }
  };

  const handleSaveHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const targetBlock = treatmentBlocks.find((b) => b.farmer_id === selectedFarmerId && b.treatment === selectedTreatment);

    if (!targetBlock) {
      showStatus('Error: Treatment block not found.');
      return;
    }

    try {
      const { error: hError } = await supabase.from('harvest_records').upsert(
        {
          block_id: targetBlock.id,
          harvest_date: harvestDate,
          harvested_area_acres: Number(harvestArea),
          total_yield_kg: Number(totalYieldKg),
          marketable_yield_kg: Number(marketableYieldKg),
          notes: `Valuation at ₹${marketPricePerKg}/kg`,
        },
        { onConflict: 'block_id' }
      );

      if (hError) throw hError;

      if (inputCostInr > 0) {
        await supabase.from('cost_records').insert({
          block_id: targetBlock.id,
          category: 'PLANTING_MATERIAL',
          description: `Total cultivation cost entered during harvest`,
          amount_inr: Number(inputCostInr),
          date_incurred: harvestDate,
        });
      }

      showStatus('Harvest & Economics recorded successfully!');
      await loadData();
    } catch (err: any) {
      showStatus(`Error saving harvest: ${err.message}`);
    }
  };

  const handleSaveSurvey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const { error } = await supabase.from('farmer_surveys').insert({
        farmer_id: selectedFarmerId,
        overall_satisfaction: Number(surveySatisfaction),
        perceived_yield_comparison: perceivedYield,
        ease_of_management: Number(easeOfMgmt),
        willingness_to_pay_inr: Number(wtpInr),
        repurchase_intent: repurchaseIntent,
        qualitative_feedback: farmerNotes || null,
      });

      if (error) throw error;

      showStatus('Farmer survey recorded successfully!');
      setFarmerNotes('');
      await loadData();
    } catch (err: any) {
      showStatus(`Error saving survey: ${err.message}`);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isStreaming) return;

    const userMessageText = userInput.trim();
    const updatedMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: userMessageText }];
    setChatMessages(updatedMessages);
    setUserInput('');
    setIsStreaming(true);

    setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/analyst', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.body) throw new Error('Readable stream not supported');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedReply = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const textChunk = decoder.decode(value, { stream: true });
        accumulatedReply += textChunk;

        setChatMessages((prev) => {
          const newArr = [...prev];
          newArr[newArr.length - 1] = { role: 'assistant', content: accumulatedReply };
          return newArr;
        });
      }
    } catch (err: any) {
      setChatMessages((prev) => {
        const newArr = [...prev];
        newArr[newArr.length - 1] = { role: 'assistant', content: `Error streaming response: ${err.message}` };
        return newArr;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const yieldAdvantage =
    tcStats && convStats && convStats.avgYieldPerAcre > 0
      ? (((tcStats.avgYieldPerAcre - convStats.avgYieldPerAcre) / convStats.avgYieldPerAcre) * 100).toFixed(1)
      : null;

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-8 font-sans text-slate-800 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header with Export & Auth Controls */}
        <header className="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">GingerTrial AI</h1>
            <p className="text-slate-600 text-sm mt-1">
              Pilot Trial: Tissue Culture vs Conventional Ginger (Hassan District, Rio de Janeiro Variety)
            </p>
          </div>
          <div className="flex items-center gap-3 print:hidden">
            <button
              onClick={handleExportMasterCSV}
              className="inline-flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
            >
              <span>📥</span> Export Master CSV
            </button>
            <button
              onClick={handlePrintReport}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors shadow-sm"
            >
              <span>📄</span> Print Summary PDF
            </button>
            {user ? (
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg font-semibold transition-colors"
              >
                Sign Out ({user.email?.split('@')[0]})
              </button>
            ) : (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm"
              >
                Officer Login
              </button>
            )}
          </div>
        </header>

        {/* Screen 1: Trial KPI Performance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pilot Scale</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">10 Farmers</p>
            <p className="text-xs text-slate-500 mt-1">50,000 TC Seedlings Distributed</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
            <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">TC Avg Yield / Acre</p>
            <p className="text-2xl font-bold text-emerald-800 mt-1">
              {tcStats ? `${tcStats.avgYieldPerAcre.toLocaleString()} kg/ac` : '—'}
            </p>
            <p className="text-xs text-emerald-600 mt-1">{tcStats?.avgMarketablePct || 0}% Marketable</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/20 shadow-sm">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Conv. Avg Yield / Acre</p>
            <p className="text-2xl font-bold text-amber-800 mt-1">
              {convStats ? `${convStats.avgYieldPerAcre.toLocaleString()} kg/ac` : '—'}
            </p>
            <p className="text-xs text-amber-600 mt-1">{convStats?.avgMarketablePct || 0}% Marketable</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-indigo-200 bg-indigo-50/20 shadow-sm">
            <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wider">TC Yield Advantage</p>
            <p className="text-2xl font-bold text-indigo-800 mt-1">{yieldAdvantage ? `+${yieldAdvantage}%` : '—'}</p>
            <p className="text-xs text-indigo-600 mt-1">Normalized per Acre Basis</p>
          </div>
        </div>

        {/* Comparative Visual Analytics Chart */}
        {chartData.length > 0 && (
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-slate-900">Per-Farm Comparative Yield (kg / Acre)</h2>
              <p className="text-xs text-slate-500">
                Direct paired comparison between TC seedlings and Conventional rhizomes for all 10 pilot farms
              </p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="farmer" tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis tickLine={false} tick={{ fontSize: 12 }} unit=" kg" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '10px' }} />
                  <Bar dataKey="TC Seedlings (kg/ac)" fill="#059669" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Conventional (kg/ac)" fill="#D97706" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Action Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:hidden">
          <div className="flex border-b border-slate-200 gap-6 mb-6">
            <button
              onClick={() => {
                setActiveTab('OBSERVATION');
                setStatusMessage(null);
              }}
              className={`pb-3 text-sm font-bold transition-colors ${
                activeTab === 'OBSERVATION'
                  ? 'border-b-2 border-emerald-600 text-emerald-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Field Observations
            </button>
            <button
              onClick={() => {
                setActiveTab('HARVEST');
                setStatusMessage(null);
              }}
              className={`pb-3 text-sm font-bold transition-colors ${
                activeTab === 'HARVEST'
                  ? 'border-b-2 border-emerald-600 text-emerald-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Harvest & Economics
            </button>
            <button
              onClick={() => {
                setActiveTab('SURVEY');
                setStatusMessage(null);
              }}
              className={`pb-3 text-sm font-bold transition-colors ${
                activeTab === 'SURVEY'
                  ? 'border-b-2 border-emerald-600 text-emerald-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Farmer Feedback Survey
            </button>
            <button
              onClick={() => {
                setActiveTab('AI_ANALYST');
                setStatusMessage(null);
              }}
              className={`pb-3 text-sm font-bold transition-colors ${
                activeTab === 'AI_ANALYST'
                  ? 'border-b-2 border-indigo-600 text-indigo-700'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              AI Trial Analyst (Interactive Chat)
            </button>
          </div>

          {!user && activeTab !== 'AI_ANALYST' && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-800">
              <span>Read-only preview. Sign in as a Field Officer to submit new records.</span>
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="font-bold underline text-amber-900 ml-2"
              >
                Sign In
              </button>
            </div>
          )}

          {/* Target Selector for Observation & Harvest */}
          {(activeTab === 'OBSERVATION' || activeTab === 'HARVEST') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Select Farmer</label>
                <select
                  value={selectedFarmerId}
                  onChange={(e) => setSelectedFarmerId(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                >
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.farmer_code} - {f.farmer_name} ({f.village})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">Treatment Block</label>
                <select
                  value={selectedTreatment}
                  onChange={(e) => handleTreatmentChange(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                >
                  <option value="TC_SEEDLING">TC-Derived Seedlings (~0.2 ac)</option>
                  <option value="CONVENTIONAL_RHIZOME">Conventional Rhizome (~0.8 ac)</option>
                </select>
              </div>
            </div>
          )}

          {/* Target Selector for Survey */}
          {activeTab === 'SURVEY' && (
            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label className="block text-xs font-semibold uppercase text-slate-600 mb-1">
                Select Responding Farmer
              </label>
              <select
                value={selectedFarmerId}
                onChange={(e) => setSelectedFarmerId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
              >
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.farmer_code} - {f.farmer_name} ({f.village})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* TAB 1: FIELD OBSERVATION */}
          {activeTab === 'OBSERVATION' && (
            <form onSubmit={handleSaveObservation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Observation Date</label>
                  <input
                    type="date"
                    value={observationDate}
                    onChange={(e) => setObservationDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Plants Planted</label>
                  <input
                    type="number"
                    value={plantsPlanted}
                    onChange={(e) => setPlantsPlanted(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Plants Established</label>
                  <input
                    type="number"
                    value={plantsEstablished}
                    onChange={(e) => setPlantsEstablished(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Calculated Establishment:</span>
                <span className="text-sm font-bold text-emerald-700">
                  {plantsPlanted > 0 ? ((plantsEstablished / plantsPlanted) * 100).toFixed(1) : 0}%
                </span>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="diseaseCheck"
                    checked={diseaseObserved}
                    onChange={(e) => setDiseaseObserved(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded"
                  />
                  <label htmlFor="diseaseCheck" className="text-xs font-bold text-slate-700 uppercase">
                    Record Disease Incidence
                  </label>
                </div>

                {diseaseObserved && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-red-50/50 border border-red-200 rounded-lg">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Suspected Disease</label>
                      <input
                        type="text"
                        placeholder="e.g. Soft Rot (Pythium)"
                        value={suspectedDisease}
                        onChange={(e) => setSuspectedDisease(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Affected Plants Count</label>
                      <input
                        type="number"
                        value={affectedCount}
                        onChange={(e) => setAffectedCount(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">Severity (1-5)</label>
                      <select
                        value={severityRating}
                        onChange={(e) => setSeverityRating(Number(e.target.value))}
                        className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                      >
                        <option value="1">1 - Mild</option>
                        <option value="2">2 - Low</option>
                        <option value="3">3 - Moderate</option>
                        <option value="4">4 - High</option>
                        <option value="5">5 - Severe</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
                >
                  Save Observation
                </button>
                {statusMessage && <span className="text-xs font-bold text-emerald-700">{statusMessage}</span>}
              </div>
            </form>
          )}

          {/* TAB 2: HARVEST & ECONOMICS */}
          {activeTab === 'HARVEST' && (
            <form onSubmit={handleSaveHarvest} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Harvest Date</label>
                  <input
                    type="date"
                    value={harvestDate}
                    onChange={(e) => setHarvestDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Harvested Area (Acres)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={harvestArea}
                    onChange={(e) => setHarvestArea(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Total Yield (kg)</label>
                  <input
                    type="number"
                    value={totalYieldKg}
                    onChange={(e) => setTotalYieldKg(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Marketable Yield (kg)</label>
                  <input
                    type="number"
                    value={marketableYieldKg}
                    onChange={(e) => setMarketableYieldKg(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Cultivation Cost (₹)</label>
                  <input
                    type="number"
                    value={inputCostInr}
                    onChange={(e) => setInputCostInr(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Selling Price per kg (₹)</label>
                  <input
                    type="number"
                    value={marketPricePerKg}
                    onChange={(e) => setMarketPricePerKg(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  />
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-emerald-700 font-medium">Yield Normalized / Acre</p>
                  <p className="text-lg font-bold text-emerald-900">
                    {harvestArea > 0 ? (totalYieldKg / harvestArea).toFixed(0) : 0} kg/ac
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-medium">Cost per kg</p>
                  <p className="text-lg font-bold text-emerald-900">
                    ₹{totalYieldKg > 0 ? (inputCostInr / totalYieldKg).toFixed(1) : 0} /kg
                  </p>
                </div>
                <div>
                  <p className="text-xs text-emerald-700 font-medium">Estimated Net Return</p>
                  <p className="text-lg font-bold text-emerald-900">
                    ₹{(marketableYieldKg * marketPricePerKg - inputCostInr).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
                >
                  Save Harvest & Recalculate
                </button>
                {statusMessage && <span className="text-xs font-bold text-emerald-700">{statusMessage}</span>}
              </div>
            </form>
          )}

          {/* TAB 3: FARMER FEEDBACK SURVEY */}
          {activeTab === 'SURVEY' && (
            <form onSubmit={handleSaveSurvey} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Overall Satisfaction (1-5)</label>
                  <select
                    value={surveySatisfaction}
                    onChange={(e) => setSurveySatisfaction(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  >
                    <option value="5">5 - Highly Satisfied</option>
                    <option value="4">4 - Satisfied</option>
                    <option value="3">3 - Neutral</option>
                    <option value="2">2 - Dissatisfied</option>
                    <option value="1">1 - Highly Dissatisfied</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Perceived Yield vs Conventional</label>
                  <select
                    value={perceivedYield}
                    onChange={(e) => setPerceivedYield(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  >
                    <option value="MUCH_HIGHER">Much Higher Yield</option>
                    <option value="HIGHER">Moderately Higher Yield</option>
                    <option value="SAME">About the Same</option>
                    <option value="LOWER">Lower Yield</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Ease of Management (1-5)</label>
                  <select
                    value={easeOfMgmt}
                    onChange={(e) => setEaseOfMgmt(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  >
                    <option value="5">5 - Very Easy / Low Maintenance</option>
                    <option value="4">4 - Manageable</option>
                    <option value="3">3 - Standard Effort</option>
                    <option value="2">2 - High Effort</option>
                    <option value="1">1 - Difficult</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Willingness to Pay (₹ per Seedling)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={wtpInr}
                    onChange={(e) => setWtpInr(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-600 mb-1">Would repurchase next season?</label>
                  <select
                    value={repurchaseIntent ? 'true' : 'false'}
                    onChange={(e) => setRepurchaseIntent(e.target.value === 'true')}
                    className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                  >
                    <option value="true">Yes — Intends to repurchase</option>
                    <option value="false">No — Would not repurchase</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 mb-1">Qualitative Field Feedback & Comments</label>
                <textarea
                  rows={3}
                  value={farmerNotes}
                  onChange={(e) => setFarmerNotes(e.target.value)}
                  placeholder="e.g. Farmer noted much stronger tiller density and complete absence of soft rot symptoms."
                  className="w-full border border-slate-300 rounded-lg p-2 bg-white text-sm"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-lg text-sm transition-colors"
                >
                  Submit Farmer Survey
                </button>
                {statusMessage && <span className="text-xs font-bold text-emerald-700">{statusMessage}</span>}
              </div>
            </form>
          )}

          {/* TAB 4: AI TRIAL ANALYST */}
          {activeTab === 'AI_ANALYST' && (
            <div className="space-y-4">
              <div className="h-96 overflow-y-auto border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-4">
                {chatMessages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                        msg.role === 'user'
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5 opacity-70">
                        {msg.role === 'user' ? 'You' : 'AI Trial Analyst'}
                      </p>
                      <div
                        className={`prose prose-sm max-w-none ${
                          msg.role === 'user' ? 'text-white prose-invert' : 'text-slate-800'
                        }`}
                      >
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask any follow-up, compare specific farms, or request economic hypotheses..."
                  className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  disabled={isStreaming}
                />
                <button
                  type="submit"
                  disabled={isStreaming || !userInput.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {isStreaming ? 'Streaming...' : 'Send'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Farmers Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-lg font-semibold text-slate-800">Pilot Farmers Directory ({farmers.length})</h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-medium">
              Live Hassan Pilot Data
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-100/75 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">Code</th>
                  <th className="px-6 py-3">Farmer Name</th>
                  <th className="px-6 py-3">Village</th>
                  <th className="px-6 py-3">Field Area</th>
                  <th className="px-6 py-3">Soil Type</th>
                  <th className="px-6 py-3">Irrigation</th>
                  <th className="px-6 py-3">Variety</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {farmers.map((farmer) => (
                  <tr key={farmer.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-emerald-700">{farmer.farmer_code}</td>
                    <td className="px-6 py-4 font-medium text-slate-900">{farmer.farmer_name}</td>
                    <td className="px-6 py-4">{farmer.village}</td>
                    <td className="px-6 py-4">{farmer.field_size_acres} ac</td>
                    <td className="px-6 py-4">{farmer.soil_type || '—'}</td>
                    <td className="px-6 py-4">{farmer.irrigation_type || '—'}</td>
                    <td className="px-6 py-4 italic">{farmer.variety}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dedicated Collapsible Section: Submitted Farmer Feedback Surveys */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setIsSurveysOpen(!isSurveysOpen)}
            className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100/80 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">
                Farmer Adoption & Survey Feedbacks ({surveysList.length})
              </h2>
              <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-medium">
                {isSurveysOpen ? 'Click to collapse' : 'Click to expand'}
              </span>
            </div>
            <span className="text-slate-500 font-bold text-sm">
              {isSurveysOpen ? '▲' : '▼'}
            </span>
          </button>

          {isSurveysOpen && (
            <div className="p-6 border-t border-slate-200 space-y-4">
              {surveysList.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No survey responses submitted yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-700">
                    <thead className="bg-slate-100 text-xs uppercase font-semibold text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Farmer</th>
                        <th className="px-4 py-3">Satisfaction</th>
                        <th className="px-4 py-3">Perceived Yield</th>
                        <th className="px-4 py-3">Ease of Mgmt</th>
                        <th className="px-4 py-3">WTP (₹/seedling)</th>
                        <th className="px-4 py-3">Repurchase?</th>
                        <th className="px-4 py-3">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {surveysList.map((s) => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {s.farmers?.farmer_code ? `${s.farmers.farmer_code} (${s.farmers.farmer_name})` : 'Farmer'}
                          </td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                              ★ {s.overall_satisfaction}/5
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded font-medium">
                              {s.perceived_yield_comparison.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3">{s.ease_of_management}/5</td>
                          <td className="px-4 py-3 font-semibold text-emerald-700">₹{s.willingness_to_pay_inr}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded font-bold ${
                                s.repurchase_intent ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {s.repurchase_intent ? 'Yes' : 'No'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 max-w-xs italic">
                            {s.qualitative_feedback || 'No comments'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onSuccess={() => showStatus('Logged in as Field Officer')}
        />
      </div>
    </main>
  );
}