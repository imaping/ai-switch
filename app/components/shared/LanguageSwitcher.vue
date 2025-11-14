<script setup lang="ts">

const { locale, locales, setLocale } = useI18n()

const availableLocales = computed(() => {
  return locales.value.map((loc: any) => ({
    label: loc.name,
    value: loc.code,
    onSelect: () => setLocale(loc.code)
  }))
})

const currentLocale = computed(() => {
  const current = locales.value.find((loc: any) => loc.code === locale.value)
  return current ? (current as any).name : ''
})
</script>

<template>
  <UDropdownMenu :items="[availableLocales]">
    <UButton
      color="neutral"
      variant="ghost"
      :label="currentLocale"
      trailing-icon="i-heroicons-chevron-down-20-solid"
    />
  </UDropdownMenu>
</template>
