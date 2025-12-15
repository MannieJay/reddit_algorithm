import { AlgorithmInput, Calendar, Post, Comment, Persona, ContentTemplates } from '@/types';
import { addDays, startOfWeek, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { generateLLMContent } from './llm';

// Helper to shuffle array
function shuffle<T>(array: T[]): T[] {
  let currentIndex = array.length,  randomIndex;
  while (currentIndex != 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

// Helper for round-robin selection
function getRoundRobinItem<T>(array: T[], index: number): T {
  let wrappedIndex = index;
  // Manually wrap the index around if it exceeds the array length
  while (wrappedIndex >= array.length) {
    wrappedIndex -= array.length;
  }
  return array[wrappedIndex];
}

export const DEFAULT_TEMPLATES: ContentTemplates = {
  titles: [
    `Thoughts on ${"{topic}"}?`,
    `Question about ${"{topic}"}`,
    `Anyone have experience with ${"{topic}"}?`,
    `${"{topic}"} - need advice`,
    `Let's discuss ${"{topic}"}`,
    `Best approach for ${"{topic}"}?`,
    `Struggling with ${"{topic}"}`,
    `Tips for ${"{topic}"}?`,
    `How do you handle ${"{topic}"}?`,
    `Resources for ${"{topic}"}?`,
    `Discussion: ${"{topic}"}`,
    `Help with ${"{topic}"}`,
    `Opinions on ${"{topic}"}`,
    `Guide to ${"{topic}"}?`,
    `${"{topic}"} in 2025`
  ],
  bodies: {
    intros: [
      `I've been lurking in r/${"{subreddit}"} for a while and wanted to ask...`,
      `My boss just asked me to look into ${"{topic}"} and I'm a bit lost.`,
      `I saw a tweet about ${"{topic}"} and it got me thinking.`,
      `I've been using a few different tools for this but nothing sticks.`,
      `Just wanted to get a sanity check from you guys.`,
      `Long time lurker, first time poster here.`,
      `I'm trying to optimize my workflow around ${"{topic}"}.`,
      `Does anyone have experience with this in a production environment?`
    ],
    middles: [
      `I've heard good things about ${"{companyName}"} but haven't tried it.`,
      `Does anyone have a workflow that actually works?`,
      `I feel like I'm wasting so much time on this.`,
      `Is there a standard way to handle this in 2025?`,
      `I've tried a bunch of solutions but they all fall short.`,
      `It seems like everyone does this differently.`,
      `I'm hitting a wall and could use some pointers.`
    ],
    outros: [
      `Thanks in advance!`,
      `Appreciate any help.`,
      `Let me know what you think.`,
      `Cheers.`,
      `Any advice is welcome.`,
      `Thanks for reading!`,
      `Looking forward to your thoughts.`
    ]
  },
  comments: {
    agreements: [
      "Totally agree.",
      "This is exactly what I was thinking.",
      "100%.",
      "Great point.",
      "I've had the same experience.",
      "Spot on.",
      "Couldn't have said it better myself.",
      "This."
    ],
    disagreements: [
      // Disagreements removed from logic, keeping empty or safe placeholders if needed, 
      // but logic uses agreements/plugs/generic.
      "I see it differently.",
      "Not sure I agree."
    ],
    plugs: [
      `Have you checked ${"{companyName}"}? It might help.`,
      `I use ${"{companyName}"} for this and it works great.`,
      `${"{companyName}"} is pretty solid for this use case.`,
      `Give ${"{companyName}"} a look.`,
      `I'd recommend taking a look at ${"{companyName}"}.`,
      `We switched to ${"{companyName}"} and it solved this.`
    ],
    generic: [
      "Following.",
      "I'm curious about this too.",
      "Great question.",
      "I've been wondering the same thing.",
      "Any updates on this?",
      "Hope someone has an answer.",
      "Bump."
    ]
  }
};

// --- Simulation Helpers ---

function replacePlaceholders(template: string, replacements: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    // Match {key} (e.g. {topic})
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  }
  return result;
}

function generateSimulatedTitle(topic: string, templates: string[]): string {
  const template = templates[Math.floor(Math.random() * templates.length)];
  return replacePlaceholders(template, { topic });
}

function generateSimulatedBody(topic: string, subreddit: string, companyName: string, templates: ContentTemplates['bodies']): string {
  const intro = templates.intros[Math.floor(Math.random() * templates.intros.length)];
  const middle = templates.middles[Math.floor(Math.random() * templates.middles.length)];
  const outro = templates.outros[Math.floor(Math.random() * templates.outros.length)];

  return `${replacePlaceholders(intro, { topic, subreddit, companyName })} ${replacePlaceholders(middle, { topic, subreddit, companyName })} ${replacePlaceholders(outro, { topic, subreddit, companyName })}`;
}

function generateSimulatedComment(companyName: string, templates: ContentTemplates['comments'], type: string = 'generic'): string {
  let templateList: string[] = [];
  
  if (type === 'plug') {
    templateList = templates.plugs;
  } else if (type === 'agreement') {
    templateList = templates.agreements;
  } else {
    // 'generic', 'curiosity', 'disagreement' (mapped to generic for safety)
    templateList = templates.generic;
  }

  const template = templateList[Math.floor(Math.random() * templateList.length)];
  return replacePlaceholders(template, { companyName });
}

export async function generateContentCalendar(input: AlgorithmInput, weekOffset: number = 0): Promise<Calendar> {
  const { companyInfo, personas, subreddits, topics, postsPerWeek, templates, openaiApiKey, useLLM } = input;
  const posts: Post[] = [];
  const usedContent = new Set<string>();

  async function getUniqueContent(generator: () => string | Promise<string>): Promise<string> {
    let content = await generator();
    let attempts = 0;
    while (usedContent.has(content) && attempts < 10) {
      content = await generator();
      attempts++;
    }
    usedContent.add(content);
    return content;
  }
  
  // Determine start date (next Monday + offset weeks)
  const today = new Date();
  const nextMonday = addDays(startOfWeek(today, { weekStartsOn: 1 }), 7 + (weekOffset * 7));

  // Shuffle topics and subreddits to ensure variety each week
  const shuffledTopics = shuffle([...topics]);
  const shuffledSubreddits = shuffle([...subreddits]);

  const daysInWeek = 7;
  let availableSlots: number[] = [];
  for (let i = 0; i < daysInWeek; i++) {
      availableSlots.push(i);
  }
  
  while (availableSlots.length < postsPerWeek) {
      availableSlots = availableSlots.concat(availableSlots);
  }
  availableSlots = availableSlots.slice(0, postsPerWeek).sort((a, b) => a - b);

  // --- Batch Data Preparation ---
  interface BatchComment {
    id: string;
    personaId: string;
    authorName: string;
    contentPrompt: string;
    parentId?: string;
    date: Date;
    simulatedContent?: string;
    commentType: string;
  }

  interface BatchPost {
    id: string;
    subreddit: string;
    opPersonaId: string;
    authorName: string;
    topicId: string;
    topicQuery: string;
    titlePrompt: string;
    bodyPrompt: string;
    date: Date;
    comments: BatchComment[];
    simulatedTitle?: string;
    simulatedBody?: string;
  }

  const batchPosts: BatchPost[] = [];

  for (let i = 0; i < postsPerWeek; i++) {
    const dayOffset = availableSlots[i];
    const hourOffset = 9 + Math.floor(Math.random() * 12);
    const minuteOffset = Math.floor(Math.random() * 60);
    
    const postDate = addDays(nextMonday, dayOffset);
    postDate.setHours(hourOffset, minuteOffset, 0, 0);

    const topic = getRoundRobinItem(shuffledTopics, i);
    const subreddit = getRoundRobinItem(shuffledSubreddits, i);
    const opPersona = personas[Math.floor(Math.random() * personas.length)];

    const titlePrompt = `
Role: ${opPersona.style} (${opPersona.tone})
Task: Write a Reddit post title for r/${subreddit.name}.
Topic: ${topic.query}
Goal: Spark discussion about a problem that ${companyInfo.name} solves.
Constraint: Do NOT sound like an ad. Use lowercase if it fits the persona. Make it clickbaity but authentic. Include a typo if the persona is casual.
    `.trim();

    const bodyPrompt = `
Role: ${opPersona.style} (${opPersona.tone})
Task: Write the body of the Reddit post.
Context: ${companyInfo.description}
Topic: ${topic.query}
Instructions:
1. Start with a personal hook or observation related to the topic.
2. Describe a specific struggle or need.
3. Mention ${companyInfo.name} as a potential solution you are considering, or ask if anyone has experience with it. Alternatively, describe the problem so well that ${companyInfo.name} is the obvious answer in the comments.
4. Keep it under 200 words.
5. Use slang or abbreviations appropriate for r/${subreddit.name}.
6. IMPORTANT: Sound like a confused or curious user, NOT a brand representative.
    `.trim();

    const comments: BatchComment[] = [];
    const numComments = Math.floor(Math.random() * 3) + 1; // 1 to 3 comments (Ensure at least one comment)

    let lastCommentDate = postDate;
    const replyableIds: (string | undefined)[] = [undefined];
    let hasPlug = false;

    for (let j = 0; j < numComments; j++) {
      let parentId: string | undefined = undefined;
      const isReplyToOp = replyableIds.length <= 1 || Math.random() <= 0.7;
      
      if (!isReplyToOp && replyableIds.length > 1) {
          parentId = replyableIds[Math.floor(Math.random() * (replyableIds.length - 1)) + 1];
      }

      let parentAuthorId = opPersona.id;
      let parentType = "post";

      if (parentId) {
        const parentComment = comments.find(c => c.id === parentId);
        if (parentComment) {
          parentAuthorId = parentComment.personaId;
          parentType = parentComment.commentType;
        }
      }

      const validCommenters = personas.filter(p => p.id !== parentAuthorId);
      if (validCommenters.length === 0) continue;

      const commenter = validCommenters[Math.floor(Math.random() * validCommenters.length)];
      const parentContext = parentId ? "the previous comment" : "the original post";
      
      const rand = Math.random();
      let commentType = "generic";
      let specificInstruction = "";

      const isLastChance = (j === numComments - 1);
      const shouldBePlug = (!hasPlug && isLastChance) || (rand < 0.3); // Force on last if missing, or 30% random chance

      if (shouldBePlug) {
        commentType = "plug";
        specificInstruction = `Mention ${companyInfo.name} as a good solution. Share a brief positive experience or feature. Keep it subtle, like a user recommendation.`;
        hasPlug = true;
      } else {
        // If not a plug, determine type based on parent
        let agreementThreshold = 0.65; // Default 65% agreement
        
        if (parentType === 'plug') {
          agreementThreshold = 0.9; // 90% chance to agree if replying to a plug
        }

        if (rand < agreementThreshold) {
          commentType = "agreement";
          specificInstruction = "Agree with the parent comment/post. Validate their point or share a similar experience.";
        } else {
          commentType = "curiosity";
          specificInstruction = "Ask a relevant follow-up question to the parent comment/post to keep the discussion going.";
        }
      }

      const commentPrompt = `
Role: ${commenter.style} (${commenter.tone})
Task: Write a comment replying to ${parentContext}.
Topic: ${topic.query}
Context: The thread is about ${topic.query} and potentially ${companyInfo.name}.
Instruction: ${specificInstruction}
Constraint: Keep it short (1-2 sentences). Be conversational. Don't be too formal. No hashtags.
      `.trim();
      
      const commentDate = new Date(lastCommentDate.getTime() + Math.floor(Math.random() * 120 + 10) * 60000);
      lastCommentDate = commentDate;
      const newCommentId = uuidv4();

      comments.push({
        id: newCommentId,
        personaId: commenter.id,
        authorName: commenter.name,
        contentPrompt: commentPrompt,
        parentId: parentId,
        date: commentDate,
        commentType: commentType
      });
      replyableIds.push(newCommentId);
    }

    batchPosts.push({
      id: uuidv4(),
      subreddit: subreddit.name,
      opPersonaId: opPersona.id,
      authorName: opPersona.name,
      topicId: topic.id,
      topicQuery: topic.query,
      titlePrompt,
      bodyPrompt,
      date: postDate,
      comments
    });
  }

  // --- Generation Phase ---
  if (useLLM && openaiApiKey) {
    // Batch LLM Generation with Chunking to avoid Rate Limits
    const CHUNK_SIZE = 3; // Process 3 posts at a time
    const DELAY_MS = 1500; // 1.5s delay between chunks

    const systemPrompt = `
You are a Reddit content generator.
Process the provided JSON input which contains a list of posts and their comments.
For each post and comment, generate the text content based on the provided 'prompt'.
Return a JSON object with the following structure:
{
  "posts": [
    {
      "id": "...",
      "title": "...",
      "body": "...",
      "comments": [
        { "id": "...", "content": "..." },
        ...
      ]
    },
    ...
  ]
}
Ensure the IDs match exactly.
    `.trim();

    for (let i = 0; i < batchPosts.length; i += CHUNK_SIZE) {
      const chunk = batchPosts.slice(i, i + CHUNK_SIZE);
      
      const batchInput = {
        posts: chunk.map(p => ({
          id: p.id,
          title_prompt: p.titlePrompt,
          body_prompt: p.bodyPrompt,
          comments: p.comments.map(c => ({
            id: c.id,
            prompt: c.contentPrompt
          }))
        }))
      };

      try {
        const jsonResult = await generateLLMContent(
          systemPrompt + "\n\nInput Data:\n" + JSON.stringify(batchInput),
          openaiApiKey,
          'gpt-3.5-turbo',
          { max_tokens: 2500, jsonMode: true }
        );

        const parsed = JSON.parse(jsonResult);
        
        // Map results back
        if (parsed.posts && Array.isArray(parsed.posts)) {
          for (const generatedPost of parsed.posts) {
            const originalPost = chunk.find(p => p.id === generatedPost.id);
            if (originalPost) {
              originalPost.simulatedTitle = generatedPost.title;
              originalPost.simulatedBody = generatedPost.body;
              
              if (generatedPost.comments && Array.isArray(generatedPost.comments)) {
                for (const generatedComment of generatedPost.comments) {
                  const originalComment = originalPost.comments.find(c => c.id === generatedComment.id);
                  if (originalComment) {
                    originalComment.simulatedContent = generatedComment.content;
                  }
                }
              }
            }
          }
        }

        // Delay if there are more chunks
        if (i + CHUNK_SIZE < batchPosts.length) {
          await new Promise(resolve => setTimeout(resolve, DELAY_MS));
        }

      } catch (error) {
        console.error(`Batch LLM Generation failed for chunk ${i}:`, error);
        // Fallback to templates for this chunk if LLM fails
        for (const p of chunk) {
          if (!p.simulatedTitle) p.simulatedTitle = await getUniqueContent(() => generateSimulatedTitle(p.topicQuery || "", templates.titles));
          if (!p.simulatedBody) p.simulatedBody = await getUniqueContent(() => generateSimulatedBody(p.topicQuery || "", p.subreddit, companyInfo.name, templates.bodies));
          for (const c of p.comments) {
             if (!c.simulatedContent) c.simulatedContent = await getUniqueContent(() => generateSimulatedComment(companyInfo.name, templates.comments, c.commentType));
          }
        }
      }
    }
  } else {
    // Template Generation
    for (const p of batchPosts) {
       p.simulatedTitle = await getUniqueContent(() => generateSimulatedTitle(p.topicQuery, templates.titles));
       p.simulatedBody = await getUniqueContent(() => generateSimulatedBody(p.topicQuery, p.subreddit, companyInfo.name, templates.bodies));
       
       for (const c of p.comments) {
         c.simulatedContent = await getUniqueContent(() => generateSimulatedComment(companyInfo.name, templates.comments, c.commentType));
       }
    }
  }

  // Final Assembly
  for (const p of batchPosts) {
    posts.push({
      id: p.id,
      subreddit: p.subreddit,
      opPersonaId: p.opPersonaId,
      authorName: p.authorName,
      topicId: p.topicId,
      titlePrompt: p.titlePrompt,
      bodyPrompt: p.bodyPrompt,
      simulatedTitle: p.simulatedTitle || "Error Generating Title",
      simulatedBody: p.simulatedBody || "Error Generating Body",
      date: p.date,
      comments: p.comments.map(c => ({
        id: c.id,
        personaId: c.personaId,
        authorName: c.authorName,
        contentPrompt: c.contentPrompt,
        simulatedContent: c.simulatedContent || "Error Generating Comment",
        parentId: c.parentId,
        date: c.date,
        commentType: c.commentType
      }))
    });
  }

  posts.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    weekStartDate: nextMonday,
    posts
  };
}
