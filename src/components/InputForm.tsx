'use client';

import React, { useState } from 'react';
import { AlgorithmInput, CompanyInfo, Persona, Subreddit, Topic, ContentTemplates } from '@/types';
import { DEFAULT_TEMPLATES } from '@/lib/algorithm';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface TemplateListEditorProps {
  title: string;
  items: string[];
  onChange: (newItems: string[]) => void;
  placeholder?: string;
}

const TemplateListEditor = ({ title, items, onChange, placeholder }: TemplateListEditorProps) => {
  const addItem = () => {
    onChange([...items, '']);
  };

  const updateItem = (index: number, value: string) => {
    const newItems = [...items];
    newItems[index] = value;
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="mb-4 border p-4 rounded-md bg-gray-50">
      <div className="flex justify-between items-center mb-2">
        <label className="block text-sm font-medium text-gray-700">{title}</label>
        <button type="button" onClick={addItem} className="text-indigo-600 hover:text-indigo-800 text-sm flex items-center">
          <Plus className="w-3 h-3 mr-1" /> Add Line
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
              placeholder={placeholder}
            />
            <button type="button" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {items.length === 0 && (
           <p className="text-xs text-gray-400 italic">No templates defined.</p>
        )}
      </div>
    </div>
  );
};

interface InputFormProps {
  onGenerate: (input: AlgorithmInput) => void;
}

const initialCompanyInfo: CompanyInfo = {
  name: 'SlideForge',
  description: 'AI-powered presentation generator that creates professional slides in seconds.',
  goals: 'Drive signups and brand awareness among professionals and students.'
};

const initialPersonas: Persona[] = [
  { id: '1', name: 'Alex', style: 'Helpful Expert', tone: 'Professional and informative' },
  { id: '2', name: 'Sam', style: 'Curious Student', tone: 'Casual and inquisitive' },
  { id: '3', name: 'Jordan', style: 'Skeptical Techie', tone: 'Critical and detail-oriented' }
];

const initialSubreddits: Subreddit[] = [
  { name: 'productivity', description: 'Tips and tricks for being more productive.' },
  { name: 'consulting', description: 'Discussion for management consultants.' },
  { name: 'college', description: 'Everything related to college life.' }
];

const initialTopics: Topic[] = [
  { id: '1', query: 'Best tools for making presentations quickly' },
  { id: '2', query: 'How to save time on slide decks' },
  { id: '3', query: 'AI tools for students' }
];

