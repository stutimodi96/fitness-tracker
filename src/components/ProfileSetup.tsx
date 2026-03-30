import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { User as UserIcon, Ruler, Weight, Target, Calendar, ChevronRight, Utensils } from 'lucide-react';

interface ProfileSetupProps {
  user: User;
  initialData?: any;
  onComplete: () => void;
}

export function ProfileSetup({ user, initialData, onComplete }: ProfileSetupProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    gender: initialData?.gender || 'male',
    height: initialData?.height || 175,
    weight: initialData?.weight || 75,
    targetWeight: initialData?.targetWeight || 70,
    birthDate: initialData?.birthDate || '1995-01-01',
    dailyCalorieGoal: initialData?.dailyCalorieGoal || 1500
  });

  // Sync formData with initialData when it changes (e.g. after first fetch)
  React.useEffect(() => {
    if (initialData) {
      setFormData({
        gender: initialData.gender || 'male',
        height: initialData.height || 175,
        weight: initialData.weight || 75,
        targetWeight: initialData.targetWeight || 70,
        birthDate: initialData.birthDate || '1995-01-01',
        dailyCalorieGoal: initialData.dailyCalorieGoal || 1500
      });
    }
  }, [initialData]);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'profiles', user.uid), {
        ...formData,
        uid: user.uid,
        name: user.displayName || 'User',
        updatedAt: new Date().toISOString()
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onComplete();
      }, 1500);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `profiles/${user.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl md:text-3xl font-light text-[#1A1A1A]">Tell us about yourself</h2>
            <div className="grid grid-cols-3 gap-2 md:gap-4">
              {['male', 'female', 'other'].map((g) => (
                <button
                  key={g}
                  onClick={() => setFormData({ ...formData, gender: g })}
                  className={`py-3 md:py-4 rounded-xl md:rounded-2xl border-2 transition-all capitalize text-sm md:text-base ${
                    formData.gender === g ? 'border-[#5A5A40] bg-[#5A5A40]/5 text-[#5A5A40]' : 'border-gray-100 text-gray-400'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
            <div className="space-y-3 md:space-y-4">
              <label className="flex items-center gap-2 text-[10px] md:text-sm font-semibold text-gray-400 uppercase tracking-widest">
                <Calendar className="w-3 h-3 md:w-4 md:h-4" /> Birth Date
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full p-3 md:p-4 rounded-xl md:rounded-2xl border-2 border-gray-100 focus:border-[#5A5A40] outline-none transition-all text-sm md:text-base"
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl md:text-3xl font-light text-[#1A1A1A]">Your measurements</h2>
            <div className="space-y-5 md:space-y-6">
              <div className="space-y-3 md:space-y-4">
                <label className="flex items-center justify-between text-[10px] md:text-sm font-semibold text-gray-400 uppercase tracking-widest">
                  <span className="flex items-center gap-2"><Ruler className="w-3 h-3 md:w-4 md:h-4" /> Height</span>
                  <span className="text-[#5A5A40] text-xs md:text-sm">{formData.height} cm</span>
                </label>
                <input
                  type="range"
                  min="100"
                  max="250"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) })}
                  className="w-full h-1.5 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
                />
              </div>
              <div className="space-y-3 md:space-y-4">
                <label className="flex items-center justify-between text-[10px] md:text-sm font-semibold text-gray-400 uppercase tracking-widest">
                  <span className="flex items-center gap-2"><Weight className="w-3 h-3 md:w-4 md:h-4" /> Current Weight</span>
                  <span className="text-[#5A5A40] text-xs md:text-sm">{formData.weight} kg</span>
                </label>
                <input
                  type="range"
                  min="30"
                  max="200"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                  className="w-full h-1.5 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-2xl md:text-3xl font-light text-[#1A1A1A]">Your goals</h2>
            <div className="space-y-5 md:space-y-6">
              <div className="space-y-3 md:space-y-4">
                <label className="flex items-center justify-between text-[10px] md:text-sm font-semibold text-gray-400 uppercase tracking-widest">
                  <span className="flex items-center gap-2"><Target className="w-3 h-3 md:w-4 md:h-4" /> Target Weight</span>
                  <span className="text-[#5A5A40] text-xs md:text-sm">{formData.targetWeight} kg</span>
                </label>
                <input
                  type="range"
                  min="30"
                  max="200"
                  step="0.1"
                  value={formData.targetWeight}
                  onChange={(e) => setFormData({ ...formData, targetWeight: parseFloat(e.target.value) })}
                  className="w-full h-1.5 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
                />
              </div>
              <div className="space-y-3 md:space-y-4">
                <label className="flex items-center justify-between text-[10px] md:text-sm font-semibold text-gray-400 uppercase tracking-widest">
                  <span className="flex items-center gap-2"><Utensils className="w-3 h-3 md:w-4 md:h-4" /> Daily Calorie Goal</span>
                  <span className="text-[#5A5A40] text-xs md:text-sm">{formData.dailyCalorieGoal} kcal</span>
                </label>
                <input
                  type="range"
                  min="1000"
                  max="4000"
                  step="50"
                  value={formData.dailyCalorieGoal}
                  onChange={(e) => setFormData({ ...formData, dailyCalorieGoal: parseInt(e.target.value) })}
                  className="w-full h-1.5 md:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#5A5A40]"
                />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4 md:py-12">
      <div className="bg-white rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-sm border border-[#E5E5E0] relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-1 bg-[#5A5A40] transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
        
        <div className="mb-8 md:mb-12 flex justify-between items-center">
          <span className="text-[10px] md:text-xs font-bold text-[#5A5A40] uppercase tracking-widest">Step {step} of 3</span>
          {step > 1 && (
            <button onClick={() => setStep(step - 1)} className="text-xs md:text-sm text-gray-400 hover:text-[#5A5A40]">Back</button>
          )}
        </div>

        {renderStep()}

        {showSuccess && (
          <div className="mt-4 p-3 md:p-4 bg-emerald-50 text-emerald-600 rounded-xl md:rounded-2xl text-center text-[10px] md:text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-300">
            Profile updated successfully!
          </div>
        )}

        <div className="mt-8 md:mt-12 flex gap-3 md:gap-4">
          {step < 3 ? (
            <>
              {initialData && (
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-white border-2 border-[#5A5A40] text-[#5A5A40] py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 hover:bg-[#5A5A40]/5 transition-all shadow-sm disabled:opacity-50 text-xs md:text-base font-medium"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              )}
              <button
                onClick={() => setStep(step + 1)}
                className="flex-[2] bg-[#5A5A40] text-white py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 hover:bg-[#4A4A30] transition-all shadow-md text-xs md:text-base font-medium"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-[#5A5A40] text-white py-3 md:py-4 rounded-xl md:rounded-2xl flex items-center justify-center gap-2 hover:bg-[#4A4A30] transition-all shadow-md disabled:opacity-50 text-xs md:text-base font-medium"
            >
              {saving ? 'Saving...' : initialData ? 'Update Profile' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
