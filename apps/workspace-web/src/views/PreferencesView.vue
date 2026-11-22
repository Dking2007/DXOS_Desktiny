<!-- SPDX-License-Identifier: Apache-2.0 -->
<!-- SPDX-FileCopyrightText: 2026 Desktiny contributors -->
<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Accessibility,
  Compass,
  Info,
  Languages,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Sun,
  Type,
  X,
} from 'lucide-vue-next'
import ModalDialog from '@dx/web-shared/components/ModalDialog.vue'
import {
  FONT_SCALES,
  LANGUAGES,
  formatDate,
  formatTime,
  preferences,
  resetPreferences,
  setPreference,
  type Preferences,
} from '../ui/preferences'
import { setSidebarCollapsed, sidebarPrefs } from '../ui/sidebar'
import { startTour } from '../ui/tour'
import { toast } from '../ui/toast'

const route = useRoute()
const router = useRouter()

const SECTIONS = [
  { id: 'giao-dien', label: 'Giao diện', icon: Palette },
  { id: 'chu', label: 'Chữ', icon: Type },
  { id: 'tro-nang', label: 'Trợ năng', icon: Accessibility },
  { id: 'ngon-ngu', label: 'Ngôn ngữ & định dạng', icon: Languages },
  { id: 'huong-dan', label: 'Hướng dẫn', icon: Compass },
]

const THEMES = [
  { value: 'light', label: 'Sáng', hint: 'Nền trắng, dễ đọc ban ngày', icon: Sun },
  { value: 'dark', label: 'Tối', hint: 'Dịu mắt khi làm việc buổi tối', icon: Moon },
  { value: 'system', label: 'Theo máy', hint: 'Đổi theo cài đặt của thiết bị', icon: Monitor },
] as const

const DENSITIES: { value: Preferences['density']; label: string; hint?: string }[] = [
  { value: 'default', label: 'Mặc định', hint: 'Theo tổ chức' },
  { value: 'comfortable', label: 'Thoải mái' },
  { value: 'compact', label: 'Gọn' },
]

// A sample moment so the format choices show what they do.
const SAMPLE = new Date(new Date().getFullYear(), 10, 22, 14, 30)

interface Choice {
  key: keyof Preferences
  label: string
  hint?: string
  options: { value: Preferences[keyof Preferences]; label: string; hint?: string }[]
}
const textChoices = computed<Choice[]>(() => [
  {
    key: 'fontScale',
    label: 'Cỡ chữ',
    hint: 'Phóng chữ trên mọi màn hình; có thể dùng cùng với phóng to của trình duyệt (Ctrl +).',
    options: FONT_SCALES.map((scale) => ({ value: scale.value, label: scale.label, hint: scale.hint })),
  },
  {
    key: 'fontFamily',
    label: 'Phông chữ',
    options: [
      { value: 'default', label: 'Mặc định', hint: 'Be Vietnam Pro và Source Sans 3' },
      { value: 'system', label: 'Phông của thiết bị', hint: 'Quen mắt như các ứng dụng khác trên máy' },
    ],
  },
  {
    key: 'lineSpacing',
    label: 'Giãn dòng',
    options: [
      { value: 'normal', label: 'Bình thường' },
      { value: 'relaxed', label: 'Rộng', hint: 'Đoạn văn dài dễ theo dõi hơn' },
    ],
  },
])

// What the device asks for, shown next to "Theo máy".
const motionQuery = typeof window !== 'undefined' ? window.matchMedia?.('(prefers-reduced-motion: reduce)') : undefined
const deviceReduces = ref(motionQuery?.matches ?? false)
const onMotionChange = (event: MediaQueryListEvent) => (deviceReduces.value = event.matches)
motionQuery?.addEventListener?.('change', onMotionChange)
onBeforeUnmount(() => motionQuery?.removeEventListener?.('change', onMotionChange))

const motionChoice = computed<Choice>(() => ({
  key: 'motion',
  label: 'Giảm chuyển động',
  hint: 'Tắt hiệu ứng chuyển cảnh, hoạt ảnh và cuộn mượt.',
  options: [
    {
      value: 'system',
      label: 'Theo máy',
      hint: deviceReduces.value ? 'Thiết bị đang giảm chuyển động' : 'Thiết bị đang để bình thường',
    },
    { value: 'reduce', label: 'Bật' },
    { value: 'full', label: 'Tắt' },
  ],
}))

