import { generateContentCalendar, DEFAULT_TEMPLATES } from './algorithm';
import { AlgorithmInput, Calendar, Persona, Subreddit, Topic, CompanyInfo } from '@/types';

// --- Mocks & Helpers ---

const mockCompany: CompanyInfo = {
  name: "TestCo",
  description: "A testing company",
  goals: "Test the algorithm"
};

const mockPersonas: Persona[] = [
  { id: "p1", name: "Alice", style: "Expert", tone: "Professional" },
  { id: "p2", name: "Bob", style: "Beginner", tone: "Curious" },
  { id: "p3", name: "Charlie", style: "Skeptic", tone: "Critical" },
  { id: "p4", name: "Dave", style: "Fan", tone: "Excited" },
];

const mockSubreddits: Subreddit[] = [
  { name: "testsub1", description: "Testing 1" },
  { name: "testsub2", description: "Testing 2" },
];

const mockTopics: Topic[] = [
  { id: "t1", query: "Topic 1" },
  { id: "t2", query: "Topic 2" },
  { id: "t3", query: "Topic 3" },
  { id: "t4", query: "Topic 4" },
  { id: "t5", query: "Topic 5" },
];

function createInput(overrides?: Partial<AlgorithmInput>): AlgorithmInput {
  return {
    companyInfo: mockCompany,
    personas: mockPersonas,
    subreddits: mockSubreddits,
    topics: mockTopics,
    postsPerWeek: 5,
    templates: DEFAULT_TEMPLATES,
    useLLM: false, // Default to templates for fast testing
    ...overrides
  };
}

// --- Quality Evaluation Logic ---

interface QualityReport {
  score: number; // 0-10
  issues: string[];
  metrics: {
    diversityScore: number;
    interactionScore: number;
    structureScore: number;
  };
}

function evaluateCalendarQuality(calendar: Calendar, input: AlgorithmInput): QualityReport {
  const issues: string[] = [];
  let score = 10;

  // 1. Check for Self-Replies (Critical Fail)
  let selfReplies = 0;
  calendar.posts.forEach(post => {
    post.comments.forEach(comment => {
      let parentAuthorId = post.opPersonaId;
      if (comment.parentId) {
        const parent = post.comments.find(c => c.id === comment.parentId);
        if (parent) parentAuthorId = parent.personaId;
      }
      
      if (comment.personaId === parentAuthorId) {
        selfReplies++;
        issues.push(`Self-reply detected in post ${post.id} by ${comment.authorName}`);
      }
    });
  });
  if (selfReplies > 0) score -= 5; // Heavy penalty

  // 2. Check for Diversity (Subreddits & Topics)
  const usedSubreddits = new Set(calendar.posts.map(p => p.subreddit));
  const usedTopics = new Set(calendar.posts.map(p => p.topicId));
  
  const subredditDiversity = usedSubreddits.size / Math.min(input.postsPerWeek, input.subreddits.length);
  const topicDiversity = usedTopics.size / Math.min(input.postsPerWeek, input.topics.length);

  if (subredditDiversity < 0.5) {
    score -= 1;
    issues.push("Low subreddit diversity");
  }
  if (topicDiversity < 0.5) {
    score -= 1;
    issues.push("Low topic diversity");
  }

  // 3. Check for "Ping-Pong" (Awkward back-and-forth)
  // A replies to B, B replies to A, A replies to B...
  let pingPongCount = 0;
  calendar.posts.forEach(post => {
    // Build a map of parent->child to traverse threads
    // Simple check: if a thread depth > 3 involves only 2 people
    // Since our current logic is flat list of comments with parentIds, we'd need to reconstruct trees.
    // For now, let's check if a single post has > 3 comments but only 2 unique participants including OP.
    const participants = new Set([post.opPersonaId, ...post.comments.map(c => c.personaId)]);
    if (post.comments.length > 3 && participants.size <= 2) {
      pingPongCount++;
      issues.push(`Potential ping-pong conversation in post ${post.id}`);
    }
  });
  if (pingPongCount > 0) score -= 1;

  // 4. Check for Business Promotion (Plug)
  // Every post should have at least one comment mentioning the company (or a "plug" type)
  let postsMissingPlug = 0;
  calendar.posts.forEach(post => {
    const hasPlug = post.comments.some(c => 
      c.commentType === 'plug' || 
      c.simulatedContent?.includes(input.companyInfo.name)
    );
    if (!hasPlug) {
      postsMissingPlug++;
      issues.push(`Post ${post.id} missing business promotion`);
    }
  });
  if (postsMissingPlug > 0) score -= 2;

  // 5. Check for Agreement Logic (Agreement should follow Plug)
  let awkwardAgreements = 0;
  calendar.posts.forEach(post => {
    post.comments.forEach(comment => {
      if (comment.commentType === 'agreement' && comment.parentId) {
        const parent = post.comments.find(c => c.id === comment.parentId);
        // Ideally agreements follow plugs or valid points. 
        // If parent is generic/curiosity, agreement is fine.
        // If parent is another agreement, it's a bit weird ("I agree" -> "I agree").
        if (parent && parent.commentType === 'agreement') {
          awkwardAgreements++;
          issues.push(`Awkward agreement chain in post ${post.id}`);
        }
      }
    });
  });
  if (awkwardAgreements > 0) score -= 1;

  return {
    score: Math.max(0, score),
    issues,
    metrics: {
      diversityScore: (subredditDiversity + topicDiversity) / 2,
      interactionScore: 10 - (selfReplies + pingPongCount),
      structureScore: 10 - (postsMissingPlug + awkwardAgreements)
    }
  };
}

