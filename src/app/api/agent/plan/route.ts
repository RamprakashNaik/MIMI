import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { goal, provider, modelId } = await req.json();

    if (!goal || !provider || !modelId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const systemPrompt = `
You are the "Master Planner" for MIMI, an autonomous AI agent.
Your goal is to break down complex user requests into a sequence of actionable tasks.

AVAILABLE TOOLS:
1. "gmail": Search and read emails. Use for finding specific info in the inbox.
2. "search": Web search for real-time info or external knowledge.
3. "memory": Recall long-term user facts, preferences, or project history.
4. "files": Analyze text/data from uploaded attachments.
5. "final_answer": The final step to synthesize all findings and respond to the user.

RULES:
1. Return a VALID JSON object ONLY.
2. Break the goal into 2-5 logical steps.
3. If the goal is simple (e.g. "Hi"), return a single "final_answer" task.
4. Each task must have: "id", "tool", "description", and "status" (always "pending").

JSON FORMAT:
{
  "goal": "user goal here",
  "tasks": [
    { "id": "t1", "tool": "gmail", "description": "Search for emails about...", "status": "pending" },
    ...
  ]
}
`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (provider.apiKey) headers["Authorization"] = `Bearer ${provider.apiKey}`;

    const res = await fetch(`${provider.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `GOAL: ${goal}` }
        ],
        temperature: 0.1
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Upstream error: ${err}`);
    }

    const data = await res.json();
    const content = data.choices[0]?.message?.content;
    const jsonStr = content.replace(/```json/g, "").replace(/```/g, "").trim();
    const plan = JSON.parse(jsonStr);

    return NextResponse.json(plan);
  } catch (err: any) {
    console.error("Planning failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