const SWITCHES: { key: 'highContrast' | 'focusAlways' | 'underlineLinks'; label: string; hint: string }[] = [
  { key: 'highContrast', label: 'Tăng tương phản', hint: 'Chữ phụ đậm hơn, đường viền rõ hơn ở cả nền sáng và tối.' },
  {
    key: 'focusAlways',
    label: 'Luôn hiện viền focus',
    hint: 'Viền đậm quanh nút hoặc ô đang chọn, cả khi bấm chuột chứ không chỉ khi dùng phím Tab.',
  },
  { key: 'underlineLinks', label: 'Gạch chân liên kết', hint: 'Nhận ra liên kết trong đoạn văn mà không cần dựa vào màu.' },
]

const formatChoices = computed<Choice[]>(() => [
  {
    key: 'dateFormat',
    label: 'Định dạng ngày',
    options: [
      { value: 'dmy', label: 'Ngày/tháng/năm', hint: formatDate(SAMPLE, { ...preferences.value, dateFormat: 'dmy' }) },
      { value: 'ymd', label: 'Năm-tháng-ngày', hint: formatDate(SAMPLE, { ...preferences.value, dateFormat: 'ymd' }) },
    ],
  },
  {
    key: 'timeFormat',
    label: 'Định dạng giờ',
    options: [
      { value: '24h', label: '24 giờ', hint: formatTime(SAMPLE, { ...preferences.value, timeFormat: '24h' }) },
      { value: '12h', label: '12 giờ', hint: formatTime(SAMPLE, { ...preferences.value, timeFormat: '12h' }) },
    ],
  },
  {
    key: 'weekStart',
    label: 'Ngày đầu tuần',
    hint: 'Dùng cho lịch và ô chọn ngày.',
    options: [
      { value: 1, label: 'Thứ Hai' },
      { value: 0, label: 'Chủ nhật' },
    ],
  },
])

function choose(key: keyof Preferences, value: Preferences[keyof Preferences]) {
  setPreference(key, value as never)
}

// The sidebar remembers its own state (ui/sidebar.ts); this switch is that same choice.
const sidebarCollapsed = computed(() => sidebarPrefs.value.normal)

const moved = ref(route.query.moved === 'appearance')
function dismissMoved() {
  moved.value = false
  void router.replace({ query: {} })
}

const confirmReset = ref(false)
function reset() {
  resetPreferences()
  setSidebarCollapsed(false)
  confirmReset.value = false
  toast.success('Đã khôi phục cài đặt mặc định.')
}

