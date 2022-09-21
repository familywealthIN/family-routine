<template>
  <div v-if="editor">
    <button @click="getJSON">
      JSON
    </button>
    <editor-content :editor="editor" />
  </div>
</template>

<script>
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import TaskItem from '@tiptap/extension-task-item';
import TaskList from '@tiptap/extension-task-list';
import Text from '@tiptap/extension-text';
import { Editor, EditorContent } from '@tiptap/vue-2';

export default {
  components: {
    EditorContent,
  },

  data() {
    return {
      editor: null,
    };
  },
  methods: {
    getJSON() {
      const json = this.editor.getJSON();
      console.log(json.content[0].content[0].attrs.__ob__.dep.id);
    },
  },
  mounted() {
    this.editor = new Editor({
      extensions: [
        Document,
        Paragraph,
        Text,
        TaskList,
        TaskItem.configure({
          nested: true,
          onReadOnlyChecked: (node, checked) => {
            console.log(node, checked);
          },
        }),
      ],
      editorProps: {
        handleDOMEvents: {
          keydown: (view, event) => {
            if (event.key === 'Enter') {
              this.getJSON();
              console.log(this.editor.view.state.selection.$head.parent.attrs);
              this.editor.getAttributes(this.editor.view.state.selection.$head.parent);
            }
            if (event.key === 'Tab') {
              // TODO: find the nesting level
              // event.preventDefault();
            }
            return false;
          },
          change: (view, event) => {
            console.log('change', view);
          },
        },
      },
      content: {
        type: 'doc',
        content: [{ type: 'taskList', content: [{ type: 'taskItem', attrs: { checked: true, blockId: "some id" }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A list item edit' }] }] }, { type: 'taskItem', attrs: { checked: false }, content: [{ type: 'paragraph', content: [{ type: 'text', text: 'And another one' }] }] }] }],
      },
    });

    this.editor.on('selectionUpdate', () => {
      if (this.editor.view.state.selection.$head.parent.content.content.length) {
        console.log(this.editor.view.state.selection.$head.parent.textContent);
        // console.log(this.editor.view.state.selection.$head.parent.content.content[0].text);
      }
    });

    this.editor.commands.updateAttributes('tasklist', { level: 1 });
  },

  beforeUnmount() {
    this.editor.destroy();
  },
};
</script>

<style>
ul[data-type="taskList"] {
  list-style: none;
  padding: 0;
}

ul[data-type="taskList"] li {
  display: flex;
  gap: 1rem;
}

ul[data-type="taskList"] p {
  margin: 0;
}
</style>
