<script setup lang="ts">
useHead({ title: '星语陪伴 — AI 情感陪伴' })

type Companion = {
  id: string
  name: string
  tag: string
  blurb: string
}

const companions: Companion[] = [
  { id: 'momo', name: '小桃', tag: '傲娇青梅竹马', blurb: '总是别扭，其实超在乎你。' },
  { id: 'wan', name: '晚晚', tag: '温柔大姐姐', blurb: '把灯调暗，听你把今天说完。' },
  { id: 'kei', name: '阿纪', tag: '毒舌游戏搭子', blurb: '嘴上不饶人，排位却肯带你。' },
  { id: 'yuki', name: '星野', tag: '软萌夜谈对象', blurb: '熬夜窗边，想听你的心事。' }
]

type Turn = { role: 'user' | 'assistant', content: string }

const { data: me, refresh: refreshMe } = await useFetch('/api/auth/me')
const { data: quota, refresh: refreshQuota } = await useFetch('/api/chat/quota')
const user = computed(() => me.value?.user || null)
const activeId = ref(companions[0].id)
const chats = ref<Record<string, Turn[]>>({})
const draft = ref('')
const streaming = ref(false)
const payBusy = ref(false)
const notice = ref('')

const thread = computed(() => chats.value[activeId.value] || [])
const remainingText = computed(() => {
  if (quota.value?.premium) {
    return '高级会员 · 无限畅聊'
  }
  const left = quota.value?.remaining ?? 20
  return `今日剩余 ${left} / 20 句`
})

const buy = async () => {
  notice.value = ''
  if (!user.value) {
    window.location.assign('/api/auth/google')
    return
  }
  payBusy.value = true
  try {
    const res = await $fetch<{ url: string }>('/api/pay/submit', { method: 'POST' })
    window.location.href = res.url
  } catch (error: any) {
    notice.value = error?.data?.statusMessage || error?.message || '发起支付失败，请检查 ZPAY 商户配置'
    payBusy.value = false
  }
}

const send = async () => {
  const text = draft.value.trim()
  if (!text || streaming.value) {
    return
  }
  notice.value = ''
  draft.value = ''
  const history = [...(chats.value[activeId.value] || []), { role: 'user' as const, content: text }]
  chats.value = { ...chats.value, [activeId.value]: [...history, { role: 'assistant', content: '' }] }
  streaming.value = true
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companionId: activeId.value, messages: history })
    })
    if (!res.ok || !res.body) {
      const errText = await res.text()
      throw new Error(errText.slice(0, 180) || '对话失败')
    }
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let assistant = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      buffer += decoder.decode(value, { stream: true })
      const chunks = buffer.split('\n')
      buffer = chunks.pop() || ''
      for (const line of chunks) {
        const trimmed = line.trim()
        if (!trimmed.startsWith('data:')) {
          continue
        }
        const data = trimmed.slice(5).trim()
        if (data === '[DONE]') {
          continue
        }
        try {
          const json = JSON.parse(data)
          const piece = json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || ''
          if (piece) {
            assistant += piece
            const list = [...(chats.value[activeId.value] || [])]
            list[list.length - 1] = { role: 'assistant', content: assistant }
            chats.value = { ...chats.value, [activeId.value]: list }
          }
        } catch {
          // ignore keep-alive
        }
      }
    }
    await refreshQuota()
    await refreshMe()
  } catch (error: any) {
    notice.value = error?.message || '对话失败'
    const list = [...(chats.value[activeId.value] || [])]
    if (list.length && list[list.length - 1].role === 'assistant' && !list[list.length - 1].content) {
      list.pop()
      chats.value = { ...chats.value, [activeId.value]: list }
    }
  } finally {
    streaming.value = false
  }
}
</script>

<template>
  <div class="grid gap-8 lg:grid-cols-[280px_1fr]">
    <aside class="space-y-3">
      <p class="text-xs uppercase tracking-[0.25em] text-pink-300/80">选择伴侣</p>
      <button
        v-for="item in companions"
        :key="item.id"
        type="button"
        class="w-full rounded-2xl border p-4 text-left transition"
        :class="activeId === item.id ? 'border-fuchsia-400 bg-fuchsia-500/20 shadow-glow' : 'border-white/10 bg-white/5'"
        @click="activeId = item.id"
      >
        <p class="font-semibold">{{ item.name }}</p>
        <p class="mt-1 text-xs text-pink-200/80">{{ item.tag }}</p>
        <p class="mt-2 text-sm text-rose-100/70">{{ item.blurb }}</p>
      </button>
    </aside>

    <section class="flex min-h-[70vh] flex-col rounded-3xl border border-pink-400/20 bg-night-900/70 p-5">
      <div class="mb-4 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-3">
        <p class="text-sm font-medium">升级高级无限畅聊会员 → ￥9.90 / 月</p>
        <p class="mt-1 text-xs text-rose-100/70">{{ remainingText }} · 免费用户每天限聊 20 句</p>
        <button
          type="button"
          class="mt-3 rounded-full bg-gradient-to-r from-pink-400 to-fuchsia-500 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          :disabled="payBusy"
          @click="buy"
        >
          ￥9.90 购买会员
        </button>
      </div>

      <div class="flex-1 space-y-3 overflow-y-auto pr-1">
        <p v-if="!thread.length" class="text-sm text-rose-100/60">选一个她，把今天的心事说出来。</p>
        <div
          v-for="(msg, idx) in thread"
          :key="idx"
          class="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6"
          :class="msg.role === 'user' ? 'ml-auto bg-fuchsia-500/30' : 'bg-white/10'"
        >
          {{ msg.content || (streaming && idx === thread.length - 1 ? '…' : '') }}
        </div>
      </div>

      <p v-if="notice" class="mt-3 text-xs text-rose-300">{{ notice }}</p>
      <form class="mt-4 flex gap-2" @submit.prevent="send">
        <input
          v-model="draft"
          class="flex-1 rounded-full border border-white/15 bg-black/20 px-4 py-3 text-sm outline-none"
          placeholder="对她说一句…"
          :disabled="streaming"
        >
        <button
          type="submit"
          class="rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-medium disabled:opacity-50"
          :disabled="streaming"
        >
          发送
        </button>
      </form>
    </section>
  </div>
</template>
