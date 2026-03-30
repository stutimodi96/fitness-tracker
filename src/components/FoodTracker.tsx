import React, { useState, useRef, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion, onSnapshot } from 'firebase/firestore';
import { format, startOfDay } from 'date-fns';
import { analyzeFood } from '../services/gemini';
import { Camera, Send, Utensils, Loader2, CheckCircle2, X, Trash2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface FoodTrackerProps {
  user: User;
  profile: any;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function FoodTracker({ user, profile, selectedDate, onDateChange }: FoodTrackerProps) {
  const [input, setInput] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [selectedDateLog, setSelectedDateLog] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const logId = `${user.uid}_${selectedDate}`;
    const unsub = onSnapshot(doc(db, 'daily_logs', logId), (docSnap) => {
      if (docSnap.exists()) {
        setSelectedDateLog(docSnap.data());
      } else {
        setSelectedDateLog(null);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `daily_logs/${logId}`));
    return () => unsub();
  }, [user.uid, selectedDate]);

  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    onDateChange(format(d, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    onDateChange(format(d, 'yyyy-MM-dd'));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLog = async () => {
    if (!input && !image) return;
    setAnalyzing(true);
    try {
      let analysis;
      if (image) {
        const base64Data = image.split(',')[1];
        analysis = await analyzeFood({ data: base64Data, mimeType: 'image/jpeg' });
      } else {
        analysis = await analyzeFood(input);
      }

      const logId = `${user.uid}_${selectedDate}`;
      const logRef = doc(db, 'daily_logs', logId);
      const logSnap = await getDoc(logRef);

      const foodEntry = {
        description: analysis.description,
        calories: analysis.calories,
        timestamp: new Date().toISOString()
      };

      if (logSnap.exists()) {
        await updateDoc(logRef, {
          caloriesIn: increment(analysis.calories),
          foodLogs: arrayUnion(foodEntry)
        });
      } else {
        await setDoc(logRef, {
          uid: user.uid,
          date: selectedDate,
          weight: profile.weight,
          caloriesIn: analysis.calories,
          caloriesOut: 0,
          foodLogs: [foodEntry]
        });
      }

      setInput('');
      setImage(null);
      // Success message is handled by local state or just omitted if not needed
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'daily_logs');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteFood = async (index: number) => {
    if (!selectedDateLog) return;
    const foodToRemove = selectedDateLog.foodLogs[index];
    const newFoodLogs = selectedDateLog.foodLogs.filter((_: any, i: number) => i !== index);
    
    try {
      const logId = `${user.uid}_${selectedDate}`;
      await updateDoc(doc(db, 'daily_logs', logId), {
        foodLogs: newFoodLogs,
        caloriesIn: increment(-foodToRemove.calories)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'daily_logs');
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="text-center space-y-3 md:space-y-4">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-[#5A5A40]/10 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
          <Utensils className="w-6 h-6 md:w-8 md:h-8 text-[#5A5A40]" />
        </div>
        <h1 className="text-2xl md:text-3xl font-light px-4">What's on your plate?</h1>
        
        <div className="flex items-center justify-center gap-2 md:gap-4 bg-white/50 backdrop-blur-sm p-1.5 md:p-2 rounded-xl md:rounded-2xl border border-[#E5E5E0] w-fit mx-auto">
          <button onClick={handlePrevDay} className="p-1.5 md:p-2 hover:bg-white rounded-lg md:rounded-xl transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#5A5A40]" />
          </button>
          <div className="flex items-center gap-1 md:gap-2 px-2 md:px-4">
            <CalendarIcon className="w-3.5 h-3.5 text-[#5A5A40]" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="bg-transparent border-none outline-none text-xs md:text-sm font-medium text-[#5A5A40] w-28 md:w-auto"
            />
          </div>
          <button onClick={handleNextDay} className="p-1.5 md:p-2 hover:bg-white rounded-lg md:rounded-xl transition-colors">
            <ChevronRight className="w-4 h-4 text-[#5A5A40]" />
          </button>
        </div>
      </header>

      <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-sm border border-[#E5E5E0] space-y-4 md:space-y-6">
        {image ? (
          <div className="relative rounded-2xl md:rounded-3xl overflow-hidden aspect-video bg-gray-100 border-2 border-dashed border-gray-200">
            <img src={image} alt="Food" className="w-full h-full object-cover" />
            <button 
              onClick={() => setImage(null)}
              className="absolute top-2 right-2 md:top-4 md:right-4 p-1.5 md:p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        ) : (
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g., Two scrambled eggs with a slice of whole wheat toast..."
            className="w-full h-32 md:h-40 p-4 md:p-6 rounded-2xl md:rounded-3xl bg-[#F5F5F0] border-none focus:ring-2 focus:ring-[#5A5A40]/20 outline-none resize-none text-base md:text-lg font-light placeholder:text-gray-300"
          />
        )}

        <div className="flex flex-col sm:flex-row gap-3 md:gap-4">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-3 md:py-4 px-4 md:px-6 rounded-xl md:rounded-2xl border-2 border-gray-100 flex items-center justify-center gap-2 md:gap-3 text-gray-500 hover:border-[#5A5A40] hover:text-[#5A5A40] transition-all"
          >
            <Camera className="w-4 h-4 md:w-5 md:h-5" />
            <span className="font-semibold uppercase tracking-widest text-[10px] md:text-xs">Take Photo</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
          />
          
          <button
            onClick={handleLog}
            disabled={analyzing || (!input && !image)}
            className="flex-[2] bg-[#5A5A40] text-white py-3 md:py-4 px-4 md:px-6 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 hover:bg-[#4A4A30] transition-all shadow-md disabled:opacity-50"
          >
            {analyzing ? (
              <>
                <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
                <span className="font-semibold uppercase tracking-widest text-[10px] md:text-xs">Analyzing...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4 md:w-5 md:h-5" />
                <span className="font-semibold uppercase tracking-widest text-[10px] md:text-xs">Log Meal</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Today's Food List */}
      {selectedDateLog?.foodLogs?.length > 0 && (
        <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-8 shadow-sm border border-[#E5E5E0] space-y-4 md:space-y-6">
          <h3 className="text-lg md:text-xl font-light flex items-center gap-2">
            <Utensils className="w-5 h-5 text-[#5A5A40]" /> {selectedDate === format(new Date(), 'yyyy-MM-dd') ? "Today's Log" : `Log for ${format(new Date(selectedDate), 'MMM d')}`}
          </h3>
          <div className="space-y-3 md:space-y-4">
            {selectedDateLog.foodLogs.map((food: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-[#F5F5F0] rounded-xl md:rounded-2xl group">
                <div className="flex-1">
                  <p className="font-medium text-xs md:text-sm">{food.description}</p>
                  <p className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-widest">{format(new Date(food.timestamp), 'h:mm a')}</p>
                </div>
                <div className="flex items-center gap-2 md:gap-4">
                  <span className="font-light text-xs md:text-base text-[#5A5A40]">{food.calories} kcal</span>
                  <button 
                    onClick={() => handleDeleteFood(idx)}
                    className="p-1.5 md:p-2 text-gray-300 hover:text-red-500 transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-[#5A5A40]/5 rounded-[24px] md:rounded-[32px] p-6 md:p-8 border border-[#5A5A40]/10">
        <h4 className="text-[10px] md:text-xs font-bold text-[#5A5A40] uppercase tracking-widest mb-2 md:mb-4">Pro Tip</h4>
        <p className="text-xs md:text-sm text-[#5A5A40]/80 italic leading-relaxed">
          "Try to be as specific as possible with portions. Instead of 'chicken', say 'one grilled chicken breast (approx 150g)'. This helps our AI give you a more accurate calorie estimate."
        </p>
      </div>
    </div>
  );
}
