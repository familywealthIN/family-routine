const testQueries = [
  'Call dentist tomorrow',
  'Buy groceries after work',
  'Create a fitness plan for the next week',
  'Build a study schedule for this month',
  'Schedule a meeting with John',
  'Plan my workout routine for the year',
  'Send an email to client',
  'Design a weekly meal plan',
  'Fix the bug in the code',
  'Monthly budget planning',
];

console.log('Testing intelligent mode detection:');
console.log('=====================================');

testQueries.forEach((query) => {
  const queryLower = query.toLowerCase();
  const hasTimeKeywords = /\b(week|month|year|weekly|monthly|yearly|weeks|months|years)\b/.test(queryLower);
  const hasPlanKeywords = /\b(plan|schedule|routine|program|strategy|course|curriculum)\b/.test(queryLower);
  const isTaskMode = !(hasTimeKeywords || hasPlanKeywords);

  console.log(`"${query}" -> ${isTaskMode ? 'TASK' : 'GOALS'} mode`);
});
