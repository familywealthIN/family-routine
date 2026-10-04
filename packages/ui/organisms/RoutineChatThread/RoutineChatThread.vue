<template>
  <!--
    The routine's conversation. Bubbles, centred event pills, embedded live
    checkbox rows, "break it down" proposals with an Add-all button, and
    quick-reply chips under the last message only.

    Presentational — the container owns persistence and the model call.
  -->
  <div class="rn-chat" data-testid="routine-chat-thread">
    <div class="rn-chat__divider">{{ dividerText }}</div>

    <div
      v-for="(message, index) in messages"
      :key="message.id"
      class="rn-chat__row"
      :style="{ justifyContent: rowAlign(message) }"
    >
      <!--
        "Before you start" — pinned first in the thread by the container as a
        `kind: 'brief'` message, so it scrolls and orders with the conversation
        instead of being a second column above it.
      -->
      <routine-brief-card
        v-if="message.kind === 'brief'"
        :blocks="message.blocks || []"
        :subline="message.subline || ''"
        :open="message.open !== false"
        @toggle="$emit('toggle-brief')"
        @add-step="$emit('add-brief-step', $event)"
      />

      <!-- System event pill -->
      <div
        v-else-if="message.kind === 'event'"
        class="rn-chat__event"
        :style="eventStyle(message)"
      >
        <i v-if="message.icon" class="rn-mi rn-chat__event-icon">{{ message.icon }}</i>
        {{ message.text }}
      </div>

      <!-- Bubble -->
      <div v-else class="rn-chat__bubble" :style="bubbleStyle(message)">
        <div class="rn-chat__text">{{ message.text }}</div>

        <!-- Live checkbox rows for goal items the message refers to -->
        <div v-if="itemsOf(message).length" class="rn-chat__items">
          <div
            v-for="item in itemsOf(message)"
            :key="`${message.id}-${item.id}`"
            class="rn-chat__item"
            @click="$emit('toggle-item', item)"
          >
            <i
              class="rn-mi rn-chat__item-box"
              :style="{ color: item.isComplete ? '#288bd5' : 'rgba(0,0,0,.54)' }"
            >{{ item.isComplete ? 'check_box' : 'check_box_outline_blank' }}</i>
            <span
              class="rn-chat__item-text"
              :style="{
                textDecoration: item.isComplete ? 'line-through' : 'none',
                color: item.isComplete ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.87)',
              }"
            >{{ item.body }}</span>
          </div>
        </div>

        <!-- Proposals from a break-down turn -->
        <!--
          With `replaceAddedProposals`, an accepted bubble shows only the live
          rows it created (above) — listing the same items again as "added"
          proposals would show each one twice. If none of those rows resolve
          (deleted, or not loaded by the host) the proposals still show, so the
          bubble never goes blank.
        -->
        <div v-if="showProposals(message)" class="rn-chat__proposals">
          <div
            v-for="(proposal, i) in message.proposals"
            :key="`${message.id}-p${i}`"
            class="rn-chat__proposal"
          >
            <i
              class="rn-mi rn-chat__proposal-icon"
              :style="{ color: message.added ? '#4CAF50' : '#288bd5' }"
            >{{ message.added ? 'check_circle' : 'add_circle_outline' }}</i>
            <span>{{ proposal }}</span>
          </div>
          <!--
            The bulk accept. Its label travels ON THE MESSAGE so the host names
            what it is adding — "Add all to checklist" on a routine, "Add 3 week
            goals" on a year goal — without the thread knowing which host it is
            serving.
          -->
          <button
            v-if="!message.added"
            type="button"
            class="rn-chat__add-all"
            data-testid="chat-add-all"
            @click="$emit('add-proposals', message)"
          >{{ message.addAllLabel || 'Add all to checklist' }}</button>
        </div>

        <!-- Quick replies, last message only -->
        <div
          v-if="quickReplies.length && index === messages.length - 1 && !typing && message.from !== 'me'"
          class="rn-chat__chips"
        >
          <button
            v-for="chip in quickReplies"
            :key="chip"
            type="button"
            class="rn-chat__chip"
            @click="$emit('quick-reply', chip)"
          >{{ chip }}</button>
        </div>
      </div>
    </div>

    <div v-if="typing" class="rn-chat__row" style="justify-content: flex-start">
      <div class="rn-chat__typing" data-testid="chat-typing">
        <span class="rn-chat__typing-dot"></span>
        <span class="rn-chat__typing-dot" style="animation-delay: .2s"></span>
        <span class="rn-chat__typing-dot" style="animation-delay: .4s"></span>
      </div>
    </div>
  </div>
</template>

<script>
import RoutineBriefCard from '../RoutineBriefCard/RoutineBriefCard.vue';

const TONES = {
  green: { color: '#2e7d32', bg: 'rgba(76,175,80,.12)' },
  blue: { color: '#1f6fab', bg: 'rgba(40,139,213,.1)' },
  orange: { color: '#e65100', bg: 'rgba(255,152,0,.14)' },
};

