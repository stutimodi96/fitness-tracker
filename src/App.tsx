/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { auth, signIn, logout, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { format } from 'date-fns';
import { LogIn, LogOut, Activity, Utensils, TrendingUp, User as UserIcon, PlusCircle } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { ProfileSetup } from './components/ProfileSetup';
import { FoodTracker } from './components/FoodTracker';
import { WorkoutLogger } from './components/WorkoutLogger';
import { ProgressCharts } from './components/ProgressCharts';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'food' | 'workout' | 'progress' | 'profile'>('dashboard');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) {
        // Fetch profile
        const profileRef = doc(db, 'profiles', u.uid);
        const unsubProfile = onSnapshot(profileRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          } else {
            setProfile(null);
            setActiveTab('profile');
          }
          setLoading(false);
        }, (err) => {
          handleFirestoreError(err, OperationType.GET, `profiles/${u.uid}`);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      await signIn();
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request') {
        console.log('Sign-in popup was closed or another request was pending.');
      } else {
        console.error('Sign-in error:', error);
      }
    } finally {
      setSigningIn(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center font-serif">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-pulse text-[#5A5A40] mx-auto mb-4" />
          <h1 className="text-2xl italic">FitTrack AI</h1>
          <p className="text-sm text-gray-500">Loading your fitness journey...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center font-serif p-6">
        <div className="max-w-md w-full bg-white rounded-[32px] p-12 shadow-sm text-center border border-[#E5E5E0]">
          <div className="w-20 h-20 bg-[#5A5A40] rounded-full flex items-center justify-center mx-auto mb-8">
            <Activity className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-light mb-4 text-[#1A1A1A]">FitTrack AI</h1>
          <p className="text-[#5A5A40] italic mb-12">Your intelligent companion for a healthier, stronger you.</p>
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            className="w-full bg-[#5A5A40] text-white py-4 px-8 rounded-full flex items-center justify-center gap-3 hover:bg-[#4A4A30] transition-all shadow-md active:scale-95 disabled:opacity-50"
          >
            <LogIn className="w-5 h-5" />
            <span>{signingIn ? 'Signing in...' : 'Begin Your Journey'}</span>
          </button>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (!profile && activeTab !== 'profile') {
      return <ProfileSetup user={user} initialData={profile} onComplete={() => setActiveTab('dashboard')} />;
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard user={user} profile={profile} onNavigate={setActiveTab} selectedDate={selectedDate} onDateChange={setSelectedDate} />;
      case 'food': return <FoodTracker user={user} profile={profile} selectedDate={selectedDate} onDateChange={setSelectedDate} />;
      case 'workout': return <WorkoutLogger user={user} profile={profile} selectedDate={selectedDate} onDateChange={setSelectedDate} />;
      case 'progress': return <ProgressCharts user={user} profile={profile} onNavigate={setActiveTab} onDateChange={setSelectedDate} />;
      case 'profile': return <ProfileSetup user={user} initialData={profile} onComplete={() => setActiveTab('dashboard')} />;
      default: return <Dashboard user={user} profile={profile} onNavigate={setActiveTab} selectedDate={selectedDate} onDateChange={setSelectedDate} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0] font-sans text-[#1A1A1A]">
      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-[#E5E5E0] px-6 py-4 z-50 md:top-0 md:bottom-auto md:border-t-0 md:border-b">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="hidden md:flex items-center gap-2 text-[#5A5A40]">
            <Activity className="w-6 h-6" />
            <span className="font-serif italic text-xl">FitTrack AI</span>
          </div>
          
          <div className="flex items-center justify-around w-full md:w-auto md:gap-8">
            <NavButton icon={<TrendingUp />} label="Stats" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <NavButton icon={<Utensils />} label="Food" active={activeTab === 'food'} onClick={() => setActiveTab('food')} />
            <NavButton icon={<PlusCircle />} label="Log" active={activeTab === 'workout'} onClick={() => setActiveTab('workout')} />
            <NavButton icon={<Activity />} label="Progress" active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} />
            <NavButton icon={<UserIcon />} label="Profile" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
          </div>

          <button onClick={logout} className="hidden md:flex items-center gap-2 text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pb-28 pt-4 md:pt-24 px-4 md:px-6 max-w-5xl mx-auto">
        {renderContent()}
      </main>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 transition-all active:scale-90 ${active ? 'text-[#5A5A40]' : 'text-gray-400 hover:text-gray-600'}`}
    >
      <div className={`p-2 rounded-xl transition-all ${active ? 'bg-[#5A5A40]/10 scale-110' : ''}`}>
        {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5 md:w-6 md:h-6' })}
      </div>
      <span className="text-[9px] uppercase tracking-tighter font-bold md:hidden">{label}</span>
    </button>
  );
}
