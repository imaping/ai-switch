<template>
  <ClientOnly>
    <UPopover :popper="{ placement: 'bottom-end', strategy: 'fixed' }">
      <UButton
        icon="i-lucide-palette"
        color="neutral"
        variant="ghost"
        aria-label="主题设置"
      />

      <template #content>
        <div class="w-72 space-y-4 p-4">
          <!-- Primary colors -->
          <section>
            <p class="mb-2 text-xs font-medium text-muted">Primary</p>

            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="item in primaryOptions"
                :key="item.value"
                type="button"
                :class="[
                  'flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition-colors',
                  primary === item.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-200'
                    : 'border-transparent bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800'
                ]"
                @click="setPrimary(item.value)"
              >
                <span
                  :class="[
                    'inline-flex size-3 rounded-full',
                    item.dotClass
                  ]"
                />
                <span>{{ item.label }}</span>
              </button>
            </div>
          </section>

          <!-- Neutral colors -->
          <section>
            <p class="mb-2 text-xs font-medium text-muted">Neutral</p>

            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="item in neutralOptions"
                :key="item.value"
                type="button"
                :class="[
                  'flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition-colors',
                  neutral === item.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-200'
                    : 'border-transparent bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800'
                ]"
                @click="setNeutral(item.value)"
              >
                <span
                  :class="[
                    'inline-flex size-3 rounded-full',
                    item.dotClass
                  ]"
                />
                <span>{{ item.label }}</span>
              </button>
            </div>
          </section>

          <!-- Radius -->
          <section>
            <div class="mb-2 flex items-center justify-between">
              <p class="text-xs font-medium text-muted">Radius</p>
            </div>

            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="item in radiusOptions"
                :key="item.value"
                type="button"
                :class="[
                  'flex items-center justify-center rounded-lg border px-2 py-1.5 text-xs transition-colors',
                  radius === item.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-200'
                    : 'border-transparent bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800'
                ]"
                @click="setRadius(item.value)"
              >
                {{ item.label }}
              </button>
            </div>
          </section>

          <!-- Theme -->
          <section>
            <p class="mb-2 text-xs font-medium text-muted">Theme</p>

            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="item in themeOptions"
                :key="item.value"
                type="button"
                :class="[
                  'flex items-center justify-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition-colors',
                  theme === item.value
                    ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-950/60 dark:text-primary-200'
                    : 'border-transparent bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800'
                ]"
                @click="setTheme(item.value)"
              >
                <UIcon :name="item.icon" class="size-4" />
                <span>{{ item.label }}</span>
              </button>
            </div>
          </section>
        </div>
      </template>
    </UPopover>
  </ClientOnly>
</template>

<script setup lang="ts">
const appConfig = useAppConfig()
const colorMode = useColorMode()

type PrimaryColor =
  | 'black'
  | 'red'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'lime'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'sky'
  | 'blue'
  | 'indigo'
  | 'violet'
  | 'purple'
  | 'fuchsia'
  | 'pink'
  | 'rose'

type NeutralColor = 'slate' | 'gray' | 'zinc' | 'neutral' | 'stone'

type RadiusValue = '0' | '0.125' | '0.25' | '0.375' | '0.5'

interface ColorOption<T extends string> {
  label: string
  value: T
  dotClass: string
}

interface RadiusOption {
  label: string
  value: RadiusValue
}

interface ThemeOption {
  label: string
  value: 'light' | 'dark' | 'system'
  icon: string
}

const primary = ref<PrimaryColor>('cyan')
const neutral = ref<NeutralColor>('slate')
const radius = ref<RadiusValue>('0.375')

const theme = computed<'light' | 'dark' | 'system'>({
  get() {
    // 当 preference 为 null 时，使用 system
    return (colorMode.preference || 'system') as 'light' | 'dark' | 'system'
  },
  set(value) {
    colorMode.preference = value
  }
})

