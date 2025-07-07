const moment = require('moment');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

async function getSummaryFromGoalItems(goalItems) {
  console.log('Fetching summary from Gemini API for items:', goalItems);
  const prompt = `Summarize these goal items in a concise paragraph:
    ${JSON.stringify(goalItems)}
    
    Provide a clear, actionable summary that highlights the main objectives and themes.`;

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API response:', data);
    return data.candidates[0].content.parts[0].text.trim();
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
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text.trim();
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
  try {
    // Enhanced timeframe determination from query
    let timeframe = 'week'; // default

    // Check for specific patterns in the modified query
    if (/\d+\s*days?\b/i.test(userQuery) || /next\s*week/i.test(userQuery)) {
      timeframe = 'week';
    } else if (/\d+\s*weeks?\b/i.test(userQuery) || /next\s*month/i.test(userQuery)) {
      timeframe = 'month';
    } else if (/\d+\s*months?\b/i.test(userQuery) || /next\s*year/i.test(userQuery)) {
      timeframe = 'year';
    } else {
      // Fallback to original logic for basic keywords
      const timeframeMap = {
        week: 'week',
        month: 'month',
        year: 'year',
      };

      Object.keys(timeframeMap).forEach((key) => {
        if (userQuery.toLowerCase().includes(key)) {
          timeframe = timeframeMap[key];
        }
      });
    }

    // Check if API key exists, if not use fallback
    if (!process.env.GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not found, using fallback data');
      return generateFallbackPlan(userQuery, timeframe);
    }

    // Generate appropriate date ranges with user query context
    const entriesTemplate = generateEntriesTemplate(timeframe, userQuery);
    const baseDate = new Date();

    // Generate prompt for Gemini API
    const prompt = `Generate a detailed plan in JSON format for: "${userQuery}".
    Use this structure:
    {
        "period": "${timeframe}",
        "title": "plan title",
        "entries": ${JSON.stringify(entriesTemplate, null, 2)}
    }
    
    Current date: ${baseDate.toISOString().split('T')[0]}

    Follow these period formatting rules strictly:
    1. Use ONLY the period type specified in the template above
    2. Keep all periodName values exactly as provided in the template
    3. Maintain the exact dates provided in the template
    4. Include all activities for each period in the description field
    5. DO NOT create additional entries or change the period structure
    
    Based on the type of plan requested, include these specific details in the description field:
    - For fitness/workout plans: Include exercises, sets, reps, and rest periods
    - For diet plans: Include meals, portions, calories, and nutritional info
    - For study plans: Include topics, learning objectives, and resources
    - For financial plans: Include specific amounts, strategies, and goals
    - For project plans: Include tasks, deadlines, and deliverables
    - For habit-building plans: Include specific actions, triggers, and tracking methods
    
    IMPORTANT: Use newline characters (\\n) in descriptions to separate different points, steps, or sections.
    Format descriptions with bullet points and line breaks for better readability.
    Keep descriptions detailed but concise. Format numbers consistently.`;

    // Use Google Gemini API (assuming we have access to it)
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      console.warn('API failed, using fallback data');
      return generateFallbackPlan(userQuery, timeframe);
    }

    const data = await response.json();
    let responseText = data.candidates[0].content.parts[0].text.trim();

    // Extract JSON content between ```json and ``` markers
    if (responseText.includes('```json')) {
      responseText = responseText.split('```json')[1].split('```')[0].trim();
    }

    // Parse and validate the JSON
    const parsedJson = JSON.parse(responseText);

    // Validate required fields and structure
    const requiredFields = ['period', 'title', 'entries'];
    if (!requiredFields.every((field) => field in parsedJson)) {
      throw new Error('Missing required fields in response');
    }

    // Validate period consistency
    if (parsedJson.period !== timeframe) {
      throw new Error(`Incorrect period type. Expected ${timeframe}`);
    }

    // Validate entries structure matches template
    if (parsedJson.entries.length !== entriesTemplate.length) {
      throw new Error('Incorrect number of entries');
    }

    // Validate and normalize entries structure
    parsedJson.entries = parsedJson.entries.map((entry, i) => {
      const templateEntry = entriesTemplate[i];
      const normalizedEntry = { ...entry };

      if (entry.period !== templateEntry.period) {
        throw new Error(`Incorrect period type in entry ${i}`);
      }

      if (entry.date !== templateEntry.date) {
        console.warn(`Date mismatch in entry ${i}: expected "${templateEntry.date}", got "${entry.date}"`);
        // Auto-correct the date to match the template
        normalizedEntry.date = templateEntry.date;
      }

      if (entry.periodName !== templateEntry.periodName) {
        console.warn(`PeriodName mismatch in entry ${i}: expected "${templateEntry.periodName}", got "${entry.periodName}"`);
        // Auto-correct the periodName to match the template
        normalizedEntry.periodName = templateEntry.periodName;
      }

      // Ensure date is in DD-MM-YYYY format
      if (normalizedEntry.date) {
        // If the date is in ISO format (YYYY-MM-DD), convert it
        if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedEntry.date)) {
          normalizedEntry.date = moment(normalizedEntry.date, 'YYYY-MM-DD').format('DD-MM-YYYY');
          console.log(`Converted ISO date to DD-MM-YYYY format for entry ${i}: ${normalizedEntry.date}`);
        }
        // Validate that the date is now in DD-MM-YYYY format
        if (!/^\d{2}-\d{2}-\d{4}$/.test(normalizedEntry.date)) {
          console.warn(`Invalid date format in entry ${i}: ${normalizedEntry.date}, using template date`);
          normalizedEntry.date = entriesTemplate[i].date;
        }
      }

      return normalizedEntry;
    });

    return parsedJson;
  } catch (error) {
    console.error('Error generating milestone plan:', error);

    if (error instanceof SyntaxError) {
      return {
        error: `Invalid JSON response: ${error.message}`,
        rawResponse: error.responseText || 'No response received',
      };
    }
    if (error.message.includes('Validation error') || error.message.includes('Incorrect')) {
      return {
        error: `Validation error: ${error.message}`,
        rawResponse: error.responseText || 'No response received',
      };
    }
    return {
      error: `Unexpected error: ${error.message}`,
    };
  }
}

