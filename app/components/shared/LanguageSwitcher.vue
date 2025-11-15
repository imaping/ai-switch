<script setup lang="ts">
import { NButton, NDropdown } from 'naive-ui'

const { locale, locales, setLocale } = useI18n()

const availableLocales = computed(() => {
  return locales.value.map((loc: any) => ({
    label: loc.name,
    key: loc.code,
    props: {
      onClick: () => setLocale(loc.code)
    }
  }))
})

const currentLocale = computed(() => {
  const current = locales.value.find((loc: any) => loc.code === locale.value)
  return current ? (current as any).name : ''
})
</script>

<template>
  <NDropdown :options="availableLocales" trigger="click">
    <NButton quaternary size="small">
      <span>{{ currentLocale }}</span>
      <span class="i-heroicons-chevron-down-20-solid ml-1 inline-block h-4 w-4" />
    </NButton>
  </NDropdown>
</template>
