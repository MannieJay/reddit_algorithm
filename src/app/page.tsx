'use client';

import React, { useState } from 'react';
import InputForm from '@/components/InputForm';
import CalendarView from '@/components/CalendarView';
import { AlgorithmInput, Calendar } from '@/types';
import { generateContentCalendar } from '@/lib/algorithm';

export default function Home() {
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [currentWeekIndex, setCurrentWeekIndex] = useState<number>(0);
  const [lastInput, setLastInput] = useState<AlgorithmInput | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (input: AlgorithmInput) => {
    setIsGenerating(true);
    try {
      setLastInput(input);
      const newCalendar = await generateContentCalendar(input, 0);
      setCalendars([newCalendar]);
      setCurrentWeekIndex(0);
    } catch (error) {
      console.error("Generation failed:", error);
      alert("Failed to generate calendar. Check console for details.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNextWeek = async () => {
    if (!lastInput) return;
    
    const nextIndex = currentWeekIndex + 1;
    
    if (nextIndex < calendars.length) {
        // Already generated
        setCurrentWeekIndex(nextIndex);
    } else {
        // Generate new
        setIsGenerating(true);
        try {
          const newCalendar = await generateContentCalendar(lastInput, nextIndex);
          setCalendars([...calendars, newCalendar]);
          setCurrentWeekIndex(nextIndex);
        } catch (error) {
          console.error("Generation failed:", error);
        } finally {
          setIsGenerating(false);
        }
    }
  };

  const handlePrevWeek = () => {
    if (currentWeekIndex > 0) {
      setCurrentWeekIndex(currentWeekIndex - 1);
    }
  };

  const currentCalendar = calendars[currentWeekIndex] || null;

  return (
    <main className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-[95%] mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Reddit Content Calendar
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
            Generate a strategic content plan for your brand.
          </p>
        </div>

        {isGenerating && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-xl flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
              <p className="text-lg font-medium text-gray-900">Generating Content...</p>
              <p className="text-sm text-gray-500">This may take a moment with AI enabled.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <InputForm onGenerate={handleGenerate} />
          </div>
          <div className="lg:col-span-2 min-w-0">
            {currentCalendar ? (
              <CalendarView 
                calendar={currentCalendar} 
                onNextWeek={handleNextWeek} 
                onPrevWeek={handlePrevWeek}
                canPrev={currentWeekIndex > 0}
              />
            ) : (
              <div className="bg-white rounded-lg shadow-md p-12 text-center text-gray-500">
                Configure your settings and click "Generate Content Calendar" to see the plan.
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
