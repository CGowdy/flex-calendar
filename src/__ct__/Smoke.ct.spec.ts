import { test, expect } from '@playwright/experimental-ct-vue'
import { defineComponent, ref } from 'vue'

const Counter = defineComponent({
  name: 'Counter',
  setup() {
    const n = ref(0)
    return { n, inc: () => (n.value += 1) }
  },
  template: `<button aria-label="count" @click="inc">count: {{ n }}</button>`,
})

test('smoke: mount simple component and interact', async ({ mount }) => {
  const component = await mount(Counter)
  await expect(component.getByRole('button', { name: /count/i })).toBeVisible()
  await component.getByRole('button', { name: /count/i }).click()
  await expect(component.getByText('count: 1')).toBeVisible()
})


