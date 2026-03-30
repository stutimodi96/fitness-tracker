import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc, updateDoc, increment, collection, addDoc, onSnapshot, query, where, deleteDoc } from 'firebase/firestore';
import { format } from 'date-fns';
import { predictWorkoutCalories } from '../services/gemini';
import { Activity, Dumbbell, Timer, Flame, Plus, Trash2, CheckCircle2, Loader2, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface WorkoutLoggerProps {
  user: User;
  profile: any;
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export function WorkoutLogger({ user, profile, selectedDate, onDateChange }: WorkoutLoggerProps) {
  const [type, setType] = useState<'strength' | 'cardio'>('strength');
  const [exercises, setExercises] = useState<any[]>([{ name: '', sets: 3, reps: 10, weight: 0, distance: 0 }]);
  const [duration, setDuration] = useState(60);
  const [logging, setLogging] = useState(false);
  const [selectedDateWorkouts, setSelectedDateWorkouts] = useState<any[]>([]);

  useEffect(() => {
    const q = query(
      collection(db, 'workouts'),
      where('uid', '==', user.uid),
      where('date', '==', selectedDate)
    );
    const unsub = onSnapshot(q, (snap) => {
      setSelectedDateWorkouts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'workouts'));
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

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: 3, reps: 10, weight: 0, distance: 0 }]);
  };

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const updateExercise = (index: number, field: string, value: any) => {
    const newExercises = [...exercises];
    newExercises[index][field] = value;
    setExercises(newExercises);
  };

  const handleLog = async () => {
    setLogging(true);
    try {
      const workoutDetails = exercises.map(e => 
        `${e.name}: ${type === 'strength' ? `${e.sets}x${e.reps} at ${e.weight}kg` : `${e.distance}km`}`
      ).join(', ') + ` for ${duration} minutes.`;

      const age = new Date().getFullYear() - new Date(profile.birthDate).getFullYear();
      const prediction = await predictWorkoutCalories(workoutDetails, {
        weight: profile.weight,
        height: profile.height,
        gender: profile.gender,
        age
      });

      // Save workout
      await addDoc(collection(db, 'workouts'), {
        uid: user.uid,
        date: selectedDate,
        type,
        duration,
        caloriesBurned: prediction.caloriesBurned,
        exercises,
        createdAt: new Date().toISOString()
      });

      // Update daily log
      const logId = `${user.uid}_${selectedDate}`;
      const logRef = doc(db, 'daily_logs', logId);
      const logSnap = await getDoc(logRef);

      if (logSnap.exists()) {
        await updateDoc(logRef, {
          caloriesOut: increment(prediction.caloriesBurned)
        });
      } else {
        await setDoc(logRef, {
          uid: user.uid,
          date: selectedDate,
          weight: profile.weight,
          caloriesIn: 0,
          caloriesOut: prediction.caloriesBurned,
          foodLogs: []
        });
      }

      setExercises([{ name: '', sets: 3, reps: 10, weight: 0, distance: 0 }]);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'workouts');
    } finally {
      setLogging(false);
    }
  };

  const handleDeleteWorkout = async (workout: any) => {
    try {
      await deleteDoc(doc(db, 'workouts', workout.id));
      
      const logId = `${user.uid}_${selectedDate}`;
      const logRef = doc(db, 'daily_logs', logId);
      await updateDoc(logRef, {
        caloriesOut: increment(-workout.caloriesBurned)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `workouts/${workout.id}`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="text-center space-y-3 md:space-y-4">
        <div className="w-12 h-12 md:w-16 md:h-16 bg-[#5A5A40]/10 rounded-full flex items-center justify-center mx-auto mb-2 md:mb-4">
          <Activity className="w-6 h-6 md:w-8 md:h-8 text-[#5A5A40]" />
        </div>
        <h1 className="text-2xl md:text-3xl font-light px-4">Log your workout</h1>
        
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

      <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-[#E5E5E0] space-y-6 md:space-y-10">
        <div className="flex p-1 bg-[#F5F5F0] rounded-xl md:rounded-2xl">
          <button
            onClick={() => setType('strength')}
            className={`flex-1 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all ${
              type === 'strength' ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-gray-400'
            }`}
          >
            <Dumbbell className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Strength</span>
          </button>
          <button
            onClick={() => setType('cardio')}
            className={`flex-1 py-2 md:py-3 rounded-lg md:rounded-xl flex items-center justify-center gap-2 transition-all ${
              type === 'cardio' ? 'bg-white shadow-sm text-[#5A5A40]' : 'text-gray-400'
            }`}
          >
            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Cardio</span>
          </button>
        </div>

        <div className="space-y-4 md:space-y-6">
          {exercises.map((ex, idx) => (
            <div key={idx} className="p-4 md:p-6 bg-[#F5F5F0] rounded-2xl md:rounded-3xl space-y-3 md:space-y-4 relative group">
              <div className="flex gap-2 md:gap-4">
                <input
                  placeholder="Exercise Name"
                  value={ex.name}
                  onChange={(e) => updateExercise(idx, 'name', e.target.value)}
                  className="flex-1 bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#5A5A40]/20 text-sm md:text-base"
                />
                <button 
                  onClick={() => removeExercise(idx)}
                  className="p-2 md:p-4 text-gray-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-3 gap-2 md:gap-4">
                {type === 'strength' ? (
                  <>
                    <div className="space-y-1 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1 md:ml-2">Sets</label>
                      <input
                        type="number"
                        value={ex.sets}
                        onChange={(e) => updateExercise(idx, 'sets', parseInt(e.target.value))}
                        className="w-full bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#5A5A40]/20 text-sm md:text-base"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1 md:ml-2">Reps</label>
                      <input
                        type="number"
                        value={ex.reps}
                        onChange={(e) => updateExercise(idx, 'reps', parseInt(e.target.value))}
                        className="w-full bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#5A5A40]/20 text-sm md:text-base"
                      />
                    </div>
                    <div className="space-y-1 md:space-y-2">
                      <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1 md:ml-2">Weight</label>
                      <input
                        type="number"
                        value={ex.weight}
                        onChange={(e) => updateExercise(idx, 'weight', parseFloat(e.target.value))}
                        className="w-full bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#5A5A40]/20 text-sm md:text-base"
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-3 space-y-1 md:space-y-2">
                    <label className="text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1 md:ml-2">Distance (km)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={ex.distance}
                      onChange={(e) => updateExercise(idx, 'distance', parseFloat(e.target.value))}
                      className="w-full bg-white p-3 md:p-4 rounded-xl md:rounded-2xl border-none outline-none focus:ring-2 focus:ring-[#5A5A40]/20 text-sm md:text-base"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}

          <button
            onClick={addExercise}
            className="w-full py-3 md:py-4 border-2 border-dashed border-gray-100 rounded-2xl md:rounded-3xl flex items-center justify-center gap-2 text-gray-400 hover:border-[#5A5A40] hover:text-[#5A5A40] transition-all"
          >
            <Plus className="w-4 h-4 md:w-5 md:h-5" />
            <span className="text-[10px] md:text-xs font-bold uppercase tracking-widest">Add Exercise</span>
          </button>
        </div>

        <div className="pt-4 md:pt-6 border-t border-gray-100 flex flex-col md:flex-row gap-4 md:gap-6 items-center">
          <div className="flex-1 w-full space-y-2">
            <label className="flex items-center justify-between text-[9px] md:text-[10px] uppercase tracking-widest text-gray-400 font-bold ml-1 md:ml-2">
              <span><Timer className="w-3 h-3 inline mr-1" /> Duration</span>
              <span className="text-[#5A5A40]">{duration} min</span>
            </label>
            <input
              type="range"
              min="5"
              max="180"
              step="5"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="w-full h-1.5 md:h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
            />
          </div>
          
          <button
            onClick={handleLog}
            disabled={logging || exercises.some(e => !e.name)}
            className="w-full md:w-auto px-8 md:px-12 bg-[#5A5A40] text-white py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 md:gap-3 hover:bg-[#4A4A30] transition-all shadow-md disabled:opacity-50"
          >
            {logging ? (
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5" />
            )}
            <span className="font-semibold uppercase tracking-widest text-[10px] md:text-xs">Finish Workout</span>
          </button>
        </div>
      </div>

      {/* Today's Workouts List */}
      {selectedDateWorkouts.length > 0 && (
        <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-[#E5E5E0] space-y-6 md:space-y-8">
          <h3 className="text-lg md:text-xl font-light flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#5A5A40]" /> {selectedDate === format(new Date(), 'yyyy-MM-dd') ? "Today's Sessions" : `Sessions for ${format(new Date(selectedDate), 'MMM d')}`}
          </h3>
          <div className="space-y-3 md:space-y-4">
            {selectedDateWorkouts.map((workout: any) => (
              <div key={workout.id} className="flex justify-between items-center p-4 md:p-6 bg-[#F5F5F0] rounded-2xl md:rounded-3xl group">
                <div className="flex-1">
                  <p className="font-medium text-xs md:text-sm capitalize">{workout.type} Workout</p>
                  <p className="text-[9px] md:text-[10px] text-gray-400 uppercase tracking-widest">
                    {workout.duration} mins • {workout.exercises.length} exercises
                  </p>
                </div>
                <div className="flex items-center gap-2 md:gap-6">
                  <span className="font-light text-xs md:text-base text-orange-500">-{workout.caloriesBurned} kcal</span>
                  <button 
                    onClick={() => handleDeleteWorkout(workout)}
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
    </div>
  );
}
