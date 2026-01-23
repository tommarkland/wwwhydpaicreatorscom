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

## CONTEXT:
These creators are in the Amazon/e-commerce/business space. Being business-focused, entrepreneurial, or teaching about Amazon FBA/selling is POSITIVE - that's exactly what we want. We're checking for brand safety issues, not whether they're "too business-y".

## RED FLAGS (Score deductions):

### Critical Issues (instant low score):
- **Any negative mentions of Amazon, Amazon Ads, or Amazon services** - This is disqualifying
- Course scams or misleading income claims - Fake testimonials, unrealistic promises
- Known scammer or bad actor in the Amazon seller community

### Content Concerns:
- Political content: Controversial political statements, strong partisan affiliations
- Adult/explicit content: NSFW material, suggestive content
- Controversial opinions: Divisive statements, inflammatory rhetoric
- Excessive profanity: Heavy swearing, offensive language

### Industry Red Flags:
- Gambling/betting promotion
- Heavy alcohol/cannabis promotion
- Promoting competing ad platforms (Google Ads, Meta Ads, etc.)
- MLM or pyramid scheme involvement
- Get-rich-quick schemes beyond legitimate Amazon business

## POSITIVE SIGNALS (Score boosts):
- Legitimate Amazon business expertise (FBA, advertising, selling)
- Good community reputation (known positively in Amazon seller circles)
- Professional presentation and high-quality content
- Educational, helpful content about e-commerce
- Established track record of brand partnerships
- Clean, professional language

## SCORING (0-5 scale):
- 5: Excellent - No concerns, ideal Amazon Ads partner
- 4: Good - Minor concerns, safe to partner
- 3: Acceptable - Some concerns but workable
- 2: Caution - Notable issues, needs discussion
- 1: High Risk - Significant problems, not recommended
- 0: Reject - Critical red flags (anti-Amazon, scammer, etc.)

IMPORTANT: Base your assessment on your training knowledge about this creator. If you don't have specific information, assess based on the name and URL patterns, and note the limited information in your summary.

You must respond using the provided function.`;

    const userPrompt = `Analyze the brand safety for this content creator for potential Amazon Ads partnership:

**Creator Name:** ${creatorName}

**Social Media Presence:**
${formattedUrls}

Assess this creator for Amazon Ads partnership suitability:
1. Use your knowledge about this creator (if any)
2. Check for red flags in the guidelines
3. Identify positive signals
4. Assign a score from 0-5
5. List specific issues (if any)
6. Summarize with your recommendation

Remember: Business/entrepreneurial content is POSITIVE. We're looking for brand safety issues, not filtering out business people.`;

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
                    description: "Brand safety score from 0-5 (5 = excellent, ideal partner)",
                  },
                  issues: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of specific brand safety issues or concerns found",
                  },
                  summary: {
                    type: "string",
                    description: "Brief summary with recommendation for Amazon Ads partnership",
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

    // Ensure score is within bounds (0-5)
    result.score = Math.min(5, Math.max(0, Math.round(result.score)));

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
