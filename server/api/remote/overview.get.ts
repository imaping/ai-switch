export default defineEventHandler(async () => {
  return { environments: await listRemoteEnvironments() }
})