// --- Tests ---

describe('Reddit Algorithm Tests', () => {
  
  test('Scenario 1: Standard Generation Quality', async () => {
    const input = createInput();
    const calendar = await generateContentCalendar(input);
    
    const report = evaluateCalendarQuality(calendar, input);
    
    console.log('Scenario 1 Report:', JSON.stringify(report, null, 2));
    
    expect(report.score).toBeGreaterThanOrEqual(8); // Expect high quality
    expect(calendar.posts.length).toBe(input.postsPerWeek);
  });

  test('Scenario 2: High Volume / Overposting Check', async () => {
    // 20 posts per week with only 2 subreddits
    const input = createInput({ postsPerWeek: 20 });
    const calendar = await generateContentCalendar(input);
    
    const subCounts: Record<string, number> = {};
    calendar.posts.forEach(p => {
      subCounts[p.subreddit] = (subCounts[p.subreddit] || 0) + 1;
    });

    // Expect roughly equal distribution (10 each)
    expect(subCounts['testsub1']).toBeGreaterThanOrEqual(9);
    expect(subCounts['testsub2']).toBeGreaterThanOrEqual(9);
    
    const report = evaluateCalendarQuality(calendar, input);
    expect(report.score).toBeGreaterThanOrEqual(7);
  });

  test('Scenario 3: Limited Personas (Edge Case)', async () => {
    // Only 2 personas. This increases risk of self-replies or ping-pong.
    const input = createInput({ 
      personas: [mockPersonas[0], mockPersonas[1]] 
    });
    const calendar = await generateContentCalendar(input);
    
    const report = evaluateCalendarQuality(calendar, input);
    console.log('Scenario 3 Report:', JSON.stringify(report, null, 2));

    // Should still have NO self-replies
    const selfReplies = report.issues.filter(i => i.includes('Self-reply'));
    expect(selfReplies.length).toBe(0);
  });

  test('Scenario 4: Overlapping Topics', async () => {
    // Only 1 topic
    const input = createInput({ 
      topics: [mockTopics[0]] 
    });
    const calendar = await generateContentCalendar(input);
    
    // All posts should have the same topic ID
    const uniqueTopics = new Set(calendar.posts.map(p => p.topicId));
    expect(uniqueTopics.size).toBe(1);
    
    // Should still generate valid content
    expect(calendar.posts.length).toBe(5);
  });

  test('Scenario 5: Business Promotion Guarantee', async () => {
    const input = createInput();
    const calendar = await generateContentCalendar(input);
    
    calendar.posts.forEach(post => {
      const hasPlug = post.comments.some(c => c.commentType === 'plug');
      expect(hasPlug).toBe(true);
    });
  });

});
