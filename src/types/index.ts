export interface CompanyInfo {
  name: string;
  description: string;
  goals: string;
}

export interface Persona {
  id: string;
  name: string;
  style: string; // e.g., "Helpful expert", "Curious beginner", "Skeptical user"
  tone: string;
}

export interface Subreddit {
  name: string;
  description: string;
}

export interface Topic {
  id: string;
  query: string; // The ChatGPT query or topic string
}

export interface Comment {
  id: string;
  personaId: string;
  authorName: string;
  contentPrompt: string; // The prompt used to generate the comment
  simulatedContent?: string; // The simulated output
  parentId?: string; // If null, it's a top-level comment (though in this structure, comments are usually on posts)
  date: Date;
  commentType?: string;
}

export interface Post {
  id: string;
  subreddit: string;
  opPersonaId: string;
  authorName: string;
  topicId: string;
  titlePrompt: string;
  bodyPrompt: string;
  simulatedTitle?: string;
  simulatedBody?: string;
  date: Date;
  comments: Comment[];
}

export interface Calendar {
  weekStartDate: Date;
  posts: Post[];
}

export interface ContentTemplates {
  titles: string[];
  bodies: {
    intros: string[];
    middles: string[];
    outros: string[];
  };
  comments: {
    agreements: string[];
    disagreements: string[];
    plugs: string[];
    generic: string[];
  };
}

export interface AlgorithmInput {
  companyInfo: CompanyInfo;
  personas: Persona[];
  subreddits: Subreddit[];
  topics: Topic[];
  postsPerWeek: number;
  templates: ContentTemplates;
  openaiApiKey?: string;
  useLLM?: boolean;
}
