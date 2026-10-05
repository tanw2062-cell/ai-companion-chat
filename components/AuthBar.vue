<script setup lang="ts">
const { data, refresh } = await useFetch('/api/auth/me')
const user = computed(() => data.value?.user || null)
const logout = async () => {
  await $fetch('/api/auth/logout', { method: 'POST' })
  await refresh()
}
</script>

<template>
  <div class="flex items-center gap-2">
    <template v-if="user">
      <img
        v-if="user.avatar"
        :src="user.avatar"
        :alt="user.name || user.email"
        class="h-8 w-8 rounded-full border border-pink-300/40"
      >
      <p class="max-w-[9rem] truncate text-xs text-rose-100/80">{{ user.name || user.email }}</p>
      <button type="button" class="text-xs text-rose-200/70" @click="logout">退出</button>
    </template>
    <a
      v-else
      href="/api/auth/google"
      class="rounded-full bg-fuchsia-500 px-3 py-1 text-xs font-medium text-white"
    >
      Google 登录
    </a>
  </div>
</template>
