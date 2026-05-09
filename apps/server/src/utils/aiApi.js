const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'google/gemini-2.0-flash-001';

function cleanJsonResponse(text) {
    let cleaned = text.trim();

    if (cleaned.includes('```json')) {
        cleaned = cleaned.split('```json')[1].split('```')[0].trim();
    } else if (cleaned.includes('```')) {
        const parts = cleaned.split('```');
        if (parts.length >= 3) {
            cleaned = parts[1].trim();
        }
    }

    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

    return cleaned;
}

async function fetchFromAi(prompt, isJsonMode = false) {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;

    const fullPrompt = isJsonMode
        ? `${prompt}\n\nRespond ONLY with a valid JSON object.`
        : prompt;

    if (geminiApiKey) {
        try {
            const response = await fetch(GEMINI_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': geminiApiKey,
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    ...(isJsonMode && { generationConfig: { response_mime_type: 'application/json' } }),
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            if (!data.candidates || !data.candidates[0].content.parts[0].text) {
                throw new Error('Invalid response structure from Gemini');
            }
            const result = data.candidates[0].content.parts[0].text.trim();
            return isJsonMode ? cleanJsonResponse(result) : result;
        } catch (error) {
            console.warn(`Gemini API request failed: ${error.message}. Falling back to OpenRouter.`);
        }
    }

    if (openRouterApiKey) {
        try {
            const response = await fetch(OPENROUTER_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${openRouterApiKey}`,
                    'HTTP-Referer': 'https://family-routine.com',
                    'X-Title': 'Family Routine AI',
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: [{ role: 'user', content: fullPrompt }],
                    ...(isJsonMode && { response_format: { type: 'json_object' } }),
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenRouter API Error: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            if (!data.choices || !data.choices[0].message.content) {
                throw new Error('Invalid response structure from OpenRouter');
            }
            const result = data.choices[0].message.content.trim();
            return isJsonMode ? cleanJsonResponse(result) : result;
        } catch (error) {
            console.error(`OpenRouter API request failed: ${error.message}`);
        }
    }

    throw new Error('Both AI services are unavailable or misconfigured.');
}

async function enhanceRoutineItemWithAI(routineItem) {
    const prompt = `Enhance this routine item with a helpful description and specific steps.

Routine Item: ${JSON.stringify(routineItem)}

Please respond with ONLY a JSON object in this exact format:
{
  "description": "A motivating 1-2 sentence description of this routine and its benefits.",
  "steps": [
    {"name": "Step 1 description"},
    {"name": "Step 2 description"},
    {"name": "Step 3 description"}
  ]
}`;

    try {
        const responseText = await fetchFromAi(prompt, true);
        const enhancement = JSON.parse(cleanJsonResponse(responseText));

        return {
            ...routineItem,
            description: enhancement.description,
        };
    } catch (error) {
        console.error('Error enhancing routine item with AI:', error);
        return {
            ...routineItem,
            description: `A ${routineItem.name.toLowerCase()} routine to help you build healthy habits.`,
        };
    }
}

async function getSummaryFromGoalItems(goalItems) {
    const prompt = `Summarize these goal items in a concise paragraph:
    ${JSON.stringify(goalItems)}
    
    Provide a clear, actionable summary that highlights the main objectives and themes.`;

    try {
        return await fetchFromAi(prompt);
    } catch (error) {
        console.error('Error in getSummaryFromGoalItems:', error);
        return 'Unable to generate summary at this time. Please try again later.';
    }
}

async function getNextStepsFromGoalItems(goalItems) {
    const prompt = `Based on these goal items, suggest 3-5 specific next action steps to achieve these goals:
    ${JSON.stringify(goalItems)}
    
    Format your response as a numbered list with clear, actionable steps.
    Focus on practical actions the user can take immediately.`;

    try {
        return await fetchFromAi(prompt);
    } catch (error) {
        console.error('Error in getNextStepsFromGoalItems:', error);
        return 'Unable to generate next steps at this time. Please try again later.';
    }
}

function generateEntriesTemplate(timeframe, userQuery = '') {
    const entriesTemplate = [];
    const today = new Date();

    // The frontend (modifyQueryPeriod in AiGoalPlanFormContainer) rewrites
    // bare period words into explicit counts (e.g. "this year" → "8 months"
    // when 8 months remain). Honour those counts here so the milestone
    // template doesn't overshoot the user-intended horizon.
    const monthsMatch = userQuery.match(/(\d+)\s*months?\b/i);
    const weeksMatch = userQuery.match(/(\d+)\s*weeks?\b/i);
    const daysMatch = userQuery.match(/(\d+)\s*days?\b/i);
    const explicitMonths = monthsMatch ? Math.max(1, Math.min(12, parseInt(monthsMatch[1], 10))) : null;
    const explicitWeeks = weeksMatch ? Math.max(1, Math.min(8, parseInt(weeksMatch[1], 10))) : null;
    const explicitDays = daysMatch ? Math.max(1, Math.min(14, parseInt(daysMatch[1], 10))) : null;

    // "next year/month/week" should plan against the *next* period, not
    // overlap today's. Without this, "next year" generates today + 12mo
    // instead of Jan 1 → Dec 31 of next year (the user's actual intent).
    const isNextYear = /\bnext\s*year\b/i.test(userQuery);
    const isNextMonth = /\bnext\s*month\b/i.test(userQuery);
    const isNextWeek = /\bnext\s*week\b/i.test(userQuery);

    const yearBase = isNextYear
        ? new Date(today.getFullYear() + 1, 0, 1)        // Jan 1 next year
        : new Date(today);
    const monthBase = isNextMonth
        ? new Date(today.getFullYear(), today.getMonth() + 1, 1) // 1st of next month
        : new Date(today);
    const weekBase = isNextWeek
        ? (() => {
            const d = new Date(today);
            // Jump to the upcoming Sunday (start of next ISO/US week).
            const daysUntilSunday = ((7 - d.getDay()) % 7) || 7;
            d.setDate(d.getDate() + daysUntilSunday);
            return d;
        })()
        : new Date(today);

    const periodInfo = {
        week: {
            period: 'day',
            range: explicitDays || 7,
            getDelta: (i) => {
                const targetDate = new Date(weekBase);
                // For an explicit count or "next week", start at i=0.
                // Otherwise keep the legacy "starts tomorrow" behaviour so
                // the next 7 days excluding today are templated.
                const offset = (explicitDays || isNextWeek) ? i : i + 1;
                targetDate.setDate(weekBase.getDate() + offset);
                return targetDate;
            },
            formatPeriodName: (date) => date.toLocaleDateString('en-US', { weekday: 'long' }),
        },
        month: {
            period: 'week',
            range: explicitWeeks || 4,
            getDelta: (i) => new Date(monthBase.getTime() + (i * 7 * 24 * 60 * 60 * 1000)),
            formatPeriodName: (date, i) => `Week ${i + 1}`,
        },
        year: {
            period: 'month',
            range: explicitMonths || 12,
            getDelta: (i) => {
                const date = new Date(yearBase);
                date.setMonth(yearBase.getMonth() + i);
                return date;
            },
            formatPeriodName: (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        },
    };

    const info = periodInfo[timeframe];
    for (let i = 0; i < info.range; i += 1) {
        const entryDate = info.getDelta(i);
        if (entryDate) {
            const month = String(entryDate.getMonth() + 1).padStart(2, '0');
            const day = String(entryDate.getDate()).padStart(2, '0');
            const year = entryDate.getFullYear();
            entriesTemplate.push({
                period: info.period,
                periodName: info.formatPeriodName(entryDate, i),
                date: `${day}-${month}-${year}`,
                title: 'task title',
                description: 'detailed description',
            });
        }
    }

    return entriesTemplate;
}

function generateFallbackPlan(userQuery, timeframe) {
    const entriesTemplate = generateEntriesTemplate(timeframe, userQuery);
    const mappedEntries = entriesTemplate.map((entry, index) => ({
        ...entry,
        title: `Goal Plan - ${entry.periodName}`,
        description: `Continue working towards your goals. Step ${index + 1} of your plan.`,
    }));
    return {
        period: timeframe,
        title: 'Goal Plan',
        description: `Plan generated for "${userQuery}". Break the goal into smaller milestones and review progress each ${timeframe}.`,
        entries: mappedEntries,
    };
}

async function generateMilestonePlan(userQuery, systemPrompt = null) {
    let timeframe = 'week';

    if (/\d+\s*days?\b/i.test(userQuery) || /next\s*week/i.test(userQuery)) {
        timeframe = 'week';
    } else if (/\d+\s*weeks?\b/i.test(userQuery) || /next\s*month/i.test(userQuery)) {
        timeframe = 'month';
    } else if (/\d+\s*months?\b/i.test(userQuery) || /next\s*year/i.test(userQuery)) {
        timeframe = 'year';
    }

    const useFallback = () => generateFallbackPlan(userQuery, timeframe);

    try {
        const entriesTemplate = generateEntriesTemplate(timeframe, userQuery);
        const baseDate = new Date();
        const contextPrefix = systemPrompt
            ? `Context from parent goal:\n${systemPrompt}\n\nUsing the above parent goal as context, generate a plan that aligns with and supports it.\n\n`
            : '';

        const prompt = `${contextPrefix}Generate a detailed plan in JSON format for: "${userQuery}".
    Use this structure:
    {
        "period": "${timeframe}",
        "title": "plan title",
        "description": "overall description / rationale for the plan — 2-4 markdown lines summarising WHAT the top-level goal means, WHY it matters, and HOW the milestones roll up into it. Use bullet points with newline characters where useful. This text is stored on the PARENT goal itself, so keep it self-contained (do not repeat the milestone list).",
        "entries": ${JSON.stringify(entriesTemplate, null, 2)}
    }
    Current date: ${baseDate.toISOString().split('T')[0]}
    Follow these rules strictly:
    1. Use ONLY the period type specified in the template.
    2. Keep all periodName and date values exactly as provided.
    3. Fill in the top-level "description" field with a concise plan rationale — it is saved on the parent goal and shown in the goal detail view.
    4. Include all activities for each period in the entry-level description field.
    5. Use newline characters and bullet points in descriptions for readability.
    6. DO NOT use any placeholders. Fill in all details with actual content.
    7. Ensure the response is a single, valid JSON object.`;

        const responseText = await fetchFromAi(prompt, true);
        const parsedJson = JSON.parse(cleanJsonResponse(responseText));

        if (!parsedJson.period || !parsedJson.title || !parsedJson.entries) {
            throw new Error('Invalid JSON structure from AI');
        }

        // Guard: if the model forgot the top-level description, build one
        // from the first two entries so the parent goal never ends up blank.
        if (!parsedJson.description || !String(parsedJson.description).trim()) {
            const summaryBits = (parsedJson.entries || [])
                .slice(0, 3)
                .map((entry) => {
                    const head = entry.title ? `- **${entry.title}**` : '';
                    return head;
                })
                .filter(Boolean);
            parsedJson.description = [
                `Plan for "${userQuery}".`,
                summaryBits.length ? '' : null,
                ...summaryBits,
            ]
                .filter((line) => line !== null)
                .join('\n');
        }

        return parsedJson;
    } catch (error) {
        console.error('Error generating milestone plan:', error);
        return useFallback();
    }
}

async function extractTaskFromNaturalLanguage(naturalLanguageText, systemPrompt) {
    const contextPrefix = systemPrompt
        ? `Context from area/project dashboard:\n${systemPrompt}\n\nUse the above context to align the task with ongoing progress and next steps.\n\n`
        : '';

    const prompt = `${contextPrefix}Convert this natural language text into a structured todo item:
"${naturalLanguageText}"

Extract and provide the following information in a JSON object:
1. A clear, actionable title (max 60 characters)
2. A detailed description explaining what needs to be done
3. 2-3 relevant tags using prefixes like priority:, category:, type:, context:, etc.
   - A 'priority:' tag is mandatory (do, plan, delegate, automate).

Respond ONLY with a valid JSON object in this exact format:
{
  "title": "Clear actionable title",
  "description": "Detailed description of what needs to be done",
  "tags": ["priority:do", "category:work", "type:task"],
  "priority": "do"
}`;

    try {
        const responseText = await fetchFromAi(prompt, true);
        const extractedData = JSON.parse(cleanJsonResponse(responseText));

        if (!extractedData.title || !extractedData.description) {
            throw new Error('Incomplete task data extracted from AI response');
        }

        return extractedData;
    } catch (error) {
        console.error('Error in extractTaskFromNaturalLanguage:', error);
        throw new Error('Failed to extract task from text.');
    }
}

const PRIORITY_BUCKETS = ['do', 'plan', 'delegate', 'automate'];

/**
 * Infer an Eisenhower-matrix priority bucket for a freshly captured task.
 * Used by the non-AI "quick add" path to silently tag new tasks so they
 * land on the priority dashboard without forcing users to pick a quadrant.
 *
 * Returns one of: do | plan | delegate | automate.
 * Falls back to 'do' when the model is unavailable or returns garbage —
 * callers can safely ignore errors and still ship the task.
 *
 * @param {string} body The user-entered task text.
 * @param {string} [context] Optional extra context (e.g. routine name, parent goal).
 * @returns {Promise<{priority: string, rationale?: string}>}
 */
async function classifyTaskPriority(body, context = '') {
    const cleanedBody = (body || '').trim();
    if (!cleanedBody) {
        return { priority: 'do' };
    }

    const contextBlock = context && context.trim()
        ? `\n\nAdditional context (routine / parent goal / area):\n${context.trim()}\n`
        : '';

    const prompt = `You classify tasks into the Eisenhower Matrix for a family routine planner.
Return one priority label that best fits the task:
- "do"       => Important AND Urgent (act now)
- "plan"     => Important but not urgent (schedule)
- "delegate" => Urgent but not important (hand off)
- "automate" => Neither urgent nor important (systemise, batch, or drop)

Task:
"${cleanedBody}"${contextBlock}

Guidance:
- If unsure, prefer "do" for today-bound concrete actions and "plan" for longer-term growth items.
- Reply with ONLY a compact JSON object of the form {"priority": "do", "rationale": "short reason"}.`;

    try {
        const responseText = await fetchFromAi(prompt, true);
        const parsed = JSON.parse(cleanJsonResponse(responseText));
        const priority = String(parsed && parsed.priority || '').toLowerCase().trim();
        if (!PRIORITY_BUCKETS.includes(priority)) {
            return { priority: 'do' };
        }
        return {
            priority,
            rationale: typeof parsed.rationale === 'string' ? parsed.rationale : undefined,
        };
    } catch (error) {
        console.warn('classifyTaskPriority fell back to "do":', error.message);
        return { priority: 'do' };
    }
}

module.exports = {
    getSummaryFromGoalItems,
    getNextStepsFromGoalItems,
    generateMilestonePlan,
    extractTaskFromNaturalLanguage,
    enhanceRoutineItemWithAI,
    classifyTaskPriority,
    PRIORITY_BUCKETS,
};
