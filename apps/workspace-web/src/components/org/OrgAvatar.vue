<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<!-- A person's initials with their photo on top when they have one. -->
<script setup lang="ts">
import type { User } from '@dx/web-shared/types.ts'
import AvatarPhoto from '../AvatarPhoto.vue'
import { initialsOf } from '../../ui/people'

defineProps<{ user: User | null; large?: boolean }>()
</script>
<template>
  <span v-if="user" class="org-avatar" :class="{ lg: large }" :title="user.display_name" aria-hidden="true"
    >{{ initialsOf(user.display_name) }}<AvatarPhoto :url="user.avatar_url" :user-id="user.id"
  /></span>
  <span v-else class="org-avatar empty" :class="{ lg: large }" aria-hidden="true">?</span>
</template>
