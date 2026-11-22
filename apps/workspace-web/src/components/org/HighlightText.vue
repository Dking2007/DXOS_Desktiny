<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<!-- Text with the part matching the search marked, ignoring accents ("ky thuat" marks "Kỹ thuật"). -->
<script setup lang="ts">
import { computed } from 'vue'
import { highlightParts } from './orgTree'

const props = defineProps<{ text: string; query?: string }>()
const parts = computed(() => highlightParts(props.text, props.query ?? ''))
</script>
<template>
  <template v-for="(part, index) in parts" :key="index"
    ><mark v-if="part.hit" class="org-mark">{{ part.text }}</mark
    ><template v-else>{{ part.text }}</template></template
  >
</template>
