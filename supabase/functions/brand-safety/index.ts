import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BrandSafetyRequest {
  creatorName: string;
  creatorUrls: string;
}

interface BrandSafetyResponse {
  score: number;
  issues: string[];
  summary: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { creatorName, creatorUrls } = await req.json() as BrandSafetyRequest;

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

    const systemPrompt = `You are a brand safety analyst. Analyze the provided content creator information and assess their brand safety for potential brand partnerships.

Evaluate based on:
1. Potential controversial content or statements
2. Audience appropriateness for mainstream brands
3. Content consistency and professionalism
4. Reputation indicators
5. Alignment with family-friendly content guidelines

You must respond using the provided function.`;

    const userPrompt = `Analyze the brand safety for this content creator:

Creator Name: ${creatorName}
${creatorUrls ? `Creator URLs/Platforms: ${creatorUrls}` : 'No URLs provided'}

Based on the creator name and any available information, provide:
1. A brand safety score from 0-100 (100 being completely safe, 0 being very risky)
2. A list of potential issues or concerns (if any)
3. A brief summary of your assessment

Note: This is a preliminary assessment based on the name and URL patterns. For a comprehensive analysis, additional research would be recommended.`;

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
