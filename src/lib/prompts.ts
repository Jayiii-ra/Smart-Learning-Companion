export const PROMPTS = {
  ADAPTIVE_EXPLANATION: (topic: string, difficulty: string) => {
    let persona = "";
    switch (difficulty) {
      case "beginner":
        persona = "Explain like I'm 5 years old. Use simple analogies and avoid jargon.";
        break;
      case "intermediate":
        persona = "Explain like a knowledgeable high school teacher. Use technical terms but explain them clearly.";
        break;
      case "advanced":
        persona = "Provide a technical deep dive. Assume professional proficiency in the field.";
        break;
      default:
        persona = "Explain clearly and concisely.";
    }
    return `System Instruction: ${persona}\n\nUser Question: Explain "${topic}" to me at a ${difficulty} level.`;
  },

  LEARNING_PATH: (topic: string, style: string) => {
    let strategy = "";
    switch (style) {
      case "visual":
        strategy = "Suggest visual activities like creating mind maps, flowcharts, or using color-coded diagrams.";
        break;
      case "auditory":
        strategy = "Suggest auditory activities like listening to podcasts, recording explanations, or group discussions.";
        break;
      case "kinesthetic":
        strategy = "Suggest hands-on activities, experiments, or physical simulations of the concepts.";
        break;
      default:
        strategy = "Provide general learning activities.";
    }
    return `Create a customized learning path for "${topic}" using a ${style} learning style. ${strategy}`;
  },

  VISUAL_MIND_MAP: (topic: string) => {
    return `Generate a hierarchical mind map overview for the topic "${topic}".
    Format the response as a JSON object with:
    - root: string (the main topic)
    - nodes: array of objects representing sub-topics. Each object has:
      - title: string
      - description: string
      - connections: array of indices of other nodes in the array it links to (optional)
    
    Return ONLY the JSON.`;
  },

  AUDITORY_BREAKDOWN: (topic: string) => {
    return `Generate a conversational script for a 1-minute audio breakdown of the topic "${topic}". 
    It should sound like an engaging podcast or a clear voice memo explanation. 
    Use a friendly tone and include rhythmic pauses marked as [pause] where appropriate.
    The response should be plain text that is easy to read aloud.
    Avoid complex markdown.`;
  },

  DYNAMIC_QUIZZER: (topic: string) => {
    return `Generate a 3-question multiple choice quiz about "${topic}". 
    Format the response as a JSON array of objects, where each object has:
    - question: string
    - options: array of 4 strings
    - correctAnswerIndex: number (0-3)
    - explanation: string for the correct answer.
    
    Return ONLY the JSON.`;
  },

  RAG_PROMPT: (query: string, context: string[]) => {
    const contextStr = context.length > 0 ? context.join("\n\n") : "No specific context found.";
    return `You are a helpful education assistant. Use the following GROUNDING CONTEXT to answer the USER QUERY. 
    If the context doesn't contain the answer, say "I don't have that information in my current knowledge base."
    
    GROUNDING CONTEXT:
    ${contextStr}
    
    USER QUERY:
    ${query}`;
  },

  VANILLA_PROMPT: (query: string) => {
    return `You are a helpful education assistant. Answer the following USER QUERY:
    
    USER QUERY:
    ${query}`;
  }
};