const sampleDate = computed(() => `${formatDate(SAMPLE, preferences.value)} lúc ${formatTime(SAMPLE, preferences.value)}`)
</script>
<template>
  <header class="page-head compact">
    <h1 class="sr-only">Cài đặt cá nhân</h1>
  </header>
  <div v-if="moved" class="notice prefs-moved" role="status">
    <Info :size="18" aria-hidden="true" />
    <p>
      Cài đặt giao diện đã chuyển từ <strong>Thiết lập</strong> sang <strong>Cài đặt cá nhân</strong>: mỗi người tự
      chọn cho mình, không ảnh hưởng người khác.
    </p>
    <button class="icon-button" type="button" aria-label="Đóng thông báo" title="Đóng" @click="dismissMoved">
      <X :size="16" aria-hidden="true" />
    </button>
  </div>
  <div class="prefs-layout">
    <nav class="prefs-toc" aria-label="Nhóm cài đặt">
      <p class="prefs-intro muted">Chỉ áp dụng cho bạn trên trình duyệt này. Thay đổi có hiệu lực ngay.</p>
      <a v-for="section in SECTIONS" :key="section.id" :href="`#${section.id}`"
        ><component :is="section.icon" :size="16" aria-hidden="true" />{{ section.label }}</a
      >
    </nav>
    <div class="prefs-sections">
      <section id="giao-dien" class="card" aria-labelledby="giao-dien-title">
        <header class="card-header">
          <h2 id="giao-dien-title">Giao diện</h2>
        </header>
        <div class="card-body prefs-body">
          <fieldset class="prefs-row prefs-row-wide">
            <legend>Chế độ hiển thị</legend>
            <div class="theme-choices">
              <label
                v-for="choice in THEMES"
                :key="choice.value"
                class="theme-choice prefs-card"
                :class="[choice.value, { active: preferences.theme === choice.value }]"
              >
                <input
                  type="radio"
                  name="theme"
                  :value="choice.value"
                  :checked="preferences.theme === choice.value"
                  @change="choose('theme', choice.value)"
                />
                <span class="theme-preview" aria-hidden="true"><i /><i /><i /></span>
                <span class="theme-label"><component :is="choice.icon" :size="16" aria-hidden="true" />{{ choice.label }}</span>
                <small>{{ choice.hint }}</small>
              </label>
            </div>
            <small class="prefs-hint">Có thể đổi nhanh bằng nút mặt trời/mặt trăng ở thanh trên cùng.</small>
          </fieldset>
          <fieldset class="prefs-row">
            <legend>
              Mật độ hiển thị<small>Khoảng cách trong thẻ, bảng và danh sách.</small>
            </legend>
            <div class="prefs-options">
              <label
                v-for="option in DENSITIES"
                :key="option.value"
                :class="{ active: preferences.density === option.value }"
              >
                <input
                  type="radio"
                  name="density"
                  :checked="preferences.density === option.value"
                  @change="choose('density', option.value)"
                /><span>{{ option.label }}</span><small v-if="option.hint">{{ option.hint }}</small>
              </label>
            </div>
          </fieldset>
          <div class="prefs-row">
            <label class="prefs-label" for="pref-sidebar">
              Thu gọn thanh bên<small>Menu bên trái chỉ hiện biểu tượng trên màn hình rộng.</small>
            </label>
            <span class="switch">
              <input
                id="pref-sidebar"
                type="checkbox"
                role="switch"
                :checked="sidebarCollapsed"
                @change="setSidebarCollapsed(($event.target as HTMLInputElement).checked)"
              /><span />
            </span>
          </div>
        </div>
      </section>

      <section id="chu" class="card" aria-labelledby="chu-title">
        <header class="card-header">
          <h2 id="chu-title">Chữ</h2>
        </header>
        <div class="card-body prefs-body">
          <fieldset v-for="choice in textChoices" :key="choice.key" class="prefs-row">
            <legend>
              {{ choice.label }}<small v-if="choice.hint">{{ choice.hint }}</small>
            </legend>
            <div class="prefs-options">
              <label
                v-for="option in choice.options"
                :key="String(option.value)"
                :class="{ active: preferences[choice.key] === option.value }"
              >
                <input
                  type="radio"
                  :name="choice.key"
                  :checked="preferences[choice.key] === option.value"
                  @change="choose(choice.key, option.value)"
                /><span>{{ option.label }}</span><small v-if="option.hint">{{ option.hint }}</small>
              </label>
            </div>
          </fieldset>
          <figure class="prefs-preview" aria-label="Xem trước chữ">
            <figcaption class="eyebrow">Xem trước</figcaption>
            <h3>Đề nghị mua sắm thiết bị văn phòng</h3>
            <p>
              Phòng Hành chính đề nghị bổ sung 12 màn hình cho bộ phận một cửa. Hồ sơ đã có ý kiến của Kế toán và đang
              chờ Ban giám đốc phê duyệt. <a href="#chu" @click.prevent>Xem chi tiết hồ sơ</a>.
            </p>
            <small class="muted">Cập nhật {{ sampleDate }}</small>
          </figure>
        </div>
      </section>

      <section id="tro-nang" class="card" aria-labelledby="tro-nang-title">
        <header class="card-header">
          <h2 id="tro-nang-title">Trợ năng</h2>
        </header>
        <div class="card-body prefs-body">
          <fieldset class="prefs-row">
            <legend>
              {{ motionChoice.label }}<small>{{ motionChoice.hint }}</small>
            </legend>
            <div class="prefs-options">
              <label
                v-for="option in motionChoice.options"
                :key="String(option.value)"
                :class="{ active: preferences.motion === option.value }"
              >
                <input
                  type="radio"
                  name="motion"
                  :checked="preferences.motion === option.value"
                  @change="choose('motion', option.value)"
                /><span>{{ option.label }}</span><small v-if="option.hint">{{ option.hint }}</small>
              </label>
            </div>
          </fieldset>
          <div v-for="item in SWITCHES" :key="item.key" class="prefs-row">
            <label class="prefs-label" :for="`pref-${item.key}`">
              {{ item.label }}<small>{{ item.hint }}</small>
            </label>
            <span class="switch">
              <input
                :id="`pref-${item.key}`"
                type="checkbox"
                role="switch"
                :checked="preferences[item.key]"
                @change="choose(item.key, ($event.target as HTMLInputElement).checked)"
              /><span />
            </span>
          </div>
        </div>
      </section>

      <section id="ngon-ngu" class="card" aria-labelledby="ngon-ngu-title">
        <header class="card-header">
          <h2 id="ngon-ngu-title">Ngôn ngữ &amp; định dạng</h2>
        </header>
        <div class="card-body prefs-body">
          <div class="prefs-row">
            <label class="prefs-label" for="pref-language">
              Ngôn ngữ<small>Hiện giao diện chỉ có tiếng Việt.</small>
            </label>
            <select
              id="pref-language"
              class="prefs-select"
              :value="preferences.language"
              :disabled="LANGUAGES.length < 2"
              @change="choose('language', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="language in LANGUAGES" :key="language.code" :value="language.code">
                {{ language.label }}
              </option>
            </select>
          </div>
          <fieldset v-for="choice in formatChoices" :key="choice.key" class="prefs-row">
            <legend>
              {{ choice.label }}<small v-if="choice.hint">{{ choice.hint }}</small>
            </legend>
            <div class="prefs-options">
              <label
                v-for="option in choice.options"
                :key="String(option.value)"
                :class="{ active: preferences[choice.key] === option.value }"
              >
                <input
                  type="radio"
                  :name="choice.key"
                  :checked="preferences[choice.key] === option.value"
                  @change="choose(choice.key, option.value)"
                /><span>{{ option.label }}</span><small v-if="option.hint">{{ option.hint }}</small>
              </label>
            </div>
          </fieldset>
        </div>
      </section>

      <section id="huong-dan" class="card" aria-labelledby="huong-dan-title">
        <header class="card-header">
          <h2 id="huong-dan-title">Hướng dẫn &amp; khôi phục</h2>
        </header>
        <div class="card-body prefs-body">
          <div class="prefs-row">
            <p class="prefs-label">
              Làm quen với hệ thống<small
                >Xem lại các bước giới thiệu: menu, nút Tạo mới, tìm nhanh bằng Ctrl + K và thông báo.</small
              >
            </p>
            <button class="button secondary" type="button" @click="startTour">
              <Compass :size="16" aria-hidden="true" />Xem lại hướng dẫn
            </button>
          </div>
          <div class="prefs-row">
            <p class="prefs-label">
              Khôi phục mặc định<small>Đưa mọi cài đặt trên trang này về như ban đầu.</small>
            </p>
            <button class="button secondary" type="button" @click="confirmReset = true">
              <RotateCcw :size="16" aria-hidden="true" />Khôi phục mặc định
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
  <ModalDialog v-if="confirmReset" title="Khôi phục cài đặt mặc định?" @close="confirmReset = false">
    <p class="prefs-confirm">
      Giao diện, chữ, trợ năng, ngôn ngữ và định dạng sẽ trở về mặc định. Dữ liệu công việc không bị ảnh hưởng.
    </p>
    <template #footer>
      <button class="button secondary" type="button" @click="confirmReset = false">Hủy</button>
      <button class="button danger" type="button" @click="reset">Khôi phục</button>
    </template>
  </ModalDialog>
