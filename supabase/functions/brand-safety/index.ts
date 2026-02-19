import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SocialUrls {
  youtubeUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  facebookUrl?: string;
  websiteUrl?: string;
}

interface BrandSafetyRequest {
  creatorName: string;
  socialUrls: SocialUrls;
}

interface BrandSafetyIssue {
  issue: string;
  source: string;
}

interface BrandSafetyResponse {
  score: number;
  issues: BrandSafetyIssue[];
  summary: string;
}

const formatSocialUrls = (urls: SocialUrls): string => {
  const parts: string[] = [];
  if (urls.youtubeUrl) parts.push(`- YouTube: ${urls.youtubeUrl}`);
  if (urls.instagramUrl) parts.push(`- Instagram: ${urls.instagramUrl}`);
  if (urls.tiktokUrl) parts.push(`- TikTok: ${urls.tiktokUrl}`);
  if (urls.twitterUrl) parts.push(`- X (Twitter): ${urls.twitterUrl}`);
  if (urls.linkedinUrl) parts.push(`- LinkedIn: ${urls.linkedinUrl}`);
  if (urls.facebookUrl) parts.push(`- Facebook: ${urls.facebookUrl}`);
  if (urls.websiteUrl) parts.push(`- Website: ${urls.websiteUrl}`);
  return parts.length > 0 ? parts.join('\n') : 'No social media URLs provided';
};

// Extract handles from social URLs
const extractHandles = (urls: SocialUrls): string[] => {
  const handles: string[] = [];
  
  if (urls.youtubeUrl) {
    const match = urls.youtubeUrl.match(/@([^\/\?]+)|\/c\/([^\/\?]+)|\/channel\/([^\/\?]+)|\/user\/([^\/\?]+)/);
    if (match) handles.push(match[1] || match[2] || match[3] || match[4]);
  }
  if (urls.instagramUrl) {
    const match = urls.instagramUrl.match(/instagram\.com\/([^\/\?]+)/);
    if (match && match[1] !== 'p' && match[1] !== 'reel') handles.push(match[1]);
  }
  if (urls.tiktokUrl) {
    const match = urls.tiktokUrl.match(/tiktok\.com\/@?([^\/\?]+)/);
    if (match) handles.push(match[1].replace('@', ''));
  }
  if (urls.twitterUrl) {
    const match = urls.twitterUrl.match(/(?:twitter|x)\.com\/([^\/\?]+)/);
    if (match) handles.push(match[1]);
  }
  
  return [...new Set(handles.filter(h => h && h.length > 1))];
};

