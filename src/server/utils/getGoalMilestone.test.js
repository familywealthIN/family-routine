const getGoalMilestone = require('./getGoalMilestone');

const DB_OBJ = [
  {
    id: 'a',
    date: '10-07-2020',
    period: 'day',
    goalItems: [
      {
        id: 'p',
        isMilestone: true,
        body: 'day task',
        goalRef: 'q',
      },
      {
        id: 'p1',
        isMilestone: false,
        body: 'Non Milestone Day task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'x',
    date: '11-07-2020',
    period: 'day',
    goalItems: [
      {
        id: 'xx',
        isMilestone: true,
        body: 'day task',
        goalRef: 'q',
      },
      {
        id: 'xx1',
        isMilestone: false,
        body: 'Non Milestone Day task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'y',
    date: '12-07-2020',
    period: 'day',
    goalItems: [
      {
        id: 'yy',
        isMilestone: true,
        body: 'day task',
        goalRef: '',
      },
      {
        id: 'yy1',
        isMilestone: false,
        body: 'Non Milestone Day task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'b',
    date: '10-07-2020',
    period: 'week',
    goalItems: [
      {
        id: 'q',
        isMilestone: true,
        body: 'Week task',
        goalRef: 'r',
      },
      {
        id: 'q1',
        isMilestone: false,
        body: 'Non Milestone Week task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'c',
    date: '31-07-2020',
    period: 'month',
    goalItems: [
      {
        id: 'r',
        isMilestone: true,
        body: 'Month task',
        goalRef: 's',
      },
      {
        id: 'r1',
        isMilestone: false,
        body: 'Non Milestone Month task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'd',
    date: '31-12-2020',
    period: 'year',
    goalItems: [
      {
        id: 's',
        isMilestone: true,
        body: 'Year task',
        goalRef: 't',
      },
      {
        id: 's1',
        isMilestone: false,
        body: 'Non Milestone Year task',
        goalRef: '',
      },
    ],
  },
  {
    id: 'e',
    date: '01-01-1970',
    period: 'lifetime',
    goalItems: [
      {
        id: 't',
        isMilestone: false,
        body: 'lifetime task',
        goalRef: 'q',
      },
      {
        id: 'q1',
        isMilestone: false,
        body: 'Non Milestone lifetime task',
        goalRef: '',
      },
    ],
  },
];

console.log(JSON.stringify(getGoalMilestone(DB_OBJ), null, 2));
