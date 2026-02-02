const moment = require('moment');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const OPENROUTER_MODEL = 'google/gemini-2.0-flash-001'; // Using a free model from OpenRouter

/**
 * Cleans the AI response to ensure it's a valid JSON string.
 * Removes markdown code blocks and any leading/trailing text.
 *
 * @param {string} text The raw response from the AI.
 * @returns {string} The cleaned JSON string.
 */
function cleanJsonResponse(text) {
  let cleaned = text.trim();

  // Remove markdown code blocks if present
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1].split('```')[0].trim();
  } else if (cleaned.includes('```')) {
    const parts = cleaned.split('```');
    if (parts.length >= 3) {
      cleaned = parts[1].trim();
    }
  }

  // Sometimes AI adds text before or after the JSON object
  // Find the first '{' and the last '}'
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }

  // Remove trailing commas before closing braces/brackets
  // This handles a common AI mistake
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');

  return cleaned;
}

/**
 * A centralized function to handle AI API requests with a fallback mechanism.
 * It first tries Gemini, and if that fails or is not configured, it falls back to OpenRouter.
 *
 * @param {string} prompt The prompt to send to the AI model.
 * @param {boolean} isJsonMode Whether to ask the AI to respond in JSON format.
 * @returns {Promise<string>} The text response from the AI.
 * @throws {Error} If both AI services fail.
 */
