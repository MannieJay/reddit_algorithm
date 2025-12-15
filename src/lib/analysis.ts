import { Calendar } from '@/types';

export interface AnalysisResult {
  score: number;
  warnings: string[];
  metrics: {
    postsPerSubreddit: Record<string, number>;
    postsPerPersona: Record<string, number>;
    topicUsage: Record<string, number>;
  };
}

export function analyzeCalendar(calendar: Calendar): AnalysisResult {
  let score = 10;
  const warnings: string[] = [];
  const postsPerSubreddit: Record<string, number> = {};
  const postsPerPersona: Record<string, number> = {};
  const topicUsage: Record<string, number> = {};
  
  const posts = calendar.posts;
  const totalPosts = posts.length;

  if (totalPosts === 0) return { score: 0, warnings: ['No posts generated.'], metrics: { postsPerSubreddit: {}, postsPerPersona: {}, topicUsage: {} } };

  // 1. Check Subreddit Distribution
  posts.forEach(post => {
    postsPerSubreddit[post.subreddit] = (postsPerSubreddit[post.subreddit] || 0) + 1;
  });

  Object.entries(postsPerSubreddit).forEach(([sub, count]) => {
    // If a single subreddit has > 50% of posts AND there are more than 2 posts total
    if (count > 2 && count > totalPosts * 0.5) {
      score -= 1;
      warnings.push(`High frequency in r/${sub} (${count} posts). Consider diversifying subreddits.`);
    }
  });

  // 2. Check Persona Variety (OP)
  posts.forEach(post => {
    postsPerPersona[post.authorName] = (postsPerPersona[post.authorName] || 0) + 1;
  });

  Object.entries(postsPerPersona).forEach(([name, count]) => {
    if (count > totalPosts * 0.6) { // More than 60% of posts by one person
      score -= 1;
      warnings.push(`Persona "${name}" is dominating the conversation (${count} posts).`);
    }
  });

  // 3. Check Topic Repetition
  posts.forEach(post => {
    topicUsage[post.topicId] = (topicUsage[post.topicId] || 0) + 1;
  });
  
  Object.entries(topicUsage).forEach(([topicId, count]) => {
    if (count > 1) {
       // It's okay to repeat if we have many posts, but warn if it's excessive
       if (count > 2) {
         score -= 1;
         warnings.push(`Topic ID "${topicId}" is repeated ${count} times.`);
       }
    }
  });

  // 4. Check for "Awkward" Interactions (Self-replies)
  let selfReplyCount = 0;
  posts.forEach(post => {
    post.comments.forEach(comment => {
      // Check if replying to own post (top level)
      if (!comment.parentId && comment.personaId === post.opPersonaId) {
         selfReplyCount++;
      }
      // Check if replying to self in thread
      if (comment.parentId) {
          const parentComment = post.comments.find(c => c.id === comment.parentId);
          if (parentComment && parentComment.personaId === comment.personaId) {
              selfReplyCount++;
          }
      }
    });
  });

  if (selfReplyCount > 0) {
      score -= 2;
      warnings.push(`Detected ${selfReplyCount} instances of personas replying to themselves. This looks unnatural.`);
  }

  // 5. Check Daily Volume (Overposting)
  const postsPerDay: Record<string, number> = {};
  posts.forEach(post => {
      const dayKey = post.date.toDateString();
      postsPerDay[dayKey] = (postsPerDay[dayKey] || 0) + 1;
  });

  Object.entries(postsPerDay).forEach(([day, count]) => {
      if (count > 3) {
          score -= 1;
          warnings.push(`High volume on ${day} (${count} posts). Risk of looking spammy.`);
      }
  });

  // 6. Check for Duplicate Content
  const contentSet = new Set<string>();
  let duplicateCount = 0;
  
  posts.forEach(post => {
    if (post.simulatedTitle) {
      if (contentSet.has(post.simulatedTitle)) duplicateCount++;
      else contentSet.add(post.simulatedTitle);
    }

    if (post.simulatedBody) {
      if (contentSet.has(post.simulatedBody)) duplicateCount++;
      else contentSet.add(post.simulatedBody);
    }

    post.comments.forEach(comment => {
      if (comment.simulatedContent) {
        if (contentSet.has(comment.simulatedContent)) duplicateCount++;
        else contentSet.add(comment.simulatedContent);
      }
    });
  });

  if (duplicateCount > 0) {
    score -= 2;
    warnings.push(`Detected ${duplicateCount} duplicate posts/comments. Content should be unique.`);
  }

  return {
    score: Math.max(0, score),
    warnings,
    metrics: { postsPerSubreddit, postsPerPersona, topicUsage }
  };
}