</template>
<style scoped>
.prefs-moved {
  align-items: center;
  margin-bottom: var(--space-4);
}
.prefs-moved p {
  flex: 1;
  margin: 0;
}
.prefs-moved .icon-button {
  width: 32px;
  height: 32px;
  color: inherit;
}
.prefs-layout {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: var(--space-6);
  align-items: start;
}
.prefs-toc {
  position: sticky;
  top: var(--space-4);
  display: grid;
  gap: 2px;
}
.prefs-intro {
  margin: 0 0 var(--space-3);
  font-size: 0.875rem;
  line-height: 1.5;
}
.prefs-toc a {
  display: flex;
  align-items: center;
  gap: var(--gap-icon);
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-control);
  color: var(--ink-2);
  font-size: 0.9375rem;
}
.prefs-toc a:hover {
  background: var(--surface-3);
  text-decoration: none;
}
.prefs-sections {
  display: grid;
  gap: var(--space-6);
  min-width: 0;
}
.prefs-sections > .card {
  scroll-margin-top: var(--space-4);
}
.card-header h2 {
  font-size: 1.125rem;
}
.prefs-body {
  display: grid;
  padding-block: var(--space-2);
}
.prefs-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-3) var(--space-6);
  align-items: center;
  padding-block: var(--space-4);
  border-top: 1px solid var(--border-soft);
}
.prefs-row:first-child {
  border-top: 0;
}
/* A fieldset's legend does not take part in grid layout; float it into the first column instead. */
fieldset.prefs-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
fieldset.prefs-row > legend {
  float: left;
}
.prefs-row-wide {
  display: grid !important;
  grid-template-columns: minmax(0, 1fr);
}
.prefs-row legend,
.prefs-label {
  display: grid;
  gap: 2px;
  margin: 0;
  font-weight: 600;
  font-size: 0.9375rem;
  line-height: 1.4;
  color: var(--navy);
}
.prefs-row legend small,
.prefs-label small,
.prefs-hint {
  font-weight: 400;
  font-size: 0.8125rem;
  line-height: 1.45;
  color: var(--muted);
}
.prefs-row-wide legend {
  margin-bottom: var(--space-3);
}
.prefs-hint {
  display: block;
  margin-top: var(--space-3);
}
/* Theme cards and option chips are native radios: arrow keys move between them. */
.prefs-card input,
.prefs-options input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
  pointer-events: none;
}
.prefs-card {
  position: relative;
  cursor: pointer;
}
.prefs-card:hover:not(.active) {
  border-color: var(--border-strong);
}
.prefs-card:has(input:focus-visible),
.prefs-options label:has(input:focus-visible) {
  outline: 2px solid var(--focus);
  outline-offset: 2px;
}
.theme-choice small {
  font-size: 0.8125rem;
}
.prefs-options {
  display: inline-flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.prefs-options label {
  position: relative;
  display: grid;
  align-content: center;
  justify-items: center;
  gap: 0;
  min-width: 88px;
  min-height: var(--control-h);
  padding: 6px var(--space-3);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-control);
  background: var(--surface);
  color: var(--ink-2);
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}
.prefs-options label:hover:not(.active) {
  border-color: var(--muted);
}
.prefs-options label.active {
  border-color: var(--teal);
  background: var(--teal-soft);
  color: var(--teal-strong);
  box-shadow: inset 0 0 0 1px var(--teal);
}
.prefs-options small {
  font-weight: 400;
  font-size: 0.75rem;
  color: var(--muted);
}
.prefs-options label.active small {
  color: inherit;
}
.prefs-select {
  width: auto;
  min-width: 180px;
}
.prefs-preview {
  margin: var(--space-2) 0 var(--space-4);
  padding: var(--space-4) var(--space-5);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius);
  background: var(--surface-2);
}
.prefs-preview h3 {
  font-size: 1.0625rem;
  margin-bottom: var(--space-2);
}
.prefs-preview p {
  margin: 0 0 var(--space-2);
  color: var(--ink-2);
  font-size: 0.9375rem;
  line-height: 1.55;
}
.prefs-preview small {
  font-size: 0.8125rem;
}
.prefs-confirm {
  margin: 0;
  line-height: 1.5;
}
@media (max-width: 900px) {
  .prefs-layout {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-4);
  }
  /* The section list becomes a row of shortcuts that scrolls sideways on its own. */
  .prefs-toc {
    position: static;
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    scrollbar-width: none;
  }
  .prefs-intro {
    display: none;
  }
  .prefs-toc a {
    flex: none;
    border: 1px solid var(--border);
    background: var(--surface);
    min-height: 36px;
  }
}
@media (max-width: 640px) {
  .prefs-row,
  fieldset.prefs-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
  }
  .prefs-row .switch {
    justify-self: start;
  }
  .prefs-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
    align-items: stretch;
  }
  .prefs-select,
  .prefs-row > .button {
    width: 100%;
  }
}
</style>
