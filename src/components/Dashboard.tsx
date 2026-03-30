import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, collection, query, where, orderBy, limit, setDoc, updateDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { Activity, Utensils, Weight, TrendingUp, Flame, ChevronRight, Plus, Calendar as CalendarIcon, ChevronLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

interface DashboardProps {
  user: User;
  profile: any;
  onNavigate: (tab: 'dashboard' | 'food' | 'workout' | 'progress' | 'profile') => void;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function Dashboard({ user, profile, onNavigate, selectedDate, onDateChange }: DashboardProps) {
  const [dateLog, setDateLog] = useState<any>(null);
  const [dateWorkouts, setDateWorkouts] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [newWeight, setNewWeight] = useState('');
  const [isLoggingWeight, setIsLoggingWeight] = useState(false);

  useEffect(() => {
    const logId = `${user.uid}_${selectedDate}`;
    const unsubDateLog = onSnapshot(doc(db, 'daily_logs', logId), (docSnap) => {
      if (docSnap.exists()) {
        setDateLog(docSnap.data());
      } else {
        setDateLog({ caloriesIn: 0, caloriesOut: 0, weight: profile.weight, foodLogs: [] });
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, `daily_logs/${logId}`));

    const qWorkouts = query(
      collection(db, 'workouts'),
      where('uid', '==', user.uid),
      where('date', '==', selectedDate)
    );
    const unsubWorkouts = onSnapshot(qWorkouts, (snap) => {
      setDateWorkouts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'workouts'));

    const q = query(
      collection(db, 'daily_logs'),
      where('uid', '==', user.uid),
      orderBy('date', 'desc'),
      limit(7)
    );
    const unsubRecent = onSnapshot(q, (snap) => {
      const logs = snap.docs.map(d => d.data()).reverse();
      setRecentLogs(logs);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'daily_logs'));

    return () => {
      unsubDateLog();
      unsubWorkouts();
      unsubRecent();
    };
  }, [user.uid, selectedDate, profile.weight]);

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

  const handleWeightLog = async () => {
    if (!newWeight) return;
    setIsLoggingWeight(true);
    try {
      const logId = `${user.uid}_${selectedDate}`;
      const logRef = doc(db, 'daily_logs', logId);
      const weightNum = parseFloat(newWeight);
      
      await setDoc(logRef, {
        uid: user.uid,
        date: selectedDate,
        weight: weightNum,
        caloriesIn: dateLog?.caloriesIn || 0,
        caloriesOut: dateLog?.caloriesOut || 0,
        foodLogs: dateLog?.foodLogs || []
      }, { merge: true });

      setNewWeight('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'daily_logs');
    } finally {
      setIsLoggingWeight(false);
    }
  };

  const calIn = dateLog?.caloriesIn || 0;
  const calOut = dateLog?.caloriesOut || 0;
  const calGoal = profile?.dailyCalorieGoal || 1500;
  const netCals = calIn - calOut;
  const progress = calGoal > 0 ? Math.min((calIn / calGoal) * 100, 100) : 0;

  const pieData = [
    { name: 'Consumed', value: calIn || 0, color: '#5A5A40' },
    { name: 'Remaining', value: Math.max(calGoal - calIn, 0) || 0, color: '#E5E5E0' }
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-light text-[#1A1A1A]">Hello, {profile.name.split(' ')[0]}</h1>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-2 bg-white/50 backdrop-blur-sm p-1 rounded-xl border border-[#E5E5E0]">
              <button onClick={handlePrevDay} className="p-1.5 hover:bg-white rounded-lg transition-colors">
                <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 text-[#5A5A40]" />
              </button>
              <div className="flex items-center gap-1 md:gap-2 px-1 md:px-2">
                <CalendarIcon className="w-3 h-3 md:w-3.5 md:h-3.5 text-[#5A5A40]" />
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  className="bg-transparent border-none outline-none text-[10px] md:text-xs font-bold text-[#5A5A40] uppercase tracking-tighter md:tracking-widest max-w-[80px] md:max-w-none"
                />
              </div>
              <button onClick={handleNextDay} className="p-1.5 hover:bg-white rounded-lg transition-colors">
                <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-[#5A5A40]" />
              </button>
            </div>
            <p className="text-[#5A5A40] italic text-xs md:text-sm">
              {selectedDate === format(new Date(), 'yyyy-MM-dd') ? "Today" : format(new Date(selectedDate), 'MMM d')}
            </p>
          </div>
        </div>
        <div className="text-left md:text-right w-full md:w-auto">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1 md:text-right">Weight on this day</span>
          <div className="flex items-center gap-2 md:justify-end">
            <input 
              type="number" 
              value={newWeight}
              onChange={(e) => setNewWeight(e.target.value)}
              placeholder={dateLog?.weight || profile.weight}
              className="w-14 md:w-16 bg-transparent border-b border-gray-200 md:text-right focus:border-[#5A5A40] outline-none text-xl md:text-2xl font-light"
            />
            <span className="text-xs md:text-sm text-gray-400">kg</span>
            {newWeight && (
              <button 
                onClick={handleWeightLog}
                disabled={isLoggingWeight}
                className="p-1 bg-[#5A5A40] text-white rounded-full hover:bg-[#4A4A30] transition-colors"
              >
                <Plus className="w-3 h-3 md:w-4 md:h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Calorie Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 bg-white rounded-[32px] md:rounded-[40px] p-5 md:p-10 shadow-sm border border-[#E5E5E0] flex flex-col md:flex-row items-center gap-6 md:gap-12">
          <div className="relative w-36 h-36 md:w-48 md:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl md:text-3xl font-light">{calIn}</span>
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold">kcal in</span>
            </div>
          </div>
          
          <div className="flex-1 space-y-4 md:space-y-6 w-full">
            <div className="flex justify-between items-end">
              <div>
                <h3 className="text-base md:text-xl font-light">Daily Goal</h3>
                <p className="text-[10px] md:text-xs text-gray-400 italic">{calGoal} kcal target</p>
              </div>
              <div className="text-right">
                <span className={`text-lg md:text-2xl font-light ${calIn > calGoal ? 'text-red-500' : 'text-[#5A5A40]'}`}>
                  {calGoal - calIn > 0 ? `${calGoal - calIn} left` : `${calIn - calGoal} over`}
                </span>
              </div>
            </div>
            <div className="h-1.5 md:h-3 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-1000 ${calIn > calGoal ? 'bg-red-400' : 'bg-[#5A5A40]'}`} 
                style={{ width: `${progress}%` }} 
              />
            </div>
            <div className="grid grid-cols-2 gap-2 md:gap-4 pt-1 md:pt-4">
              <div className="bg-[#F5F5F0] p-3 md:p-4 rounded-xl md:rounded-3xl">
                <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold block mb-0.5 md:mb-1">Burned</span>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <Flame className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
                  <span className="text-base md:text-xl font-light">{calOut} kcal</span>
                </div>
              </div>
              <div className="bg-[#F5F5F0] p-3 md:p-4 rounded-xl md:rounded-3xl">
                <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold block mb-0.5 md:mb-1">Net</span>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-[#5A5A40]" />
                  <span className="text-base md:text-xl font-light">{netCals} kcal</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#5A5A40] rounded-[32px] md:rounded-[40px] p-6 md:p-10 text-white shadow-lg flex flex-col justify-between relative overflow-hidden min-h-[160px] md:min-h-0">
          <div className="relative z-10">
            <h3 className="text-lg md:text-2xl font-light mb-0.5 md:mb-2">Weight Progress</h3>
            <p className="text-white/60 text-[10px] md:text-sm italic">Target: {profile.targetWeight} kg</p>
          </div>
          <div className="relative z-10 mt-4 md:mt-8">
            <div className="text-3xl md:text-5xl font-light mb-0.5 md:mb-2">
              {Math.abs((dateLog?.weight || profile.weight) - profile.targetWeight).toFixed(1)}
              <span className="text-sm md:text-xl ml-1.5 md:ml-2 opacity-60">kg to go</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-white/80 text-[10px] md:text-sm">
              <TrendingUp className="w-3 h-3 md:w-4 md:h-4" />
              <span>Keep it up!</span>
            </div>
          </div>
          <Activity className="absolute -bottom-6 -right-6 w-32 h-32 md:w-48 md:h-48 text-white/5 rotate-12" />
        </div>
      </div>

      {/* Weekly Activity */}
      <div className="bg-white rounded-[32px] md:rounded-[40px] p-5 md:p-10 shadow-sm border border-[#E5E5E0]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6 md:mb-10">
          <h3 className="text-lg md:text-2xl font-light">Weekly Calories</h3>
          <div className="flex gap-3">
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-[#5A5A40]" />
              <span className="text-[8px] md:text-[10px] text-gray-400 uppercase tracking-widest font-bold">In</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <div className="w-2 h-2 md:w-3 md:h-3 rounded-full bg-orange-200" />
              <span className="text-[8px] md:text-[10px] text-gray-400 uppercase tracking-widest font-bold">Out</span>
            </div>
          </div>
        </div>
        <div className="h-40 md:h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={recentLogs}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis 
                dataKey="date" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 9, fill: '#999' }}
                tickFormatter={(str) => format(new Date(str), 'EEE')}
              />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#999' }} />
              <Tooltip 
                cursor={{ fill: '#F5F5F0' }}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '10px' }}
              />
              <Bar dataKey="caloriesIn" fill="#5A5A40" radius={[2, 2, 0, 0]} barSize={8} />
              <Bar dataKey="caloriesOut" fill="#FED7AA" radius={[2, 2, 0, 0]} barSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        <div className="bg-white rounded-[32px] md:rounded-[40px] p-5 md:p-10 shadow-sm border border-[#E5E5E0]">
          <div className="flex justify-between items-center mb-5 md:mb-8">
            <h3 className="text-base md:text-2xl font-light flex items-center gap-2">
              <Utensils className="w-4 h-4 md:w-6 md:h-6 text-[#5A5A40]" /> {selectedDate === format(new Date(), 'yyyy-MM-dd') ? "Today's Food" : `Food on ${format(new Date(selectedDate), 'MMM d')}`}
            </h3>
            <button 
              onClick={() => onNavigate('food')}
              className="text-[9px] md:text-[10px] font-bold text-[#5A5A40] uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
            >
              Log <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
          <div className="space-y-2 md:space-y-4">
            {dateLog?.foodLogs?.length > 0 ? (
              dateLog.foodLogs.map((food: any, idx: number) => (
                <div key={idx} className="flex justify-between items-center p-3 md:p-4 bg-[#F5F5F0] rounded-xl md:rounded-2xl">
                  <div>
                    <p className="font-medium text-[11px] md:text-sm">{food.description}</p>
                    <p className="text-[8px] md:text-[10px] text-gray-400 uppercase tracking-widest">{format(new Date(food.timestamp), 'h:mm a')}</p>
                  </div>
                  <span className="font-light text-[11px] md:text-base text-[#5A5A40]">{food.calories} kcal</span>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 italic py-4 md:py-8 text-[11px] md:text-sm">No food logged.</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-[32px] md:rounded-[40px] p-5 md:p-10 shadow-sm border border-[#E5E5E0]">
          <div className="flex justify-between items-center mb-5 md:mb-8">
            <h3 className="text-base md:text-2xl font-light flex items-center gap-2">
              <Activity className="w-4 h-4 md:w-6 md:h-6 text-[#5A5A40]" /> {selectedDate === format(new Date(), 'yyyy-MM-dd') ? "Today's Workouts" : `Workouts on ${format(new Date(selectedDate), 'MMM d')}`}
            </h3>
            <button 
              onClick={() => onNavigate('workout')}
              className="text-[9px] md:text-[10px] font-bold text-[#5A5A40] uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all"
            >
              Log <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>
          <div className="space-y-2 md:space-y-4">
            {dateWorkouts.length > 0 ? (
              dateWorkouts.map((workout: any) => (
                <div key={workout.id} className="flex justify-between items-center p-3 md:p-4 bg-[#F5F5F0] rounded-xl md:rounded-2xl">
                  <div>
                    <p className="font-medium text-[11px] md:text-sm capitalize">{workout.type} Session</p>
                    <p className="text-[8px] md:text-[10px] text-gray-400 uppercase tracking-widest">{workout.duration} mins</p>
                  </div>
                  <span className="font-light text-[11px] md:text-base text-orange-500">-{workout.caloriesBurned} kcal</span>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 italic py-4 md:py-8 text-[11px] md:text-sm">No workouts logged.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