const primaryOptions: ColorOption<PrimaryColor>[] = [
  { label: 'Black', value: 'black', dotClass: 'bg-black' },
  { label: 'Red', value: 'red', dotClass: 'bg-red-500' },
  { label: 'Orange', value: 'orange', dotClass: 'bg-orange-500' },
  { label: 'Amber', value: 'amber', dotClass: 'bg-amber-500' },
  { label: 'Yellow', value: 'yellow', dotClass: 'bg-yellow-400' },
  { label: 'Lime', value: 'lime', dotClass: 'bg-lime-500' },
  { label: 'Green', value: 'green', dotClass: 'bg-green-500' },
  { label: 'Emerald', value: 'emerald', dotClass: 'bg-emerald-500' },
  { label: 'Teal', value: 'teal', dotClass: 'bg-teal-500' },
  { label: 'Cyan', value: 'cyan', dotClass: 'bg-cyan-500' },
  { label: 'Sky', value: 'sky', dotClass: 'bg-sky-500' },
  { label: 'Blue', value: 'blue', dotClass: 'bg-blue-500' },
  { label: 'Indigo', value: 'indigo', dotClass: 'bg-indigo-500' },
  { label: 'Violet', value: 'violet', dotClass: 'bg-violet-500' },
  { label: 'Purple', value: 'purple', dotClass: 'bg-purple-500' },
  { label: 'Fuchsia', value: 'fuchsia', dotClass: 'bg-fuchsia-500' },
  { label: 'Pink', value: 'pink', dotClass: 'bg-pink-500' },
  { label: 'Rose', value: 'rose', dotClass: 'bg-rose-500' }
]

const neutralOptions: ColorOption<NeutralColor>[] = [
  { label: 'Slate', value: 'slate', dotClass: 'bg-slate-500' },
  { label: 'Gray', value: 'gray', dotClass: 'bg-gray-500' },
  { label: 'Zinc', value: 'zinc', dotClass: 'bg-zinc-500' },
  { label: 'Neutral', value: 'neutral', dotClass: 'bg-neutral-500' },
  { label: 'Stone', value: 'stone', dotClass: 'bg-stone-500' }
]

const radiusOptions: RadiusOption[] = [
  { label: '0', value: '0' },
  { label: '0.125', value: '0.125' },
  { label: '0.25', value: '0.25' },
  { label: '0.375', value: '0.375' },
  { label: '0.5', value: '0.5' }
]

const themeOptions: ThemeOption[] = [
  { label: 'Light', value: 'light', icon: 'i-lucide-sun' },
  { label: 'Dark', value: 'dark', icon: 'i-lucide-moon' },
  { label: 'System', value: 'system', icon: 'i-lucide-monitor' }
]

const setHtmlDataset = (key: 'primary' | 'neutral' | 'radius', value: string) => {
  if (typeof document === 'undefined')
    return

  document.documentElement.dataset[key] = value
}

const setPrimary = (value: PrimaryColor) => {
  primary.value = value
  setHtmlDataset('primary', value)

  // 同步到 appConfig，便于组件内部依赖 ui.colors 的情况
  if (!appConfig.ui)
    appConfig.ui = {} as any
  if (!appConfig.ui.colors)
    appConfig.ui.colors = {} as any

  appConfig.ui.colors.primary = value
}

const setNeutral = (value: NeutralColor) => {
  neutral.value = value
  setHtmlDataset('neutral', value)

  if (!appConfig.ui)
    appConfig.ui = {} as any
  if (!appConfig.ui.colors)
    appConfig.ui.colors = {} as any

  appConfig.ui.colors.neutral = value
}

const setRadius = (value: RadiusValue) => {
  radius.value = value
  setHtmlDataset('radius', value)
}

const setTheme = (value: 'light' | 'dark' | 'system') => {
  theme.value = value
}

onMounted(() => {
  if (typeof document === 'undefined')
    return

  const html = document.documentElement

  const initialPrimary =
    (html.dataset.primary as PrimaryColor | undefined) ||
    (appConfig.ui?.colors as any)?.primary ||
    'cyan'

  const initialNeutral =
    (html.dataset.neutral as NeutralColor | undefined) ||
    (appConfig.ui?.colors as any)?.neutral ||
    'slate'

  const initialRadius =
    (html.dataset.radius as RadiusValue | undefined) ||
    '0.375'

  setPrimary(initialPrimary)
  setNeutral(initialNeutral)
  setRadius(initialRadius)
})
</script>
