import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, limit } from 'firebase/firestore';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { TrendingDown, TrendingUp, Activity, Weight, Calendar, ChevronRight, BarChart2 } from 'lucide-react';

interface ProgressChartsProps {
  user: User;
  profile: any;
  onNavigate: (tab: 'dashboard' | 'food' | 'workout' | 'progress' | 'profile') => void;
  onDateChange: (date: string) => void;
}

export function ProgressCharts({ user, profile, onNavigate, onDateChange }: ProgressChartsProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [timeRange, setTimeRange] = useState<'daily' | 'weekly'>('daily');

  useEffect(() => {
    const qLogs = query(
      collection(db, 'daily_logs'),
      where('uid', '==', user.uid),
      orderBy('date', 'asc')
    );
    const unsubLogs = onSnapshot(qLogs, (snap) => {
      setLogs(snap.docs.map(d => d.data()));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'daily_logs'));

    const qWorkouts = query(
      collection(db, 'workouts'),
      where('uid', '==', user.uid),
      orderBy('date', 'asc')
    );
    const unsubWorkouts = onSnapshot(qWorkouts, (snap) => {
      const workoutData = snap.docs.map(d => d.data());
      setWorkouts(workoutData);
      
      // Set initial selected exercise if not set
      if (!selectedExercise) {
        const allExercises = workoutData.flatMap(w => w.exercises || []).map((e: any) => e.name).filter(Boolean);
        const uniqueExercises = Array.from(new Set(allExercises)) as string[];
        if (uniqueExercises.length > 0) {
          setSelectedExercise(uniqueExercises[0]);
        }
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'workouts'));

    return () => {
      unsubLogs();
      unsubWorkouts();
    };
  }, [user.uid]);

  const weightData = logs.filter(l => l.weight).map(l => ({
    date: l.date,
    weight: l.weight
  }));

  const strengthData = workouts
    .filter(w => w.type === 'strength')
    .map(w => {
      const weights = w.exercises.map((e: any) => e.weight || 0);
      const maxWeight = weights.length > 0 ? Math.max(...weights) : 0;
      return { date: w.date, maxWeight };
    });

  const cardioData = workouts
    .filter(w => w.type === 'cardio')
    .map(w => {
      const totalDist = w.exercises.reduce((acc: number, e: any) => acc + (e.distance || 0), 0);
      return { date: w.date, distance: totalDist || 0 };
    });

  const exerciseNames = Array.from(new Set(
    workouts.flatMap(w => w.exercises || []).map((e: any) => e.name).filter(Boolean)
  )) as string[];

  const getExerciseData = () => {
    const dailyData: any = {};
    
    workouts.forEach(w => {
      const exercise = w.exercises?.find((e: any) => e.name === selectedExercise);
      if (exercise) {
        const date = w.date;
        const weight = exercise.weight || 0;
        if (!dailyData[date] || weight > dailyData[date].weight) {
          dailyData[date] = {
            date,
            weight,
            volume: (exercise.weight || 0) * (exercise.sets || 0) * (exercise.reps || 0)
          };
        }
      }
    });

    const sortedDaily = Object.values(dailyData).sort((a: any, b: any) => a.date.localeCompare(b.date));

    if (timeRange === 'daily') return sortedDaily;

    // Weekly aggregation
    const weeklyData: any = {};
    sortedDaily.forEach((d: any) => {
      const weekStart = format(startOfWeek(new Date(d.date)), 'yyyy-MM-dd');
      if (!weeklyData[weekStart] || d.weight > weeklyData[weekStart].weight) {
        weeklyData[weekStart] = {
          date: weekStart,
          weight: d.weight,
          volume: d.volume
        };
      }
    });

    return Object.values(weeklyData).sort((a: any, b: any) => a.date.localeCompare(b.date));
  };

  const exerciseProgressData = getExerciseData();

  if (loading) return null;

  return (
    <div className="space-y-6 md:space-y-12 animate-in fade-in duration-700">
      <header className="px-4 md:px-0">
        <h1 className="text-3xl md:text-4xl font-light text-[#1A1A1A]">Your Progress</h1>
        <p className="text-[#5A5A40] text-sm md:text-base italic">Visualizing your journey to a better you.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {/* Weight Chart */}
        <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-[#E5E5E0] space-y-6 md:space-y-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-blue-50 rounded-xl md:rounded-2xl text-blue-500">
                <Weight className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="text-lg md:text-xl font-light">Weight Trend</h3>
            </div>
            <div className="text-right">
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Current</span>
              <span className="text-lg md:text-xl font-light">{weightData[weightData.length - 1]?.weight || profile.weight} kg</span>
            </div>
          </div>
          <div className="h-48 md:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weightData}>
                <defs>
                  <linearGradient id="colorWeight" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#999' }}
                  tickFormatter={(str) => format(new Date(str), 'MMM d')}
                />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#999' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="weight" stroke="#3B82F6" fillOpacity={1} fill="url(#colorWeight)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Strength Progress */}
        <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-[#E5E5E0] space-y-6 md:space-y-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-purple-50 rounded-xl md:rounded-2xl text-purple-500">
                <Activity className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="text-lg md:text-xl font-light">Max Lift</h3>
            </div>
            <div className="text-right">
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Peak</span>
              <span className="text-lg md:text-xl font-light">{Math.max(...strengthData.map(d => d.maxWeight), 0)} kg</span>
            </div>
          </div>
          <div className="h-48 md:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={strengthData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#999' }}
                  tickFormatter={(str) => format(new Date(str), 'MMM d')}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#999' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '10px' }}
                />
                <Line type="stepAfter" dataKey="maxWeight" stroke="#A855F7" strokeWidth={2} dot={{ r: 3, fill: '#A855F7' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cardio Progress */}
        <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-[#E5E5E0] space-y-6 md:space-y-8 md:col-span-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-orange-50 rounded-xl md:rounded-2xl text-orange-500">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <h3 className="text-lg md:text-xl font-light">Cardio Distance</h3>
            </div>
            <div className="text-right">
              <span className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold block">Total Distance</span>
              <span className="text-lg md:text-xl font-light">{cardioData.reduce((acc, d) => acc + d.distance, 0).toFixed(1)} km</span>
            </div>
          </div>
          <div className="h-48 md:h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cardioData}>
                <defs>
                  <linearGradient id="colorCardio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fill: '#999' }}
                  tickFormatter={(str) => format(new Date(str), 'MMM d')}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#999' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="distance" stroke="#F97316" fillOpacity={1} fill="url(#colorCardio)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Exercise Specific Progress */}
        <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-[#E5E5E0] space-y-6 md:space-y-8 md:col-span-2">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="p-2 md:p-3 bg-emerald-50 rounded-xl md:rounded-2xl text-emerald-500">
                <BarChart2 className="w-5 h-5 md:w-6 md:h-6" />
              </div>
              <div>
                <h3 className="text-lg md:text-xl font-light">Exercise Progress</h3>
                <p className="text-[10px] md:text-xs text-gray-400">Track performance over time</p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 md:gap-4 w-full lg:w-auto">
              <div className="flex p-1 bg-[#F5F5F0] rounded-lg md:rounded-xl">
                <button
                  onClick={() => setTimeRange('daily')}
                  className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold transition-all ${
                    timeRange === 'daily' ? 'bg-white text-[#5A5A40] shadow-sm' : 'text-gray-400'
                  }`}
                >
                  DAILY
                </button>
                <button
                  onClick={() => setTimeRange('weekly')}
                  className={`flex-1 sm:flex-none px-3 md:px-4 py-1.5 md:py-2 rounded-md md:rounded-lg text-[10px] md:text-xs font-bold transition-all ${
                    timeRange === 'weekly' ? 'bg-white text-[#5A5A40] shadow-sm' : 'text-gray-400'
                  }`}
                >
                  WEEKLY
                </button>
              </div>

              <select 
                value={selectedExercise}
                onChange={(e) => setSelectedExercise(e.target.value)}
                className="bg-[#F5F5F0] border-none outline-none p-2.5 md:p-3 rounded-xl md:rounded-2xl text-xs md:text-sm font-medium text-[#5A5A40] flex-1 lg:flex-none min-w-[160px] md:min-w-[200px]"
              >
                {exerciseNames.length === 0 && <option value="">No exercises logged</option>}
                {exerciseNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {selectedExercise && exerciseProgressData.length > 0 ? (
            <div className="h-64 md:h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={exerciseProgressData}>
                  <defs>
                    <linearGradient id="colorExWeight" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 9, fill: '#999' }}
                    tickFormatter={(str) => {
                      const date = new Date(str);
                      return timeRange === 'daily' ? format(date, 'MMM d') : `Week of ${format(date, 'MMM d')}`;
                    }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#999' }} label={{ value: 'Weight (kg)', angle: -90, position: 'insideLeft', style: { fontSize: 9, fill: '#999' } }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', fontSize: '10px' }}
                    labelFormatter={(label) => {
                      const date = new Date(label);
                      return timeRange === 'daily' ? format(date, 'EEEE, MMM d, yyyy') : `Week of ${format(date, 'MMM d, yyyy')}`;
                    }}
                    formatter={(value: any, name: string) => [
                      `${value} ${name === 'weight' ? 'kg' : ''}`,
                      name.charAt(0).toUpperCase() + name.slice(1)
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="weight" 
                    stroke="#10B981" 
                    strokeWidth={2} 
                    fillOpacity={1}
                    fill="url(#colorExWeight)"
                    dot={{ r: 3, fill: '#10B981', strokeWidth: 1.5, stroke: '#fff' }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 md:h-64 flex flex-col items-center justify-center text-gray-400 italic bg-[#F5F5F0]/30 rounded-[24px] md:rounded-[32px] p-4 text-center">
              <Activity className="w-10 h-10 md:w-12 md:h-12 mb-2 md:mb-4 opacity-20" />
              <p className="text-xs md:text-sm">Select an exercise to see your progress over time</p>
            </div>
          )}
        </div>
      </div>

      {/* Log History Table */}
      <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-[#E5E5E0]">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-2 md:p-3 bg-gray-50 rounded-xl md:rounded-2xl text-gray-500">
              <Calendar className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <h3 className="text-lg md:text-xl font-light">Log History</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
          <table className="w-full text-left min-w-[500px]">
            <thead>
              <tr className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100">
                <th className="pb-3 md:pb-4">Date</th>
                <th className="pb-3 md:pb-4">Weight</th>
                <th className="pb-3 md:pb-4">Cal In</th>
                <th className="pb-3 md:pb-4">Cal Out</th>
                <th className="pb-3 md:pb-4">Net</th>
                <th className="pb-3 md:pb-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[...logs].reverse().map((log) => (
                <tr key={log.date} className="group hover:bg-[#F5F5F0] transition-colors">
                  <td className="py-3 md:py-4 font-medium text-xs md:text-sm">{format(new Date(log.date), 'MMM d, yyyy')}</td>
                  <td className="py-3 md:py-4 text-xs md:text-sm text-gray-600">{log.weight || '-'} kg</td>
                  <td className="py-3 md:py-4 text-xs md:text-sm text-green-600">+{log.caloriesIn || 0}</td>
                  <td className="py-3 md:py-4 text-xs md:text-sm text-orange-600">-{log.caloriesOut || 0}</td>
                  <td className="py-3 md:py-4 text-xs md:text-sm font-semibold">
                    {(log.caloriesIn || 0) - (log.caloriesOut || 0)}
                  </td>
                  <td className="py-3 md:py-4 text-right">
                    <button 
                      onClick={() => {
                        onDateChange(log.date);
                        onNavigate('dashboard');
                      }}
                      className="p-1.5 md:p-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity text-[#5A5A40]"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <p className="text-center text-gray-400 italic py-8 md:py-12 text-xs md:text-sm">No history found yet. Start logging!</p>
          )}
        </div>
      </div>
    </div>
  );
}
