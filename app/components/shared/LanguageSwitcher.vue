<script setup lang="ts">
import { NButton, NDropdown,NIcon } from 'naive-ui'
import { Language } from '@vicons/ionicons5'

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
      <template #icon>
        <n-icon><Language /></n-icon>
      </template>
    </NButton>
  </NDropdown>
</template>
