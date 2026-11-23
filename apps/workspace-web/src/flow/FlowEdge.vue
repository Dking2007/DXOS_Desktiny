<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<script setup lang="ts">
import { computed, inject } from 'vue'
import { BaseEdge, EdgeLabelRenderer, getBezierPath, getSmoothStepPath } from '@vue-flow/core'
import type { EdgeProps } from '@vue-flow/core'
import { Plus } from 'lucide-vue-next'
import { FLOW_CONTEXT } from './context'

/** A connection drawn like Vue Flow's own, with a "+" in the middle to insert a step there. */
const props = defineProps<EdgeProps & { curve?: 'smoothstep' | 'bezier' }>()
const context = inject(FLOW_CONTEXT)!
const geometry = computed(() => {
  const points = {
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    sourcePosition: props.sourcePosition,
    targetX: props.targetX,
    targetY: props.targetY,
    targetPosition: props.targetPosition,
  }
  return props.curve === 'bezier' ? getBezierPath(points) : getSmoothStepPath(points)
})
const visible = computed(() => props.selected || context.hoveredEdge?.value === props.id)
function insert(event: MouseEvent) {
  const box = (event.currentTarget as HTMLElement).getBoundingClientRect()
  context.insertOnEdge?.(props.id, { x: box.left + box.width / 2, y: box.top + box.height / 2 })
}
</script>
<template>
  <BaseEdge :id="id" :path="geometry[0]" :style="style" :marker-end="markerEnd" :interaction-width="24" />
  <EdgeLabelRenderer v-if="context.insertOnEdge && !context.readonly && !context.overlay.value">
    <div
      class="edge-insert nodrag nopan"
      :class="{ visible }"
      :style="{ transform: `translate(-50%, -50%) translate(${geometry[1]}px, ${geometry[2]}px)` }"
      @mouseenter="context.hoveredEdge && (context.hoveredEdge.value = id)"
      @mouseleave="context.hoveredEdge && (context.hoveredEdge.value = null)"
    >
      <button type="button" aria-label="Chèn bước vào đường nối này" title="Chèn bước vào đây" @click.stop="insert">
        <Plus :size="14" />
      </button>
    </div>
  </EdgeLabelRenderer>
</template>
