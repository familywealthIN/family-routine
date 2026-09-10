import { describeRedeemFailure } from '../redeemErrors';

// Apollo prefixes server errors, so match against the shape the dashboard
// actually receives rather than the bare server string.
const gql = (serverMessage) => `GraphQL error: ${serverMessage}`;

describe('describeRedeemFailure', () => {
  describe('names the action the user actually pressed', () => {
    it('says "start the agent" when the user pressed Start Agent', () => {
      const { title } = describeRedeemFailure(gql('409:Task is already checked'), {
        startedAgent: true,
      });
      expect(title).toBe('Could not start the agent');
    });

    it('says "check off this task" when the user ticked the circle', () => {
      const { title } = describeRedeemFailure(gql('409:Task is already checked'), {
        startedAgent: false,
      });
      expect(title).toBe('Could not check off this task');
    });

    it('defaults to the tick wording when no action is given', () => {
      expect(describeRedeemFailure(gql('409:Task is already checked')).title)
        .toBe('Could not check off this task');
    });

    it('never says "redeem", a button the user cannot press', () => {
      const messages = [
        '400:Redemption is only available for today',
        '409:Task is already checked',
        '404:Task not found',
        'boom',
      ];
      messages.forEach((message) => {
        const { title, text } = describeRedeemFailure(gql(message), { startedAgent: true });
        expect(`${title} ${text}`.toLowerCase()).not.toContain('redeem');
      });
    });
  });

  describe('reports the reason the server actually gave', () => {
    it('explains the day-integrity window (the day-7 failure in D-05)', () => {
      const { text } = describeRedeemFailure(gql('400:Redemption is only available for today'));
      expect(text).toContain("today's tasks");
    });

    it('distinguishes a mismatched date from the window check', () => {
      const { text } = describeRedeemFailure(gql('400:Date does not match routine'));
      expect(text).toContain('different day');
    });

    it('explains an already-checked task', () => {
      expect(describeRedeemFailure(gql('409:Task is already checked')).text)
        .toContain('already checked off');
    });

    it('tells the user a not-yet-passed task is free to tick', () => {
      const { text } = describeRedeemFailure(gql('400:Task has not passed yet'));
      expect(text).toContain('no points needed');
    });

    it('handles a vanished task and a vanished routine alike', () => {
      expect(describeRedeemFailure(gql('404:Task not found')).text).toContain('Refresh');
      expect(describeRedeemFailure(gql('404:Routine not found')).text).toContain('Refresh');
    });

    it('gives distinct text for each distinct refusal', () => {
      const texts = [
        '400:Redemption is only available for today',
        '400:Date does not match routine',
        '409:Task is already checked',
        '400:Task has not passed yet',
        '404:Task not found',
      ].map((m) => describeRedeemFailure(gql(m)).text);
      expect(new Set(texts).size).toBe(texts.length);
    });
  });

  describe('never advises a retry that cannot work', () => {
    it('drops "please try again" from deterministic refusals', () => {
      const deterministic = [
        '400:Redemption is only available for today',
        '400:Date does not match routine',
        '409:Task is already checked',
        '400:Task has not passed yet',
      ];
      deterministic.forEach((message) => {
        expect(describeRedeemFailure(gql(message)).text.toLowerCase())
          .not.toContain('try again');
      });
    });

    it('still offers a retry for an unrecognised server error', () => {
      expect(describeRedeemFailure(gql('500:Internal error')).text)
        .toContain('Please try again');
    });
  });

  describe('degrades safely', () => {
    it.each([undefined, null, '', 0])('handles %p without throwing', (input) => {
      const result = describeRedeemFailure(input);
      expect(result.title).toBeTruthy();
      expect(result.text).toBeTruthy();
    });
  });
});