export default {
  name: 'OrganismRoutineChatThread',
  components: { RoutineBriefCard },
  props: {
    /**
     * [{ id, from, kind: 'text'|'event'|'brief', text, items: [goalItemId],
     *    proposals: [String], addAllLabel, added, tone, icon }]
     *
     * `from` is only ever compared against `'me'`, so any host's name for the
     * other side works ('routine' on Home, 'goal' on Year Goals).
     *
     * A `brief` message carries `{ blocks, subline, open }` instead of text —
     * see RoutineBriefCard.
     */
    messages: { type: Array, default: () => [] },
    /** Goal items on this routine, so `items` ids can render as live rows. */
    goalItems: { type: Array, default: () => [] },
    routineName: { type: String, default: '' },
    /**
     * The thread's own caption. Blank keeps the routine host's wording
     * ("CHAT WITH START WORK"); the year-goal host passes "CHAT WITH THIS GOAL".
     * A prop rather than a second component: the thread is host-agnostic
     * (docs/redesign/chassis.md § "Chat has two hosts") and the caption was the
     * only thing in it that assumed a routine.
     */
    heading: { type: String, default: '' },
    typing: { type: Boolean, default: false },
    /**
     * Once a proposal bubble is `added` and its created items are attached,
     * show those items as checkbox rows INSTEAD of the green "added" proposal
     * list. Off by default, which keeps Home's routine thread exactly as it was;
     * the year-goal host turns it on.
     */
    replaceAddedProposals: { type: Boolean, default: false },
    quickReplies: { type: Array, default: () => [] },
  },
  computed: {
    dividerText() {
      if (this.heading) return this.heading;
      return `CHAT WITH ${(this.routineName || 'this routine').toUpperCase()}`;
    },
    itemsById() {
      const map = {};
      (this.goalItems || []).forEach((item) => {
        if (item && item.id) map[String(item.id)] = item;
      });
      return map;
    },
  },
  methods: {
    rowAlign(message) {
      // The brief is a card, not a bubble: it takes the thread's full width.
      if (message.kind === 'brief') return 'stretch';
      if (message.kind === 'event') return 'center';
      return message.from === 'me' ? 'flex-end' : 'flex-start';
    },
    /**
     * Only resolve ids that are still real goal items — an id the user has
     * since deleted must drop out of the bubble rather than render blank.
     */
    itemsOf(message) {
      return (message.items || [])
        .map((id) => this.itemsById[String(id)])
        .filter(Boolean);
    },
    showProposals(message) {
      if (!message.proposals || !message.proposals.length) return false;
      if (this.replaceAddedProposals && message.added && this.itemsOf(message).length) return false;
      return true;
    },
    bubbleStyle(message) {
      const me = message.from === 'me';
      return {
        background: me ? '#288bd5' : '#f1f3f5',
        color: me ? '#fff' : 'rgba(0,0,0,.87)',
        borderRadius: me ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      };
    },
    eventStyle(message) {
      const tone = TONES[message.tone] || TONES.green;
      return { color: tone.color, background: tone.bg };
    },
  },
};
</script>

<style>
.rn-chat {
  padding: 4px 0 8px;
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
}

.rn-chat__divider {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: .6px;
  color: rgba(0, 0, 0, .38);
  text-align: center;
  padding: 10px 0 6px;
}

.rn-chat__row {
  display: flex;
  margin-bottom: 8px;
}

.rn-chat__bubble {
  max-width: 86%;
  padding: 8px 12px;
  font-size: 14px;
  line-height: 1.4;
}

.rn-chat__text {
  white-space: pre-wrap;
  word-break: break-word;
}

.rn-chat__event {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 92%;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  text-align: center;
}

.rn-chat__event-icon {
  font-size: 14px;
}

.rn-chat__items {
  margin-top: 8px;
}

.rn-chat__item {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 8px;
  margin-bottom: 4px;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
}

.rn-chat__item-box {
  font-size: 20px;
  flex-shrink: 0;
}

.rn-chat__item-text {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rn-chat__proposals {
  margin-top: 8px;
}

.rn-chat__proposal {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  padding: 3px 0;
}

.rn-chat__proposal-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.rn-chat__add-all {
  margin-top: 6px;
  height: 30px;
  padding: 0 12px;
  border: 0;
  border-radius: 999px;
  background: #288bd5;
  color: #fff;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.rn-chat__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.rn-chat__chip {
  height: 30px;
  padding: 0 12px;
  border: 1px solid rgba(40, 139, 213, .45);
  border-radius: 999px;
  background: #fff;
  color: #1f6fab;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.rn-chat__typing {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 12px;
  border-radius: 16px 16px 16px 4px;
  background: #f1f3f5;
}

.rn-chat__typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(0, 0, 0, .35);
  animation: rn-pulse 1.4s ease-in-out infinite;
}
</style>
