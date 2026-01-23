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

interface BrandSafetyResponse {
  score: number;
  issues: string[];
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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const formattedUrls = formatSocialUrls(socialUrls);

    const systemPrompt = `You are a brand safety analyst specializing in evaluating content creators for Amazon Ads brand partnerships. Your job is to assess whether a creator is safe and appropriate for partnership with Amazon advertising clients.

## PRIMARY RED FLAGS (Major score deductions - 15-30 points each):

### Content Concerns:
- Political content: Controversial political statements, strong partisan affiliations, divisive political commentary
- Adult/explicit content: NSFW material, suggestive content, inappropriate imagery
- Controversial opinions: Hot-takes, divisive statements, inflammatory rhetoric
- Profanity/language: Excessive swearing, inappropriate or offensive language
- **CRITICAL: Any negative mentions of Amazon, Amazon Ads, or Amazon services**

### Industry Red Flags:
- Gambling/betting: Casino content, sports betting, crypto gambling promotion
- Alcohol/cannabis: Heavy promotion of alcohol brands or cannabis-related content
- Competitor mentions: Promoting competing advertising platforms (Google Ads, Meta Ads, etc.)
- Get-rich-quick schemes: MLM promotion, questionable business opportunities
- **Course scams or bad business practices**: Overpriced courses, fake testimonials, misleading income claims
- Scammy behavior: Fake giveaways, engagement baiting, misleading content

## POSITIVE SIGNALS (Score boosts - 5-15 points each):
- Good reputation: Positive discussions on Reddit, good Google search results, community respect
- Established track record: History of successful, professional brand partnerships
- Professional presentation: High production quality, consistent branding, polished content
- Educational focus: Informative content, tutorials, how-to guides, genuine value
- Family-friendly: Content suitable for all ages, clean language

## SCORING GUIDELINES:
- 85-100: Excellent - No concerns, strong positive signals, ideal partner
- 70-84: Good - Minor concerns but generally safe, proceed with standard review
- 50-69: Caution - Notable concerns that need discussion, conditional approval
- 30-49: High Risk - Significant issues, not recommended without major changes
- 0-29: Reject - Critical red flags, do not partner

Be thorough but fair. Flag specific concerns with evidence when possible.
You must respond using the provided function.`;

    const userPrompt = `Analyze the brand safety for this content creator for potential Amazon Ads partnership:

**Creator Name:** ${creatorName}

**Social Media Presence:**
${formattedUrls}

Based on the creator name and their social media profiles, conduct a brand safety assessment:

1. Search your knowledge for any information about this creator
2. Check for any of the red flags listed in your guidelines
3. Identify any positive signals
4. Assign a brand safety score from 0-100
5. List specific issues found (reference the platform where each issue was found)
6. Provide a concise summary with your recommendation

Remember: This is for Amazon Ads partnerships, so any negativity toward Amazon or its services is a critical red flag.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "brand_safety_assessment",
              description: "Return the brand safety assessment results",
              parameters: {
                type: "object",
                properties: {
                  score: {
                    type: "number",
                    description: "Brand safety score from 0-100 (100 = completely safe)",
                  },
                  issues: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of potential brand safety issues or concerns",
                  },
                  summary: {
                    type: "string",
                    description: "Brief summary of the brand safety assessment",
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
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract the function call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call response from AI");
    }

    const result: BrandSafetyResponse = JSON.parse(toolCall.function.arguments);

    // Ensure score is within bounds
    result.score = Math.min(100, Math.max(0, Math.round(result.score)));

    return new Response(JSON.stringify(result), {
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