async function extractTaskFromNaturalLanguage(naturalLanguageText) {
  console.log('Extracting task data from natural language:', naturalLanguageText);

  const prompt = `
Convert this natural language text into a structured todo item:
"${naturalLanguageText}"

Extract and provide the following information:
1. A clear, actionable title (max 60 characters)
2. A detailed description explaining what needs to be done
3. 2-3 relevant tags using these prefixes:
   - priority: (MUST include based on determined priority using: do, plan, delegate, automate)
   - category: (work, personal, health, finance, education, etc.)
   - type: (task, meeting, review, research, call, email, etc.)
   - context: (office, home, online, phone, travel, etc.)
   - person: (if involves specific person)
   - urgency: (critical, high, medium, low)
   - time: (morning, afternoon, evening, weekend, etc.)
   - energy: (high, medium, low - energy required)
   - tool: (specific tools/software needed)
   - location: (specific location if mentioned)
   - tag: (general descriptive tags without prefix)
4. Due date if mentioned (ISO format YYYY-MM-DD) or null if not specified

Priority Guidelines:
- priority:do - Important and urgent tasks requiring immediate action
- priority:plan - Important but not urgent tasks to be scheduled
- priority:delegate - Urgent but not important tasks that can be assigned to others
- priority:automate - Neither urgent nor important tasks that can be systematized

Rules:
- Title should be concise and actionable
- Description should be detailed and helpful
- Priority should reflect the Eisenhower Matrix principles (do/plan/delegate/automate)
- Tags should be specific and use appropriate prefixes

Respond ONLY with valid JSON in this exact format:
{
  "title": "Clear actionable title",
  "description": "Detailed description of what needs to be done",
  "tags": ["priority:do", "category:work", "type:task"],
  "dueDate": "2025-06-30",
  "priority": "do"
}`;

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt,
          }],
        }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API Error Response:', errorText);
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log('Gemini API response for task extraction:', data);

    const responseText = data.candidates[0].content.parts[0].text.trim();

    // Try to parse the JSON response
    let extractedData;
    try {
      // Look for JSON in the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid response format from AI');
    }

    // Validate extracted data
    if (!extractedData.title || !extractedData.description) {
      throw new Error('Incomplete task data extracted');
    }

    return extractedData;
  } catch (error) {
    console.error('Error in extractTaskFromNaturalLanguage:', error);
    throw error;
  }
}

module.exports = {
  getSummaryFromGoalItems,
  getNextStepsFromGoalItems,
  generateMilestonePlan,
  extractTaskFromNaturalLanguage,
};
