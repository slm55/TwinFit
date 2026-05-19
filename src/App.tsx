import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Camera, 
  Shirt, 
  Sparkles, 
  ArrowRight, 
  Upload, 
  Trash2, 
  ChevronRight,
  Info,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { getOutfitSelection, generateVirtualTryOn, OutfitAdvice } from "./services/gemini";

type Step = "upload" | "processing" | "result";

export default function App() {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [wardrobe, setWardrobe] = useState<string[]>([]);
  const [eventContext, setEventContext] = useState("");
  const [step, setStep] = useState<Step>("upload");
  const [isProcessing, setIsProcessing] = useState(false);
  const [advice, setAdvice] = useState<OutfitAdvice | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const wardrobeInputRef = useRef<HTMLInputElement>(null);

  const handleBaseUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file instanceof File) {
      const reader = new FileReader();
      reader.onload = (ev) => setBaseImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleWardrobeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    files.forEach(file => {
      if (file instanceof File) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          setWardrobe(prev => [...prev, ev.target?.result as string].slice(0, 5));
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleProcess = async () => {
    if (!baseImage || wardrobe.length === 0 || !eventContext) return;
    
    setIsProcessing(true);
    setStep("processing");
    setError(null);
    
    try {
      const outfitAdvice = await getOutfitSelection(baseImage, wardrobe, eventContext);
      setAdvice(outfitAdvice);
      
      const tryOnImage = await generateVirtualTryOn(baseImage, wardrobe, outfitAdvice);
      setResultImage(tryOnImage);
      
      setStep("result");
    } catch (err: any) {
      console.error(err);
      if (err.message && (err.message.includes("403") || err.message.includes("PERMISSION_DENIED") || err.message.includes("Permission denied"))) {
        setError("API кілтінің рұқсаты жоқ (Image Generation). Тегін кілттер кейде сурет генерациялауды қолдамауы мүмкін.");
      } else if (err.message && (err.message.includes("429") || err.message.includes("RESOURCE_EXHAUSTED"))) {
        setError("API квотасы таусылды. Біраз уақыттан кейін қайта көріңіз немесе басқа кілтті пайдаланыңыз.");
      } else {
        setError("Кешіріңіз, өңдеу кезінде қате кетті. Қайта көріңіз.");
      }
      setStep("upload");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2F2F2] selection:bg-black selection:text-white studio-grid text-[#1A1A1A]">
      {/* Header */}
      <header className="h-[60px] bg-white border-bottom border-[#E5E5E5] px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold tracking-tighter uppercase">TwinFit</div>
          <div className="h-4 w-px bg-gray-300"></div>
          <div className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Virtual Fashion Engine</div>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-xs font-semibold uppercase tracking-widest cursor-pointer hover:opacity-100 opacity-60">Көмек</span>
          <button className="bg-black text-white px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-transform">Профиль</button>
        </div>
      </header>

      <main className="p-5 max-w-[1400px] mx-auto min-h-[calc(100vh-120px)]">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <motion.div 
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-[240px_1fr_280px] gap-5 items-start"
            >
              {/* Left Sidebar: Base Photo */}
              <aside className="card-minimal p-4 flex flex-col gap-4">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Негізгі фото</div>
                <div className="relative aspect-[3/4] bg-[#EFEFEF] rounded-lg overflow-hidden group border border-[#F0F0F0]">
                  {baseImage ? (
                    <>
                      <img src={baseImage} alt="Base" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      <button 
                        onClick={() => setBaseImage(null)}
                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </>
                  ) : (
                    <label className="w-full h-full flex flex-col items-center justify-center p-4 text-center cursor-pointer">
                      <Camera className="mb-2 opacity-20" size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Жүктеу</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleBaseUpload} />
                    </label>
                  )}
                </div>
                
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2">Оқиға</div>
                <input 
                  type="text" 
                  placeholder="Мән-мәтінді енгізіңіз..."
                  className="w-full border-b border-gray-200 py-2 focus:outline-none focus:border-black transition-colors text-xs font-semibold"
                  value={eventContext}
                  onChange={(e) => setEventContext(e.target.value)}
                />
              </aside>

              {/* Main Content: Preview / Synthesis Area */}
              <section className="card-minimal overflow-hidden relative min-h-[600px] flex flex-col">
                <div className="flex-1 bg-[#E4E4E4] flex items-center justify-center relative p-8">
                  <div className="absolute top-6 left-6 flex items-center gap-3">
                    <span className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">AI ТАҢДАУ</span>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest opacity-60">Studio Mode</span>
                  </div>
                  
                  <div className="w-full max-w-[400px] aspect-[3/4] bg-white shadow-2xl flex flex-col items-center justify-center p-2 relative">
                    <div className="w-full h-full bg-[#FAFAFA] border border-[#F0F0F0] flex flex-col items-center justify-center relative">
                      {baseImage ? (
                        <img src={baseImage} alt="Base Preview" className="w-full h-full object-cover opacity-50 grayscale" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="text-center">
                          <Shirt className="mx-auto mb-3 opacity-10" size={48} />
                          <span className="text-[10px] text-gray-300 uppercase tracking-[0.2em] font-bold">Синтездеуді күтуде</span>
                        </div>
                      )}
                      {isProcessing && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center">
                          <Loader2 className="animate-spin text-black" size={32} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="h-12 bg-white flex items-center px-6 justify-between border-t border-[#E5E5E5]">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    Status: {isProcessing ? 'Processing' : 'Standby'}
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${baseImage ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Текстура</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${wardrobe.length > 0 ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                      <span className="text-[9px] font-bold uppercase tracking-widest opacity-60">Гардероб</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Right Sidebar: Wardrobe & Action */}
              <aside className="card-minimal p-4 flex flex-col h-full min-h-[600px]">
                <div className="flex justify-between items-center mb-4">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Гардероб</div>
                  <span className="text-[10px] font-black">{wardrobe.length}/5</span>
                </div>
                
                <div className="flex flex-col gap-2 overflow-y-auto mb-6 flex-1">
                  {wardrobe.map((img, idx) => (
                    <div key={idx} className="wardrobe-item-minimal border-black bg-white">
                      <img src={img} alt={`Item ${idx}`} className="w-10 h-10 rounded object-cover" />
                      <div className="text-[11px] font-bold uppercase tracking-tight truncate flex-1">Element_{idx + 1}</div>
                      <button onClick={() => setWardrobe(prev => prev.filter((_, i) => i !== idx))} className="ml-auto opacity-20 hover:opacity-100 transition-opacity">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {wardrobe.length < 5 && (
                    <div 
                      onClick={() => wardrobeInputRef.current?.click()}
                      className="wardrobe-item-minimal border-dashed border-gray-300"
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        <Upload size={14} className="opacity-40" />
                      </div>
                      <div className="text-[11px] font-bold uppercase tracking-widest text-gray-400">Қосу</div>
                    </div>
                  )}
                  <input type="file" ref={wardrobeInputRef} className="hidden" multiple accept="image/*" onChange={handleWardrobeUpload} />
                </div>

                <div className="pt-12 space-y-4">
                  <button 
                    disabled={!baseImage || wardrobe.length === 0 || !eventContext || isProcessing}
                    onClick={handleProcess}
                    className="w-full py-4 bg-black text-white rounded-xl font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-20"
                  >
                    ОБРАЗДЫ ҚҰРАСТЫРУ
                  </button>
                  {error && <p className="text-red-500 text-[10px] font-bold text-center mt-4 uppercase tracking-widest leading-relaxed">{error}</p>}
                </div>
              </aside>
            </motion.div>
          )}

          {step === "processing" && (
            <motion.div 
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-vh-[70vh] space-y-8 py-20"
            >
               <div className="w-20 h-20 border border-black/10 rounded-full flex items-center justify-center relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 border-t border-black rounded-full"
                  />
                  <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                    <Sparkles className="text-white" size={24} />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h2 className="text-xl font-black uppercase tracking-widest italic">SULUAI SYNTHESIZING...</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em]">Commercial High-Res Engine Rendering</p>
                </div>
            </motion.div>
          )}

          {step === "result" && advice && resultImage && (
            <motion.div 
              key="result"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid lg:grid-cols-[1fr_320px] gap-5 items-start"
            >
              {/* Left: Visualization */}
              <section className="card-minimal overflow-hidden relative min-h-[700px] flex flex-col">
                 <div className="flex-1 bg-[#E4E4E4] flex items-center justify-center relative p-8">
                    <div className="absolute top-6 left-6 flex items-center gap-3">
                      <span className="bg-black text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">RESULT</span>
                      <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">4K RENDER</span>
                    </div>
                    <div className="w-full max-w-[450px] aspect-[3/4] bg-white shadow-2xl p-2">
                      <img src={resultImage} alt="Result" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                 </div>
                 <div className="h-12 bg-white flex items-center px-6 justify-between border-t border-[#E5E5E5]">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-green-600">
                      AI Generation Successful
                    </div>
                    <div className="flex gap-4">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] opacity-40">Preserve: 100%</span>
                    </div>
                 </div>
              </section>

              {/* Right: Advice Details */}
              <aside className="card-minimal p-6 flex flex-col h-full min-h-[700px]">
                <div className="space-y-8 flex-1">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Оқиға контексі</div>
                    <div className="p-3 bg-black/5 rounded-lg border border-black/10 flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-tight">{eventContext}</span>
                      <CheckCircle2 size={14} className="text-black" />
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Стильдік сипаттама</div>
                    <p className="text-[13px] leading-relaxed text-gray-800 italic font-medium">
                      "{advice.description}"
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Негіздеме</div>
                    <p className="text-[11px] leading-relaxed text-gray-500">
                      {advice.justification}
                    </p>
                  </div>

                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Элементтер</div>
                    <div className="flex flex-wrap gap-1">
                      {advice.selectedItems.map((item, idx) => (
                        <span key={idx} className="bg-black text-white text-[9px] font-bold px-3 py-1.5 rounded-full uppercase tracking-widest">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <button 
                    onClick={() => {
                        setStep("upload");
                        setAdvice(null);
                        setResultImage(null);
                      }}
                      className="w-full py-4 border border-black rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black hover:text-white transition-all"
                  >
                    ЖАҢА ОБРАЗ
                  </button>
                  <button className="w-full py-4 bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg">
                    СУРЕТТІ ЖҮКТЕУ
                  </button>
                </div>
              </aside>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="h-[60px] bg-white border-t border-[#E5E5E5] flex items-center justify-center gap-12 px-8">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Mood:</span>
          <span className="text-[9px] font-black uppercase tracking-tight">Minimalist Studio</span>
        </div>
        <div className="w-px h-4 bg-gray-200"></div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Lighting:</span>
          <span className="text-[9px] font-black uppercase tracking-tight">Commercial Soft</span></div>
        <div className="w-px h-4 bg-gray-200"></div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Preservation:</span>
          <span className="text-[9px] font-black uppercase tracking-tight">Face & Body 100%</span>
        </div>
      </footer>
    </div>
  );
}

