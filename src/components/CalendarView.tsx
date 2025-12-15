'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Post, Comment } from '@/types';
import { analyzeCalendar } from '@/lib/analysis';
import { format } from 'date-fns';
import { MessageSquare, User, Calendar as CalendarIcon, Download, AlertTriangle, CheckCircle } from 'lucide-react';

interface CalendarViewProps {
  calendar: Calendar;
  onNextWeek: () => void;
  onPrevWeek: () => void;
  canPrev: boolean;
}

export default function CalendarView({ calendar, onNextWeek, onPrevWeek, canPrev }: CalendarViewProps) {
  const analysis = useMemo(() => analyzeCalendar(calendar), [calendar]);

  const downloadCSV = () => {
    // Posts Section
    const postHeaders = ['post_id', 'subreddit', 'title', 'body', 'author_username', 'timestamp', 'keyword_ids'];
    const postRows = calendar.posts.map(post => {
      return [
        post.id,
        `r/${post.subreddit}`,
        `"${(post.simulatedTitle || '').replace(/"/g, '""')}"`,
        `"${(post.simulatedBody || '').replace(/"/g, '""')}"`,
        post.authorName,
        format(post.date, 'yyyy-MM-dd HH:mm'),
        `"${post.topicId}"`
      ].join(',');
    });

    // Comments Section
    const commentHeaders = ['comment_id', 'post_id', 'parent_comment_id', 'comment_text', 'username', 'timestamp', 'Column 7'];
    const commentRows: string[] = [];
    
    calendar.posts.forEach(post => {
      post.comments.forEach(comment => {
        commentRows.push([
          comment.id,
          post.id,
          comment.parentId || '',
          `"${(comment.simulatedContent || '').replace(/"/g, '""')}"`,
          comment.authorName,
          format(comment.date, 'yyyy-MM-dd HH:mm'),
          ''
        ].join(','));
      });
    });

    const csvContent = [
      postHeaders.join(','),
      ...postRows,
      ',,,,,,',
      ',,,,,,',
      ',,,,,,',
      ',,,,,,',
      ',,,,,,',
      commentHeaders.join(','),
      ...commentRows
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `content_calendar_${format(calendar.weekStartDate, 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          Week of {format(calendar.weekStartDate, 'MMMM d, yyyy')}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={downloadCSV}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={onPrevWeek}
            disabled={!canPrev}
            className={`inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 ${!canPrev ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
          >
            Previous Week
          </button>
          <button
            onClick={onNextWeek}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            Next Week
          </button>
        </div>
      </div>

      {/* Quality Scorecard */}
      <div className="bg-white shadow rounded-lg p-4 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            Quality Analysis
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              analysis.score >= 8 ? 'bg-green-100 text-green-800' :
              analysis.score >= 5 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              Score: {analysis.score}/10
            </span>
          </h3>
        </div>
        
        {analysis.warnings.length > 0 ? (
          <div className="space-y-2">
            {analysis.warnings.map((warning, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 p-2 rounded">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{warning}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 p-2 rounded">
            <CheckCircle className="w-4 h-4" />
            <span>Great job! No issues detected with this calendar.</span>
          </div>
        )}
      </div>

      <div className="bg-white shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subreddit
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Persona
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Content Plan
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Engagement
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {calendar.posts.map((post) => (
                <tr key={post.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(post.date, 'EEE, MMM d')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium">
                    r/{post.subreddit}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {post.authorName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Topic:</span> {post.topicId}
                    </div>
                    <div className="mb-2">
                      <span className="font-semibold text-gray-700">Title:</span>
                      <Tooltip text={post.simulatedTitle || ''}>
                        <span className="ml-1">{post.simulatedTitle}</span>
                      </Tooltip>
                    </div>
                    <Tooltip text={post.simulatedBody || ''}>
                      <div className="line-clamp-3 text-xs text-gray-400 cursor-help">
                        {post.simulatedBody}
                      </div>
                    </Tooltip>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {post.comments.length > 0 ? (
                      <div className="space-y-2">
                        {post.comments.map(comment => (
                          <div key={comment.id} className="flex items-start gap-1 text-xs">
                            <MessageSquare className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <Tooltip text={comment.simulatedContent || ''}>
                              <span className="cursor-help">
                                <span className="font-medium">{comment.authorName}:</span> {comment.simulatedContent?.substring(0, 50)}...
                              </span>
                            </Tooltip>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">No comments planned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ left: 0, top: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCoords({
      left: rect.left + rect.width / 2,
      top: rect.top,
    });
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  if (!mounted) return <>{children}</>;

  return (
    <>
      <div 
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave} 
        className="inline-block"
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div
          className="fixed z-[9999] max-w-md bg-gray-900 text-white text-xs rounded p-3 shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full -mt-2 leading-relaxed"
          style={{ left: coords.left, top: coords.top }}
        >
          {text}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>,
        document.body
      )}
    </>
  );
}