// Build comprehensive search queries
const buildSearchQueries = (creatorName: string, handles: string[]): string[] => {
  const queries: string[] = [];
  
  // Core controversy searches
  queries.push(`"${creatorName}" controversy`);
  queries.push(`"${creatorName}" scam OR fraud OR "fake giveaway"`);
  queries.push(`"${creatorName}" refund OR chargeback OR "customer service" complaint`);
  queries.push(`"${creatorName}" unethical OR shady OR lawsuit`);
  queries.push(`"${creatorName}" sponsor complaints OR "misleading ads"`);
  
  // Reddit-specific searches
  queries.push(`"${creatorName}" reddit`);
  queries.push(`site:reddit.com "${creatorName}" scam`);
  queries.push(`site:reddit.com "${creatorName}" controversy OR drama`);
  
  // Handle-based searches
  handles.forEach(handle => {
    queries.push(`"${handle}" scam OR controversy`);
    queries.push(`site:reddit.com "${handle}"`);
  });
  
  // Amazon/FBA specific (relevant for Amazon Ads partnerships)
  queries.push(`"${creatorName}" Amazon review OR FBA OR seller`);
  
  return queries;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { creatorName, socialUrls = {} } = await req.json() as BrandSafetyRequest;

    if (!creatorName) {
      return new Response(
        JSON.stringify({ error: "Creator name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const formattedUrls = formatSocialUrls(socialUrls);
    const handles = extractHandles(socialUrls);
    const searchQueries = buildSearchQueries(creatorName, handles);
    
    let searchResults = "";
    let citations: string[] = [];
    let queriesRun: string[] = [];

    // If Perplexity is available, perform real-time web search across multiple queries
    if (PERPLEXITY_API_KEY) {
      console.log("Performing comprehensive brand safety scan for:", creatorName);
      console.log("Extracted handles:", handles);
      console.log("Running", searchQueries.length, "search queries");

      const allResults: string[] = [];
      const allCitations: string[] = [];
      
      try {
        // Run searches in batches to avoid rate limits but maximize coverage
        // Run up to 6 queries for comprehensive coverage
        const queriesToRun = searchQueries.slice(0, 6);
        queriesRun = queriesToRun;
        
        const searchPromises = queriesToRun.map(async (query, index) => {
          // Small stagger to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, index * 100));
          
          console.log(`[${index + 1}/${queriesToRun.length}] Searching:`, query);
          
          const perplexityResponse = await fetch("https://api.perplexity.ai/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${PERPLEXITY_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "sonar-pro",
              messages: [
                { 
                  role: "system", 
                  content: `You are an investigative research assistant specializing in due diligence and reputation research. Your job is to thoroughly search for ANY negative information, controversies, complaints, or red flags about a person or brand.

Be thorough and report:
- Reddit discussions and threads (especially from r/Scams, r/antiMLM, r/BeermoneySub, etc.)
- Review site complaints (BBB, Trustpilot, etc.)
- News articles about controversies
- Forum discussions and warnings
- Social media drama or call-outs
- Legal issues, lawsuits, or regulatory actions
- Refund complaints or chargeback mentions
- Sponsorship or advertising controversies

If you find NOTHING negative, clearly state that no issues were found. Do not make assumptions.` 
                },
                { 
                  role: "user", 
                  content: `Search thoroughly for: ${query}

Report all findings with specific details. Include URLs/sources where possible.` 
                }
              ],
              search_recency_filter: "year",
            }),
          });

          if (perplexityResponse.ok) {
            const perplexityData = await perplexityResponse.json();
            const content = perplexityData.choices?.[0]?.message?.content || "";
            const sourceCitations = perplexityData.citations || [];
            console.log(`[${index + 1}] Found ${sourceCitations.length} citations`);
            return { query, content, citations: sourceCitations };
          } else {
            const errorText = await perplexityResponse.text();
            console.error(`[${index + 1}] Search failed:`, errorText);
            return { query, content: "", citations: [] };
          }
        });

        const results = await Promise.all(searchPromises);
        
        results.forEach((result, index) => {
          if (result.content && result.content.trim()) {
            allResults.push(`### Query ${index + 1}: "${result.query}"\n${result.content}`);
          }
          allCitations.push(...result.citations);
        });

        searchResults = allResults.join('\n\n---\n\n');
        citations = [...new Set(allCitations)]; // Deduplicate citations
        
        console.log("Brand safety scan complete:", {
          queriesRun: queriesToRun.length,
          resultsFound: allResults.length,
          uniqueCitations: citations.length,
        });
      } catch (searchError) {
        console.error("Perplexity search error:", searchError);
      }
    } else {
      console.log("Perplexity not configured, proceeding without web search");
    }

    // Now use the AI to analyze the search results
    const systemPrompt = `You are a strict brand safety analyst for Amazon Ads partnerships. Your job is to analyze REAL search results about a content creator and assess their brand safety with a conservative, protective approach.

## CRITICAL RULES:
1. **NEVER fabricate information** - Only report issues that are explicitly mentioned in the search results
2. **Always cite sources** - Every issue must have a source URL from the citations provided
3. **Reddit flags are serious** - Multiple Reddit complaints, threads, or warnings MUST lower the score. Reddit is a trusted community signal.
4. **Err on the side of caution** - If in doubt, score lower. Amazon Ads partnerships require high confidence.
5. **Be specific** - Quote or paraphrase actual findings from the search results

## SCORING (0-5 scale) — BE STRICT:
- 5: Excellent - Actively positive reputation, no issues whatsoever found
- 4: Good - Truly minor/unconfirmed concerns only. NO Reddit flags. NO complaints.
- 3: Acceptable - A few isolated concerns or 1-2 Reddit mentions with mild criticism
- 2: Caution - Multiple Reddit threads, multiple complaints, or any confirmed controversy
- 1: High Risk - Significant problems: scam accusations, many Reddit warnings, lawsuit, fraud
- 0: Reject - Critical red flags: anti-Amazon sentiment, confirmed scammer, adult/illegal content

## MANDATORY SCORE REDUCTIONS:
- Any Reddit thread flagging the creator as a scam or fraud → score CANNOT exceed 2
- Multiple Reddit complaints or warning threads → score CANNOT exceed 2
- A Reddit thread calling out the creator (even without "scam") → score CANNOT exceed 3
- Confirmed lawsuit or legal action → score CANNOT exceed 1
- Anti-Amazon or anti-Amazon Ads sentiment → score CANNOT exceed 1
- Any course scam or misleading income claims → score CANNOT exceed 2
- BBB complaints or Trustpilot warnings → score CANNOT exceed 3

## RED FLAGS TO LOOK FOR (only if found in search results):
- Negative Reddit mentions, threads, or community warnings
- Negative mentions of Amazon, Amazon Ads, or Amazon services
- Course scams, fake testimonials, misleading income claims
- Controversial political statements
- Adult/explicit content
- Gambling, MLM, or get-rich-quick scheme promotion
- Community complaints on Reddit or forums
- Legal issues, lawsuits, or regulatory actions

## POSITIVE SIGNALS (only if genuinely present in results):
- Good community reputation with positive Reddit/forum mentions
- Verified positive reviews and testimonials
- Professional content and established branding
- Successful legitimate brand partnerships

You must respond using the provided function. For each issue, include the source URL. Be strict and conservative — it is better to score lower than to approve a risky creator.`;

    const userPrompt = `Analyze brand safety for: ${creatorName}
${handles.length > 0 ? `\nExtracted Social Handles: ${handles.join(', ')}` : ''}

Social Media Presence:
${formattedUrls}

${searchResults ? `
## COMPREHENSIVE WEB SEARCH RESULTS
(${queriesRun.length} queries executed across web + Reddit)

${searchResults}

## AVAILABLE CITATIONS (${citations.length} sources found):
${citations.map((url, i) => `[${i + 1}] ${url}`).join('\n')}

## QUERIES EXECUTED:
${queriesRun.map((q, i) => `${i + 1}. ${q}`).join('\n')}
` : `
## NO WEB SEARCH AVAILABLE
Perplexity search is not configured. You can only assess based on the creator name and URLs provided.
Be conservative - if you have no information, give a neutral score (3-4) and note that no search was performed.
`}

Based on the comprehensive search results above (or lack thereof), provide your brand safety assessment. 
Remember: ONLY report issues that are explicitly found in the search results. Include source URLs for each issue.
If searches returned no negative information, this is a POSITIVE signal - give a high score.`;

    // Try to get AI analysis with retry logic
    let result: BrandSafetyResponse | null = null;
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "brand_safety_assessment",
                  description: "Return the brand safety assessment with sourced issues",
                  parameters: {
                    type: "object",
                    properties: {
                      score: {
                        type: "number",
                        description: "Brand safety score from 0-5 (5 = excellent, safe to partner)",
                      },
                      issues: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            issue: {
                              type: "string",
                              description: "Description of the brand safety issue found",
                            },
                            source: {
                              type: "string",
                              description: "URL source where this issue was found. Use 'No source - limited information' if search wasn't available",
                            },
                          },
                          required: ["issue", "source"],
                        },
                        description: "List of specific brand safety issues found WITH source URLs",
                      },
                      summary: {
                        type: "string",
                        description: "Brief summary explaining the score and key findings. Be clear about what was actually found vs. what wasn't searched.",
                      },
                    },
                    required: ["score", "issues", "summary"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "brand_safety_assessment" } },
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
              { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ error: "Usage limit reached. Please add credits to continue." }),
              { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          const errorText = await response.text();
          console.error(`AI gateway error (attempt ${attempt}):`, response.status, errorText);
          lastError = new Error(`AI gateway error: ${response.status}`);
          continue;
        }

        const data = await response.json();
        
        // Check for tool call response
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          result = JSON.parse(toolCall.function.arguments);
          break;
        }
        
        // Fallback: Try to extract from text content if no tool call
        const textContent = data.choices?.[0]?.message?.content;
        if (textContent) {
          console.log(`Attempt ${attempt}: No tool call, trying to parse text response`);
          
          // Try to find JSON in the response
          const jsonMatch = textContent.match(/\{[\s\S]*"score"[\s\S]*"issues"[\s\S]*"summary"[\s\S]*\}/);
          if (jsonMatch) {
            try {
              result = JSON.parse(jsonMatch[0]);
              break;
            } catch (parseError) {
              console.error("Failed to parse JSON from text:", parseError);
            }
          }
          
          // Last resort: Create a basic response from the text
          if (attempt === 2) {
            console.log("Using fallback response from text content");
            result = {
              score: 3,
              issues: [],
              summary: textContent.substring(0, 500) + (textContent.length > 500 ? '...' : ''),
            };
            break;
          }
        }
        
        lastError = new Error("No tool call or parseable response from AI");
        console.error(`Attempt ${attempt}: No valid response, retrying...`);
        
      } catch (error) {
        console.error(`Attempt ${attempt} error:`, error);
        lastError = error instanceof Error ? error : new Error(String(error));
      }
    }
    
    if (!result) {
      throw lastError || new Error("Failed to get AI response after retries");
    }

    // Ensure score is within bounds (0-5)
    result.score = Math.min(5, Math.max(0, Math.round(result.score)));

    // Convert issues to the expected format for the frontend
    const formattedResult = {
      score: result.score,
      issues: result.issues.map(i => typeof i === 'string' ? i : `${i.issue} [Source: ${i.source}]`),
      summary: result.summary,
      searchPerformed: !!PERPLEXITY_API_KEY,
      citationCount: citations.length,
      queriesExecuted: queriesRun.length,
      handlesFound: handles,
      citations: citations,
    };

    return new Response(JSON.stringify(formattedResult), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Brand safety analysis error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error occurred" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
