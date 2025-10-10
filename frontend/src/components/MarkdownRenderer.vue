<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  text: {
    type: String,
    required: true,
  },
  fontSize: {
    type: String,
    default: 'medium',
  },
})

const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
})

const renderedHtml = computed(() => {
  return md.render(props.text || '')
})

const fontSizeClass = computed(() => {
  switch (props.fontSize) {
    case 'small':
      return 'text-sm'
    case 'large':
      return 'text-lg'
    case 'medium':
    default:
      return 'text-base'
  }
})
</script>

<template>
  <div
    class="markdown-content"
    :class="[fontSizeClass]"
    v-html="renderedHtml"
  />
</template>

<style scoped>
/* GitHub-style markdown rendering */
.markdown-content {
  color: #1f2328;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
  line-height: 1.6;
}

/* Headings */
.markdown-content :deep(h1) {
  font-size: 2em !important;
  font-weight: 600 !important;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #d0d7de;
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-content :deep(h1:first-child) {
  margin-top: 0;
}

.markdown-content :deep(h2) {
  font-size: 1.5em !important;
  font-weight: 600 !important;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #d0d7de;
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-content :deep(h3) {
  font-size: 1.25em !important;
  font-weight: 600 !important;
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-content :deep(h4) {
  font-size: 1em !important;
  font-weight: 600 !important;
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-content :deep(h5) {
  font-size: 0.875em !important;
  font-weight: 600 !important;
  margin-top: 24px;
  margin-bottom: 16px;
}

.markdown-content :deep(h6) {
  font-size: 0.85em !important;
  font-weight: 600 !important;
  color: #656d76;
  margin-top: 24px;
  margin-bottom: 16px;
}

/* Paragraphs */
.markdown-content :deep(p) {
  margin-top: 0;
  margin-bottom: 16px;
}

/* Lists */
.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin-top: 0;
  margin-bottom: 16px;
  padding-left: 2em;
}

.markdown-content :deep(ul) {
  list-style-type: disc;
}

.markdown-content :deep(ul ul) {
  list-style-type: circle;
}

.markdown-content :deep(ol) {
  list-style-type: decimal;
}

.markdown-content :deep(li) {
  margin-top: 0.25em;
}

.markdown-content :deep(li + li) {
  margin-top: 0.25em;
}

.markdown-content :deep(li > p) {
  margin-top: 16px;
}

/* Text formatting */
.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
}

.markdown-content :deep(del) {
  text-decoration: line-through;
}

/* Links */
.markdown-content :deep(a) {
  color: #0969da;
  text-decoration: none;
}

.markdown-content :deep(a:hover) {
  text-decoration: underline;
}

/* Inline code */
.markdown-content :deep(code) {
  background-color: #afb8c133;
  padding: 0.2em 0.4em;
  border-radius: 6px;
  font-size: 85%;
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace;
}

/* Code blocks */
.markdown-content :deep(pre) {
  background-color: #f6f8fa;
  border-radius: 6px;
  padding: 16px;
  overflow: auto;
  font-size: 85%;
  line-height: 1.45;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  font-size: 100%;
  color: #1f2328;
}

/* Blockquotes */
.markdown-content :deep(blockquote) {
  padding: 0 1em;
  color: #656d76;
  border-left: 0.25em solid #d0d7de;
  margin-top: 0;
  margin-bottom: 16px;
  margin-left: 0;
  margin-right: 0;
}

.markdown-content :deep(blockquote > :first-child) {
  margin-top: 0;
}

.markdown-content :deep(blockquote > :last-child) {
  margin-bottom: 0;
}

/* Horizontal rules */
.markdown-content :deep(hr) {
  height: 0.25em;
  padding: 0;
  margin: 24px 0;
  background-color: #d0d7de;
  border: 0;
}

/* Tables */
.markdown-content :deep(table) {
  border-spacing: 0;
  border-collapse: collapse;
  display: block;
  width: max-content;
  max-width: 100%;
  overflow: auto;
  margin-top: 0;
  margin-bottom: 16px;
}

.markdown-content :deep(table tr) {
  background-color: #ffffff;
  border-top: 1px solid #d0d7de;
}

.markdown-content :deep(table tr:nth-child(2n)) {
  background-color: #f6f8fa;
}

.markdown-content :deep(table th),
.markdown-content :deep(table td) {
  padding: 6px 13px;
  border: 1px solid #d0d7de;
}

.markdown-content :deep(table th) {
  font-weight: 600;
  background-color: #f6f8fa;
}

/* Images */
.markdown-content :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
}

/* Task lists */
.markdown-content :deep(input[type="checkbox"]) {
  margin-right: 0.5em;
}
</style>