async function fetchFromAi(prompt, isJsonMode = false) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  const fullPrompt = isJsonMode
    ? `${prompt}\n\nRespond ONLY with a valid JSON object.`
    : prompt;

  // 1. Try Google Gemini API
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
      console.log('Successfully fetched from Gemini API.');
      const result = data.candidates[0].content.parts[0].text.trim();
      console.log('=================== result =======================');
      console.log(result);
      return isJsonMode ? cleanJsonResponse(result) : result;
    } catch (error) {
      console.warn(`Gemini API request failed: ${error.message}. Falling back to OpenRouter.`);
    }
  }

  // 2. Fallback to OpenRouter API
  if (openRouterApiKey) {
    try {
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openRouterApiKey}`,
          'HTTP-Referer': 'https://family-routine.com', // Replace with your actual site URL
          'X-Title': 'Family Routine AI', // Replace with your actual app name
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
      console.log('Successfully fetched from OpenRouter API.');
      const result = data.choices[0].message.content.trim();
      console.log('=================== result =======================');
      console.log(result);
      return isJsonMode ? cleanJsonResponse(result) : result;
    } catch (error) {
      console.error(`OpenRouter API request failed: ${error.message}`);
    }
  }

  // 3. If both fail
  throw new Error('Both AI services are unavailable or misconfigured.');
}

async function getSummaryFromGoalItems(goalItems) {
  console.log('Fetching summary for items:', goalItems);
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
  const baseDate = new Date();
  const entriesTemplate = [];

  const periodInfo = {
    week: {
      period: 'day',
      range: 7,
      getDelta: (i) => {
        // Check if query mentions specific number of days
        const daysMatch = userQuery.match(/(\d+)\s*days?/i);
        if (daysMatch) {
          const numDays = parseInt(daysMatch[1], 10);
          const targetDate = new Date(baseDate);
          targetDate.setDate(baseDate.getDate() + i);
          return i < numDays ? targetDate : null;
        }

        // Check if query mentions "next week starting Sunday"
        if (/next\s*week.*sunday/i.test(userQuery)) {
          const today = new Date();
          const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

          // Calculate days until next Sunday
          let daysUntilNextSunday;
          if (currentDay === 0) {
            // If today is Sunday, next Sunday is 7 days away
            daysUntilNextSunday = 7;
          } else {
            // Otherwise, calculate days until next Sunday
            daysUntilNextSunday = 7 - currentDay;
          }

          const nextSunday = new Date(today);
          nextSunday.setDate(today.getDate() + daysUntilNextSunday);

          // Add i days from next Sunday
          const targetDate = new Date(nextSunday);
          targetDate.setDate(nextSunday.getDate() + i);
          return targetDate;
        }

        // Default: start from tomorrow
        const targetDate = new Date(baseDate);
        targetDate.setDate(baseDate.getDate() + i + 1);
        return targetDate;
      },
      formatPeriodName: (date) => date.toLocaleDateString('en-US', { weekday: 'long' }),
    },
    month: {
      period: 'week',
      range: 4,
      getDelta: (i) => {
        // Check if query mentions specific number of weeks
        const weeksMatch = userQuery.match(/(\d+)\s*weeks?/i);
        if (weeksMatch) {
          const numWeeks = parseInt(weeksMatch[1], 10);
          return i < numWeeks ? new Date(baseDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000)) : null;
        }

        // Check if query mentions "next month"
        if (/next\s*month/i.test(userQuery)) {
          const nextMonth = new Date(baseDate);
          nextMonth.setMonth(baseDate.getMonth() + 1);
          nextMonth.setDate(1); // Start from first day of next month
          return new Date(nextMonth.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
        }

        // Default: start from current date
        return new Date(baseDate.getTime() + (i * 7 * 24 * 60 * 60 * 1000));
      },
      formatPeriodName: (date, i) => {
        const weeksMatch = userQuery.match(/(\d+)\s*weeks?/i);
        if (weeksMatch) {
          return `Week ${i + 1}`;
        }
        return `Week ${i + 1}`;
      },
    },
    year: {
      period: 'month',
      range: 12,
      getDelta: (i) => {
        // Check if query mentions specific number of months
        const monthsMatch = userQuery.match(/(\d+)\s*months?/i);
        if (monthsMatch) {
          const numMonths = parseInt(monthsMatch[1], 10);
          if (i >= numMonths) return null;
        }

        // Check if query mentions "next year"
        if (/next\s*year/i.test(userQuery)) {
          const nextYear = new Date(baseDate);
          nextYear.setFullYear(baseDate.getFullYear() + 1);
          nextYear.setMonth(0); // Start from January of next year
          nextYear.setDate(1);
          const date = new Date(nextYear);
          date.setMonth(nextYear.getMonth() + i);
          return date;
        }

        // Default: start from current date
        const date = new Date(baseDate);
        date.setMonth(date.getMonth() + i);
        return date;
      },
      formatPeriodName: (date) => date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    },
  };

  const info = periodInfo[timeframe];

  // Adjust range based on specific numbers in the query
  let actualRange = info.range;
  if (timeframe === 'week') {
    const daysMatch = userQuery.match(/(\d+)\s*days?/i);
    if (daysMatch) {
      actualRange = Math.min(parseInt(daysMatch[1], 10), 7);
    }
  } else if (timeframe === 'month') {
    const weeksMatch = userQuery.match(/(\d+)\s*weeks?/i);
    if (weeksMatch) {
      actualRange = Math.min(parseInt(weeksMatch[1], 10), 8);
    }
  } else if (timeframe === 'year') {
    const monthsMatch = userQuery.match(/(\d+)\s*months?/i);
    if (monthsMatch) {
      actualRange = Math.min(parseInt(monthsMatch[1], 10), 12);
    }
  }

  for (let i = 0; i < actualRange; i += 1) {
    const entryDate = info.getDelta(i);
    if (entryDate) { // Only add non-null dates
      entriesTemplate.push({
        period: info.period,
        periodName: info.formatPeriodName(entryDate, i),
        date: moment(entryDate).format('DD-MM-YYYY'), // Convert to DD-MM-YYYY format
        title: 'task title',
        description: 'detailed description',
      });
    }
  }

  return entriesTemplate;
}

// Fallback function to generate mock data when API fails
function generateFallbackPlan(userQuery, timeframe) {
  const entriesTemplate = generateEntriesTemplate(timeframe, userQuery);

  // Generate mock content based on query type
  let planTitle = 'Generated Plan';
  let descriptions = [];

  if (userQuery.toLowerCase().includes('fitness') || userQuery.toLowerCase().includes('workout')) {
    planTitle = 'Fitness Plan';
    descriptions = [
      'Morning cardio: 30 minutes jogging or cycling\nFocus on building endurance\nTrack heart rate and distance',
      'Strength training: Focus on upper body exercises\n'
      + '- Push-ups: 3 sets of 12-15 reps\n- Pull-ups: 3 sets of 8-10 reps\n- Bench press: 3 sets of 10 reps',
      'Core workout: Planks, sit-ups, and leg raises\n'
      + '- Plank: 3 sets of 60 seconds\n- Crunches: 3 sets of 20 reps\n- Leg raises: 3 sets of 15 reps',
      'Flexibility: 15 minutes of stretching\nFocus on major muscle groups\nHold each stretch for 30 seconds',
      'Active recovery: Light walking or yoga\n20-30 minutes of gentle movement\nFocus on breathing and relaxation',
      'High-intensity interval training (HIIT)\n30 seconds work, 30 seconds rest\nRepeat for 15-20 minutes',
      'Rest day: Light stretching and hydration\nGentle mobility work\nPlan for next week',
    ];
  } else if (userQuery.toLowerCase().includes('study') || userQuery.toLowerCase().includes('learn')) {
    planTitle = 'Study Plan';
    descriptions = [
      'Review previous concepts and take notes\n'
      + 'Go through last week\'s materials\nCreate summary notes\nIdentify areas needing more focus',
      'Focus on new material and practice problems\n'
      + 'Read assigned chapters\nWork through example problems\nTake detailed notes',
      'Complete assignments and exercises\nFinish homework problems\nReview solutions\nAsk questions if needed',
      'Group study session or discussion\n'
      + 'Meet with study group\nDiscuss difficult concepts\nShare different approaches',
      'Practice tests and self-assessment\nTake practice exams\nTime yourself\nReview incorrect answers',
      'Review and consolidate knowledge\nCreate study guides\nMake flashcards\nSummarize key concepts',
      'Plan for next week and set goals\nReview progress\nSet new objectives\nPrepare study schedule',
    ];
  } else {
    planTitle = 'Goal Plan';
    descriptions = [
      'Begin with planning and preparation\nDefine clear objectives\nGather necessary resources\nCreate action steps',
      'Focus on core activities and tasks\n'
      + 'Work on primary objectives\nMaintain consistent effort\nTrack progress daily',
      'Continue progress and maintain momentum\nBuild on previous achievements\nStay motivated\nAdjust approach if needed',
      'Evaluate progress and adjust approach\nReview what\'s working\nIdentify challenges\nMake necessary changes',
      'Intensify efforts and push boundaries\n'
      + 'Increase focus and dedication\nTackle difficult tasks\nStrive for excellence',
      'Complete major milestones\nFinish key deliverables\nCelebrate achievements\nDocument lessons learned',
      'Review, reflect, and plan next steps\n'
      + 'Analyze overall progress\nIdentify improvements\nSet future goals',
    ];
  }

  // Map descriptions to entries
  const mappedEntries = entriesTemplate.map((entry, index) => ({
    ...entry,
    title: `${planTitle} - ${entry.periodName}`,
    description: descriptions[index % descriptions.length],
  }));

  return {
    period: timeframe,
    title: planTitle,
    entries: mappedEntries,
  };
}

async function generateMilestonePlan(userQuery) {
  let timeframe = 'week'; // default

  // Check for specific patterns in the modified query
  if (/\d+\s*days?\b/i.test(userQuery) || /next\s*week/i.test(userQuery)) {
    timeframe = 'week';
  } else if (/\d+\s*weeks?\b/i.test(userQuery) || /next\s*month/i.test(userQuery)) {
    timeframe = 'month';
  } else if (/\d+\s*months?\b/i.test(userQuery) || /next\s*year/i.test(userQuery)) {
    timeframe = 'year';
  }

  // Fallback mechanism is now handled by fetchFromAi, but we can keep this for non-API failures
  const useFallback = () => {
    console.warn('API failed or not configured, using local fallback data.');
    return generateFallbackPlan(userQuery, timeframe);
  };

  try {
    const entriesTemplate = generateEntriesTemplate(timeframe, userQuery);
    const baseDate = new Date();

    const prompt = `Generate a detailed plan in JSON format for: "${userQuery}".
    Use this structure:
    {
        "period": "${timeframe}",
        "title": "plan title",
        "entries": ${JSON.stringify(entriesTemplate, null, 2)}
    }
    
    Current date: ${baseDate.toISOString().split('T')[0]}

    Follow these rules strictly:
    1. Use ONLY the period type specified in the template.
    2. Keep all periodName and date values exactly as provided.
    3. Include all activities for each period in the description field.
    4. Use newline characters (\\n) and bullet points in descriptions for readability.
    5. DO NOT use any placeholders like $ or {}. Fill in all details with actual content.
    6. Ensure the response is a single, valid JSON object.
    
    Based on the plan type, include specific details in the description:
    - Fitness: Exercises, sets, reps, rest.
    - Diet: Meals, portions, calories.
    - Study: Topics, objectives, resources.
    - Project: Tasks, deadlines, deliverables.`;

    const responseText = await fetchFromAi(prompt, true);

    try {
      const parsedJson = JSON.parse(responseText);

      // Basic validation
      if (!parsedJson.period || !parsedJson.title || !parsedJson.entries) {
        throw new Error('Invalid JSON structure from AI');
      }

      return parsedJson;
    } catch (parseError) {
      console.error('Failed to parse AI JSON response:', parseError.message);
      console.error('Cleaned response text:', responseText);
      throw parseError;
    }
  } catch (error) {
    console.error('Error generating milestone plan:', error);
    return useFallback();
  }
}

async function extractTaskFromNaturalLanguage(naturalLanguageText) {
  console.log('Extracting task data from natural language:', naturalLanguageText);

  const prompt = `
Convert this natural language text into a structured todo item:
"${naturalLanguageText}"

Extract and provide the following information in a JSON object:
1. A clear, actionable title (max 60 characters)
2. A detailed description explaining what needs to be done
3. 2-3 relevant tags using prefixes like priority:, category:, type:, context:, etc.
   - A 'priority:' tag is mandatory (do, plan, delegate, automate).
4. Due date if mentioned (ISO format YYYY-MM-DD) or null if not specified.

Respond ONLY with a valid JSON object in this exact format:
{
  "title": "Clear actionable title",
  "description": "Detailed description of what needs to be done",
  "tags": ["priority:do", "category:work", "type:task"],
  "dueDate": "2025-06-30",
  "priority": "do"
}`;

  try {
    const responseText = await fetchFromAi(prompt, true);
    const extractedData = JSON.parse(responseText);

    if (!extractedData.title || !extractedData.description) {
      throw new Error('Incomplete task data extracted from AI response');
    }

    return extractedData;
  } catch (error) {
    console.error('Error in extractTaskFromNaturalLanguage:', error);
    throw new Error('Failed to extract task from text.');
  }
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
    const enhancement = JSON.parse(responseText);

    return {
      ...routineItem,
      description: enhancement.description,
      // steps: enhancement.steps || [],
    };
  } catch (error) {
    console.error('Error enhancing routine item with AI:', error);
    // Return original item with fallback content
    return {
      ...routineItem,
      description: `A ${routineItem.name.toLowerCase()} routine to help you build healthy habits.`,
    };
  }
}

module.exports = {
  getSummaryFromGoalItems,
  getNextStepsFromGoalItems,
  generateMilestonePlan,
  extractTaskFromNaturalLanguage,
  enhanceRoutineItemWithAI,
};