export default function InputForm({ onGenerate }: InputFormProps) {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(initialCompanyInfo);
  const [personas, setPersonas] = useState<Persona[]>(initialPersonas);
  const [subreddits, setSubreddits] = useState<Subreddit[]>(initialSubreddits);
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [postsPerWeek, setPostsPerWeek] = useState<number>(5);
  const [templates, setTemplates] = useState<ContentTemplates>(DEFAULT_TEMPLATES);
  const [showTemplates, setShowTemplates] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [useLLM, setUseLLM] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate({
      companyInfo,
      personas,
      subreddits,
      topics,
      postsPerWeek,
      templates,
      openaiApiKey,
      useLLM
    });
  };

  const handleTemplateChange = (
    category: keyof ContentTemplates,
    subCategory: string | null,
    newItems: string[]
  ) => {
    if (category === 'titles') {
      setTemplates({ ...templates, titles: newItems });
    } else if (category === 'bodies' && subCategory) {
      setTemplates({
        ...templates,
        bodies: { ...templates.bodies, [subCategory]: newItems }
      });
    } else if (category === 'comments' && subCategory) {
      setTemplates({
        ...templates,
        comments: { ...templates.comments, [subCategory]: newItems }
      });
    }
  };

  const addPersona = () => {
    setPersonas([...personas, { id: uuidv4(), name: 'New Persona', style: 'General', tone: 'Neutral' }]);
  };

  const removePersona = (id: string) => {
    setPersonas(personas.filter(p => p.id !== id));
  };

  const updatePersona = (id: string, field: keyof Persona, value: string) => {
    setPersonas(personas.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addSubreddit = () => {
    setSubreddits([...subreddits, { name: 'new_subreddit', description: 'Description' }]);
  };

  const removeSubreddit = (index: number) => {
    setSubreddits(subreddits.filter((_, i) => i !== index));
  };

  const updateSubreddit = (index: number, field: keyof Subreddit, value: string) => {
    setSubreddits(subreddits.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const addTopic = () => {
    setTopics([...topics, { id: uuidv4(), query: 'New Topic Query' }]);
  };

  const removeTopic = (id: string) => {
    setTopics(topics.filter(t => t.id !== id));
  };

  const updateTopic = (id: string, value: string) => {
    setTopics(topics.map(t => t.id === id ? { ...t, query: value } : t));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 bg-white p-6 rounded-lg shadow-md">
      <div>
        <h2 className="text-xl font-semibold mb-4">Company Info</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Company Name</label>
            <input
              type="text"
              value={companyInfo.name}
              onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={companyInfo.description}
              onChange={(e) => setCompanyInfo({ ...companyInfo, description: e.target.value })}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Personas</h2>
          <button type="button" onClick={addPersona} className="flex items-center text-indigo-600 hover:text-indigo-800">
            <Plus className="w-4 h-4 mr-1" /> Add Persona
          </button>
        </div>
        <div className="space-y-4">
          {personas.map((persona) => (
            <div key={persona.id} className="flex gap-4 items-start border p-4 rounded-md">
              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={persona.name}
                  onChange={(e) => updatePersona(persona.id, 'name', e.target.value)}
                  placeholder="Name"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
                <input
                  type="text"
                  value={persona.style}
                  onChange={(e) => updatePersona(persona.id, 'style', e.target.value)}
                  placeholder="Style (e.g. Expert)"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
                 <input
                  type="text"
                  value={persona.tone}
                  onChange={(e) => updatePersona(persona.id, 'tone', e.target.value)}
                  placeholder="Tone"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>
              <button type="button" onClick={() => removePersona(persona.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Subreddits</h2>
          <button type="button" onClick={addSubreddit} className="flex items-center text-indigo-600 hover:text-indigo-800">
            <Plus className="w-4 h-4 mr-1" /> Add Subreddit
          </button>
        </div>
        <div className="space-y-4">
          {subreddits.map((subreddit, index) => (
            <div key={index} className="flex gap-4 items-start border p-4 rounded-md">
              <div className="flex-1 space-y-2">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">r/</span>
                  <input
                    type="text"
                    value={subreddit.name}
                    onChange={(e) => updateSubreddit(index, 'name', e.target.value)}
                    placeholder="Subreddit Name"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                  />
                </div>
                <input
                  type="text"
                  value={subreddit.description}
                  onChange={(e) => updateSubreddit(index, 'description', e.target.value)}
                  placeholder="Description (Context for the AI)"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>
              <button type="button" onClick={() => removeSubreddit(index)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Target Topics (ChatGPT Queries)</h2>
          <button type="button" onClick={addTopic} className="flex items-center text-indigo-600 hover:text-indigo-800">
            <Plus className="w-4 h-4 mr-1" /> Add Topic
          </button>
        </div>
        <div className="space-y-4">
          {topics.map((topic) => (
            <div key={topic.id} className="flex gap-4 items-start border p-4 rounded-md">
              <div className="flex-1">
                <input
                  type="text"
                  value={topic.query}
                  onChange={(e) => updateTopic(topic.id, e.target.value)}
                  placeholder="Topic or Query"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
              </div>
              <button type="button" onClick={() => removeTopic(topic.id)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Settings</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Posts per Week</label>
            <input
              type="number"
              value={postsPerWeek}
              onChange={(e) => setPostsPerWeek(parseInt(e.target.value))}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
            />
          </div>

          <div className="border p-4 rounded-md bg-indigo-50">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-indigo-900">AI Integration (Optional)</label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={useLLM}
                  onChange={(e) => setUseLLM(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700">Use OpenAI for High-Quality Content</span>
              </div>
            </div>
            {useLLM && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">OpenAI API Key</label>
                <input
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your key is used locally and never stored.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Templates Section */}
      <div className="border-t pt-6">
        <button
          type="button"
          onClick={() => setShowTemplates(!showTemplates)}
          className="flex items-center justify-between w-full text-left text-xl font-semibold mb-4 focus:outline-none"
        >
          <span>Advanced: Content Templates</span>
          {showTemplates ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        
        {showTemplates && (
          <div className="space-y-6">
            <p className="text-sm text-gray-500">
              Edit the templates used to generate content. Use <code>{"{topic}"}</code>, <code>{"{subreddit}"}</code>, and <code>{"{companyName}"}</code> as placeholders. Enter one template per line.
            </p>

            {/* Titles */}
            <TemplateListEditor
              title="Post Titles"
              items={templates.titles}
              onChange={(newItems) => handleTemplateChange('titles', null, newItems)}
              placeholder="Enter title template"
            />

            {/* Bodies */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Post Bodies</h3>
              <TemplateListEditor
                title="Intros"
                items={templates.bodies.intros}
                onChange={(newItems) => handleTemplateChange('bodies', 'intros', newItems)}
                placeholder="Enter intro template"
              />
              <TemplateListEditor
                title="Middles"
                items={templates.bodies.middles}
                onChange={(newItems) => handleTemplateChange('bodies', 'middles', newItems)}
                placeholder="Enter middle template"
              />
              <TemplateListEditor
                title="Outros"
                items={templates.bodies.outros}
                onChange={(newItems) => handleTemplateChange('bodies', 'outros', newItems)}
                placeholder="Enter outro template"
              />
            </div>

            {/* Comments */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900">Comments</h3>
              <div className="space-y-4">
                <TemplateListEditor
                  title="Agreements"
                  items={templates.comments.agreements}
                  onChange={(newItems) => handleTemplateChange('comments', 'agreements', newItems)}
                  placeholder="Enter agreement comment template"
                />
                <TemplateListEditor
                  title="Disagreements"
                  items={templates.comments.disagreements}
                  onChange={(newItems) => handleTemplateChange('comments', 'disagreements', newItems)}
                  placeholder="Enter disagreement comment template"
                />
                <TemplateListEditor
                  title="Plugs (Mention Company)"
                  items={templates.comments.plugs}
                  onChange={(newItems) => handleTemplateChange('comments', 'plugs', newItems)}
                  placeholder="Enter plug comment template"
                />
                <TemplateListEditor
                  title="Generic"
                  items={templates.comments.generic}
                  onChange={(newItems) => handleTemplateChange('comments', 'generic', newItems)}
                  placeholder="Enter generic comment template"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        type="submit"
        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Generate Content Calendar
      </button>
    </form>
  );
}
