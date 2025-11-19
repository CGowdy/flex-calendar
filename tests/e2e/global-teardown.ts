async function globalTeardown() {
  console.log('[E2E Global Teardown] Shutting down...')

  const apiServer = (global as any).__E2E_API_SERVER__ as
    | { close: () => Promise<void> }
    | undefined
  const memoryServer = (global as any).__E2E_MEMORY_SERVER__ as
    | { stop: () => Promise<void> }
    | undefined

  if (apiServer) {
    console.log('[E2E Global Teardown] Closing API server...')
    await apiServer.close()
  }

  if (memoryServer) {
    console.log('[E2E Global Teardown] Stopping MongoDB...')
    await memoryServer.stop()
  }

  console.log('[E2E Global Teardown] Complete')
}

export default globalTeardown

