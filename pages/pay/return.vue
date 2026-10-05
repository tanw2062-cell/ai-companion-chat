<script setup lang="ts">
useHead({ title: '支付完成 — 星语陪伴' })
</script>

<template>
  <div class="mx-auto max-w-lg rounded-3xl border border-pink-400/30 bg-night-900/80 p-8 text-center">
    <h1 class="text-2xl font-semibold">正在确认会员</h1>
    <p class="mt-3 text-sm text-rose-100/70">
      若支付成功，ZPAY 会异步通知开通 30 天高级会员。请稍候刷新首页，或重新登录查看畅聊状态。
    </p>
    <NuxtLink to="/" class="mt-6 inline-flex rounded-full bg-fuchsia-500 px-5 py-2 text-sm">回到对话</NuxtLink>
  </div>
</template>
