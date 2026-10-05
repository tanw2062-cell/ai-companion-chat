<template>
  <div class="min-h-dvh bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(244,114,182,0.28),transparent_55%),radial-gradient(800px_420px_at_100%_0%,rgba(167,139,250,0.22),transparent_50%)] bg-night-950 text-rose-50">
    <header class="border-b border-pink-400/20 bg-night-900/80 backdrop-blur-xl">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <NuxtLink to="/" class="gradient-text text-lg font-semibold">星语陪伴</NuxtLink>
        <AuthBar />
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-8">
      <slot />
    </main>
  </div>
</template>
